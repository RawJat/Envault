import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { decrypt, encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { PushSecretsSchema } from "@/lib/schemas";
import { getProjectRole } from "@/lib/permissions";
import { resolveProjectEnvironment } from "@/lib/cli-environments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if ('status' in result) {
    return result;
  }

  const { projectId } = await params;
  const requestedEnvironment = new URL(request.url).searchParams.get(
    "environment",
  );

  const supabase = createAdminClient();
  let resolvedEnvironment;
  try {
    resolvedEnvironment = await resolveProjectEnvironment(
      supabase,
      projectId,
      requestedEnvironment,
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Environment not found for the requested project",
      },
      { status: 404 },
    );
  }

  let targetSecrets: { id: string; key: string; value: string; _originalId?: string; _originalValue?: string }[] = [];
  let userId = '';

  if (result.type === 'service') {
    if (result.projectId !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // Fetch all secrets for this project and environment
    const { data: secrets, error } = await supabase
      .from("secrets")
      .select("id, key, value")
      .eq("project_id", projectId)
      .eq("environment_id", resolvedEnvironment.environment.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    targetSecrets = secrets || [];
  } else {
    userId = result.userId;

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

    if (hasFullProjectAccess) {
      // Has Project-Level Access (Owner/Member)
      // Fetch ALL secrets for project & environment
      const { data: secrets, error } = await supabase
        .from("secrets")
        .select("id, key, value")
        .eq("project_id", projectId)
        .eq("environment_id", resolvedEnvironment.environment.id);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      targetSecrets = secrets || [];
    } else {
      // Check for Granular Secret Shares
      // Fetch only the secrets specifically shared with this user
      const { data: sharesFiltered } = await supabase
        .from("secret_shares")
        .select(
          "secret_id, secrets!inner(id, key, value, project_id, environment_id)",
        )
        .eq("user_id", userId)
        .eq("secrets.project_id", projectId)
        .eq("secrets.environment_id", resolvedEnvironment.environment.id);

      if (sharesFiltered && sharesFiltered.length > 0) {
        // Handle Supabase join returning array or object
        targetSecrets = sharesFiltered.map((s) => {
          const secret = Array.isArray(s.secrets) ? s.secrets[0] : s.secrets;
          return {
            id: secret.id,
            key: secret.key,
            value: secret.value,
          };
        });
      } else {
        // No access
        return NextResponse.json(
          {
            error: `Forbidden: no access to '${resolvedEnvironment.environment.slug}' environment`,
          },
          { status: 403 },
        );
      }
    }
  }

  // Decrypt secrets
  const decryptedSecrets = await Promise.all(
    targetSecrets.map(async (s) => {
      try {
        const cleanValue = await decrypt(s.value);
        return {
          key: s.key,
          value: cleanValue,
          // Keep original for rotation check
          _originalId: s.id,
          _originalValue: s.value,
        };
      } catch (e) {
        console.error(`Failed to decrypt secret ${s.key}`, e);
        return { key: s.key, value: "<<DECRYPTION_FAILED>>" };
      }
    }),
  );

  // [READ-REPAIR] Trigger rotation for outdated secrets
  // We use the same logic as the UI.
  const { getActiveKeyId, reEncryptSecret } = await import("@/lib/encryption");

  // Fire-and-forget background process
  const performRotation = async () => {
    let activeKeyId = "";
    try {
      activeKeyId = await getActiveKeyId();
    } catch {
      return;
    } // No active key, skip

    const updates: { id: string; value: string; key_id: string }[] = [];

    await Promise.all(
      decryptedSecrets.map(async (s) => {
        if (!s._originalValue || !s._originalId) return;

        // specific check: is it legacy or old key?
        let needsRotation = false;
        if (!s._originalValue.startsWith("v1:")) {
          needsRotation = true;
        } else {
          const parts = s._originalValue.split(":");
          if (parts.length === 3 && parts[1] !== activeKeyId) {
            needsRotation = true;
          }
        }

        if (needsRotation) {
          try {
            const newValue = await reEncryptSecret(s._originalValue);
            const newKeyId = newValue.split(":")[1];
            updates.push({
              id: s._originalId,
              value: newValue,
              key_id: newKeyId,
            });
          } catch (e) {
            console.error(`CLI Read-Repair failed for ${s.key}`, e);
          }
        }
      }),
    );

    if (updates.length > 0) {
      const { error } = await supabase.from("secrets").upsert(updates);
      if (error) console.error("CLI Read-Repair Batch Update Error:", error);
      else console.log(`[CLI Read-Repair] Rotated ${updates.length} secrets`);
    }
  };

  await performRotation();

  // Clean up internal keys before returning
  const finalSecrets = decryptedSecrets.map((s) => ({
    key: s.key,
    value: s.value,
  }));

  // Notification for Pull
  const { data: projectData } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();
  const projectName = projectData?.name || "Project";

  let notifUserId = userId;
  if (!notifUserId && result.type === 'service') {
    const { data: pData } = await supabase.from('projects').select('user_id').eq('id', projectId).single();
    if (pData) notifUserId = pData.user_id;
  }

  const { createSecretsPulledNotification } =
    await import("@/lib/notifications");
  createSecretsPulledNotification(
    notifUserId,
    projectName,
    projectId,
    "CLI",
    decryptedSecrets.length,
  ).catch((e) => console.error("Failed to create pull notification:", e));

  // CLI email if user has it toggled ON
  try {
    if (notifUserId) {
      const { data: userData } = await supabase.auth.admin.getUserById(notifUserId);
      if (userData?.user?.email) {
        const { sendCliActivityEmail } = await import("@/lib/email");
        sendCliActivityEmail(
          userData.user.email,
          projectName,
          "pulled",
          decryptedSecrets.length,
          "CLI",
          projectId,
          notifUserId,
        ).catch((e) => console.error("Failed to send CLI pull email:", e));
      }
    }
  } catch (err) {
    console.warn("Non-blocking CLI pull email error:", err);
  }

  return NextResponse.json({
    secrets: finalSecrets,
    environment: resolvedEnvironment.environment.slug,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if ('status' in result) {
    return result;
  }

  const { projectId } = await params;
  const requestedEnvironment = new URL(request.url).searchParams.get(
    "environment",
  );
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
  let resolvedEnvironment;
  try {
    resolvedEnvironment = await resolveProjectEnvironment(
      supabase,
      projectId,
      requestedEnvironment,
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Environment not found for the requested project",
      },
      { status: 404 },
    );
  }

  let userId = '';

  if (result.type === 'service') {
    if (result.projectId !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { data: pData } = await supabase.from('projects').select('user_id').eq('id', projectId).single();
    if (pData) userId = pData.user_id;

  } else {
    userId = result.userId;
    // Verify Access: Owner OR Editor
    const role = await getProjectRole(supabase, projectId, userId);

    if (role !== "owner" && role !== "editor") {
      return NextResponse.json(
        { error: "Unauthorized: Read-only access" },
        { status: 403 },
      );
    }
  }

  // Process Upsert
  // Fetch existing keys for IDs and original creator (user_id)
  const { data: existingSecrets } = await supabase
    .from("secrets")
    .select("id, key, user_id")
    .eq("project_id", projectId)
    .eq("environment_id", resolvedEnvironment.environment.id);

  const keyMap = new Map(
    (existingSecrets || []).map((s) => [
      s.key,
      { id: s.id, user_id: s.user_id },
    ]),
  );

  const upsertData = await Promise.all(
    secrets.map(async (s) => {
      const encryptedValue = await encrypt(s.value);
      const keyId = encryptedValue.split(":")[1];
      const existing = keyMap.get(s.key);

      return {
        id: existing ? existing.id : uuidv4(),
        user_id: existing ? existing.user_id : userId, // Preserve original creator or assign to current deployer
        project_id: projectId,
        environment_id: resolvedEnvironment.environment.id,
        key: s.key,
        value: encryptedValue,
        key_id: keyId,
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

    // Notification for Push
    const { data: projectData } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    const projectName = projectData?.name || "Project";

    const { createSecretsPushedNotification } =
      await import("@/lib/notifications");
    createSecretsPushedNotification(
      userId,
      projectName,
      projectId,
      "CLI",
      upsertData.length,
    ).catch((e) => console.error("Failed to create push notification:", e));

    // CLI email if user has it toggled ON
    try {
      if (userId) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          const { sendCliActivityEmail } = await import("@/lib/email");
          sendCliActivityEmail(
            userData.user.email,
            projectName,
            "pushed",
            upsertData.length,
            "CLI",
            projectId,
            userId,
          ).catch((e) => console.error("Failed to send CLI push email:", e));
        }
      }
    } catch (err) {
      console.warn("Non-blocking CLI push email error:", err);
    }

    // Invalidate user's project list cache (update secret counts)
    const { cacheDel, CacheKeys } = await import("@/lib/cache");
    await cacheDel(CacheKeys.userProjects(userId));
    revalidatePath("/dashboard");
    revalidatePath(`/project/${projectId}`);
  }

  return NextResponse.json({
    success: true,
    count: upsertData.length,
    environment: resolvedEnvironment.environment.slug,
  });
}
