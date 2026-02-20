import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ProjectDetailView from "@/components/editor/project-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch the project first (no joins to avoid RLS recursion)
  const { data: project, error: _projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (_projectError || !project) {
    redirect("/dashboard");
  }

  // Verify user has access to this project
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, id, user.id);

  if (!role) {
    // User has no access to this project
    redirect("/dashboard");
  }

  // Fetch secrets separately
  const { data: secrets, error: secretsError } = await supabase
    .from("secrets")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (secretsError) {
    console.error(`[ProjectPage] Error fetching secrets:`, secretsError);
  }

  // Fetch shared secrets for this user
  const { data: sharedSecrets, error: sharedSecretsError } = await supabase
    .from("secret_shares")
    .select(
      `
            id,
            created_at,
            secrets (
                *
            )
        `,
    )
    .eq("user_id", user.id);

  if (sharedSecretsError) {
    console.error(
      `[ProjectPage] Error fetching shared secrets:`,
      sharedSecretsError,
    );
  }

  // Filter shared secrets for this project
  const filteredSharedSecrets =
    sharedSecrets?.filter(
      (share) => (share.secrets as any).project_id === id,
    ) || [];

  // For owners/editors, we need to check which secrets are actually shared with others
  let sharedSecretIds = new Set<string>();
  if (role === "owner" || role === "editor") {
    // Fetch all shares for secrets in this project to see which ones are shared
    const { data: allShares } = await supabase
      .from("secret_shares")
      .select("secret_id")
      .in("secret_id", secrets?.map((s) => s.id) || []);

    sharedSecretIds = new Set(allShares?.map((s) => s.secret_id) || []);
  }

  // Combine secrets and shared secrets, deduplicating by id
  const secretsMap = new Map();

  // Add owned secrets
  secrets?.forEach((secret) => {
    secretsMap.set(secret.id, {
      ...secret,
      isShared: sharedSecretIds.has(secret.id),
    });
  });

  // Add shared secrets (for viewers), marking as not shared from their perspective
  filteredSharedSecrets?.forEach((share) => {
    const secret = share.secrets as any;
    if (!secretsMap.has(secret.id)) {
      secretsMap.set(secret.id, {
        ...secret,
        isShared: false, // Viewers don't see "shared" indicator
        sharedAt: share.created_at,
      });
    }
  });

  const allSecrets = Array.from(secretsMap.values());

  // Transform to match local store format and decrypt values
  const { decrypt } = await import("@/lib/encryption");

  // Helper function to check if a value looks like encrypted data (base64)
  const isEncrypted = (value: string): boolean => {
    // Encrypted values are base64 strings with a minimum length
    // Base64 pattern: only contains A-Z, a-z, 0-9, +, /, and = for padding
    if (value.startsWith("v1:")) return true;
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    return value.length > 40 && base64Pattern.test(value);
  };

  // Fetch user details for creators and updaters
  const userIds = new Set<string>();
  allSecrets?.forEach((s) => {
    if (s.user_id) userIds.add(s.user_id);
    if (s.last_updated_by) userIds.add(s.last_updated_by);
  });

  const userMap = new Map<
    string,
    { email: string; id: string; avatar?: string }
  >();
  if (userIds.size > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createAdminClient();
    await Promise.all(
      Array.from(userIds).map(async (uid) => {
        const { data } = await adminSupabase.auth.admin.getUserById(uid);
        if (data?.user) {
          userMap.set(uid, {
            id: uid,
            email: data.user.email || "",
            avatar:
              data.user.user_metadata?.avatar_url ||
              data.user.user_metadata?.picture ||
              undefined,
          });
        }
      }),
    );
  }

  const transformedProject = {
    id: project.id,
    name: project.name,
    user_id: project.user_id,
    createdAt: project.created_at,
    role: role,
    variables: await Promise.all(
      (allSecrets || []).map(async (secret) => {
        let decryptedValue = secret.value;

        // Only try to decrypt if it looks like encrypted data
        if (isEncrypted(secret.value)) {
          try {
            decryptedValue = await decrypt(secret.value);

            // [READ-REPAIR] Check if rotation is needed
            // We do this asynchronously to avoid blocking the UI,
            // but we must ensure we don't cause race conditions if multiple users access.
            // Ideally this should be a fire-and-forget server action, but here we can just check.

            // Optimization: We need to know the Active Key ID.
            // We can fetch it once per page load.
          } catch (error) {
            // If decryption fails, log error and keep original value
            console.error(
              `Failed to decrypt value for key: ${secret.key}`,
              error,
            );
          }
        }

        const creator = secret.user_id
          ? userMap.get(secret.user_id)
          : undefined;
        const updater = secret.last_updated_by
          ? userMap.get(secret.last_updated_by)
          : undefined;

        return {
          id: secret.id,
          key: secret.key,
          value: decryptedValue,
          isSecret: secret.is_secret,
          lastUpdatedBy: secret.last_updated_by,
          lastUpdatedAt: secret.last_updated_at,
          isShared: secret.isShared || false,
          sharedAt: secret.sharedAt,
          userInfo: {
            creator,
            updater,
          },
        };
      }),
    ),
    secretCount: allSecrets?.length || 0,
  };

  // [READ-REPAIR] Post-Process: Trigger rotation for outdated secrets
  const { getActiveKeyId, reEncryptSecret } = await import("@/lib/encryption");

  // We fetch the active key ID once
  let activeKeyId = "";
  try {
    activeKeyId = await getActiveKeyId();
  } catch (e) {
    // If no active key (e.g. not initialized), we can't rotate. Ignore.
  }

  if (activeKeyId) {
    // Identify secrets that need rotation
    const outdatedSecrets = (allSecrets || []).filter((s) => {
      if (!s.value.startsWith("v1:")) return true; // Legacy (no version) -> needs rotation
      const parts = s.value.split(":");
      if (parts.length === 3) {
        const keyId = parts[1];
        return keyId !== activeKeyId;
      }
      return false;
    });

    if (outdatedSecrets.length > 0) {
      // Fire-and-Forget Rotation
      (async () => {
        try {
          // Process rotation sequentially or in parallel? Parallel is fine.
          const rotationPromises = outdatedSecrets.map(async (s) => {
            try {
              const newValue = await reEncryptSecret(s.value);
              const newKeyId = newValue.split(":")[1];

              // Use RPC to bypass RLS for rotation (if user has VIEW access)
              const { error } = await supabase.rpc("rotate_secret", {
                p_secret_id: s.id,
                p_new_value: newValue,
                p_new_key_id: newKeyId,
              });

              if (error) {
                console.error(`[Read-Repair] Failed to rotate ${s.id}`, error);
              } else {
                // Success
              }
            } catch (e) {
              console.error(`Failed to re-encrypt secret ${s.id}`, e);
            }
          });

          await Promise.all(rotationPromises);
          console.log(
            `[Read-Repair] Triggered rotation for ${outdatedSecrets.length} secrets`,
          );
        } catch (err) {
          console.error("[Read-Repair] Global error:", err);
        }
      })();
    }
  }

  return <ProjectDetailView project={transformedProject} />;
}
