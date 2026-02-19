import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { decrypt, encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { PushSecretsSchema } from "@/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result; // Return the error response
  }
  const userId = result;

  const { projectId } = await params;

  // 1. Determine Access Level
  // For CLI secret access, we need to distinguish between:
  // - Full project access (owner/member) -> all secrets
  // - Granular access (secret shares only) -> only shared secrets

  const supabase = createAdminClient();

  // Check if user has full project access (owner or member)
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  let hasFullProjectAccess = false;
  if (project && project.user_id === userId) {
    hasFullProjectAccess = true; // Owner
  } else {
    // Check if member
    const { data: member } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();

    if (member) {
      hasFullProjectAccess = true; // Member
    }
  }

  let targetSecrets = [];

  if (hasFullProjectAccess) {
    // Has Project-Level Access (Owner/Member)
    // Fetch ALL secrets for project
    const { data: secrets, error } = await supabase
      .from("secrets")
      .select("key, value")
      .eq("project_id", projectId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    targetSecrets = secrets || [];
  } else {
    // Check for Granular Secret Shares
    // Fetch only the secrets specifically shared with this user
    const { data: sharesFiltered } = await supabase
      .from("secret_shares")
      .select("secret_id, secrets!inner(key, value, project_id)")
      .eq("user_id", userId)
      .eq("secrets.project_id", projectId);

    if (sharesFiltered && sharesFiltered.length > 0) {
      // Handle Supabase join returning array or object
      targetSecrets = sharesFiltered.map((s) => {
        const secret = Array.isArray(s.secrets) ? s.secrets[0] : s.secrets;
        return {
          key: secret.key,
          value: secret.value,
        };
      });
    } else {
      // No access
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }
  }

  // Decrypt secrets
  const decryptedSecrets = await Promise.all(
    targetSecrets.map(async (s) => {
      try {
        const cleanValue = await decrypt(s.value);
        return { key: s.key, value: cleanValue };
      } catch (e) {
        console.error(`Failed to decrypt secret ${s.key}`, e);
        return { key: s.key, value: "<<DECRYPTION_FAILED>>" };
      }
    }),
  );

  // Notification for Pull
  // Retrieve project name for notification
  const { data: projectData } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const projectName = projectData?.name || "Project";

  // We use a fire-and-forget approach for the notification to not block the response
  supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: "secrets_pulled",
      title: "Secrets Pulled via CLI",
      message: `Environment variables pulled from "${projectName}"`,
      icon: "Download",
      variant: "info",
      metadata: {
        projectId,
        projectName,
        secretCount: decryptedSecrets.length,
        source: "cli",
      },
      action_url: `/project/${projectId}`,
      action_type: "view_project",
    })
    .then(({ error }) => {
      if (error) console.error("Failed to create pull notification:", error);
    });

  return NextResponse.json({ secrets: decryptedSecrets });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result; // Return the error response
  }
  const userId = result;

  const { projectId } = await params;
  const body = await request.json();
  const validation = PushSecretsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: `Validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const { secrets } = validation.data;

  const supabase = createAdminClient();

  // Verify Access: Owner OR Editor
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, userId);

  if (role !== "owner" && role !== "editor") {
    return NextResponse.json(
      { error: "Unauthorized: Read-only access" },
      { status: 403 },
    );
  }

  // Process Upsert
  // Fetch existing keys for IDs
  const { data: existingSecrets } = await supabase
    .from("secrets")
    .select("id, key")
    .eq("project_id", projectId);

  const keyMap = new Map((existingSecrets || []).map((s) => [s.key, s.id]));

  const upsertData = await Promise.all(
    secrets.map(async (s) => {
      const encryptedValue = await encrypt(s.value);
      const keyId = encryptedValue.split(":")[1];

      return {
        id: keyMap.has(s.key) ? keyMap.get(s.key) : uuidv4(),
        user_id: userId, // Current user is modifying it (or new owner if inserting, but user_id usually creator)
        // If updating, strictly `upsert` might require us to NOT change `user_id` if we want to preserve original creator?
        // But `user_id` in secrets is just for record.
        // Let's set it to current user for new, but for update `upsert` handles it?
        // If ID present, `upsert` updates provided fields.
        // If we provide `user_id`, access control policies usually ignore it for updates?
        // But we are ADMIN client here.
        // Let's keep `user_id` as the person who LAST "Created/Pushed" this version?
        // Or better, respect `last_updated_by`.

        // We should use `last_updated_by` for audit.
        // `user_id` is NOT NULL usually.

        project_id: projectId,
        key: s.key,
        value: encryptedValue,
        key_id: keyId,
        is_secret: true,
        last_updated_by: userId,
        last_updated_at: new Date().toISOString(),
      };
    }),
  );

  if (upsertData.length > 0) {
    const { error } = await supabase.from("secrets").upsert(upsertData);

    if (error) {
      console.error("Deploy error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notification for Push/Deploy
    const { data: projectData } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    const projectName = projectData?.name || "Project";

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "secrets_pushed",
      title: "Secrets Deployed via CLI",
      message: `Deployed ${upsertData.length} secrets to "${projectName}"`,
      icon: "Upload",
      variant: "success", // Deployment is an "action" so success is good
      metadata: {
        projectId,
        projectName,
        secretCount: upsertData.length,
        source: "cli",
      },
      action_url: `/project/${projectId}`,
      action_type: "view_project",
    });

    // Invalidate user's project list cache (update secret counts)
    const { cacheDel, CacheKeys } = await import("@/lib/cache");
    await cacheDel(CacheKeys.userProjects(userId));
    revalidatePath("/dashboard");
    revalidatePath(`/project/${projectId}`);
  }

  return NextResponse.json({ success: true, count: upsertData.length });
}
