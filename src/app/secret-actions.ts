"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cacheDel, CacheKeys } from "@/lib/cache";

export async function shareSecret(secretId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Resolve Project ID for the secret to check permission
  const { data: secret } = await supabase
    .from("secrets")
    .select("project_id, key, project:projects(name)")
    .eq("id", secretId)
    .single();

  if (!secret) return { error: "Secret not found" };

  // Extract project info with type assertion (Supabase joins return arrays)
  const project = (
    Array.isArray(secret.project) ? secret.project[0] : secret.project
  ) as { name: string };
  const projectId = secret.project_id;

  // 2. Check Permission (Owner or Editor of Project)
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, user.id);

  if (role !== "owner" && role !== "editor") {
    return { error: "Unauthorized to share secrets" };
  }

  // 3. Resolve Invite Email to User ID
  // We strictly need the user to exist to share with them granularly via ID?
  // Or we create a pending share?
  // The `secret_shares` table uses `user_id` FK. So user MUST exist.
  // We need to look up User ID by Email using Admin Client.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Admin listUsers is paginated, search by email is better?
  // `admin.auth.admin.listUsers` doesn't support filter by email directly in all versions,
  // but typically `users` table is not exposed.
  // If Supabase is standard, we assume we can't easily look up user ID by email unless we have `profiles`.
  // BUT we can use `inviteUserByEmail` which sends magic link? No, we want to just grant access if they exist.

  // We can try to use a function if it existed.
  // Without `profiles`, we have to rely on `admin.auth.admin.listUsers` or hope the email matches?
  // Actually, `admin.auth.admin.getUserByEmail(email)` is available? No.
  // `admin.auth.admin.listUsers({ page: 1, perPage: 1 })`... no email filter.

  // WORKAROUND: For this prototype, we might be stuck if we can't resolve email.
  // EXCEPT: If we implement `profiles` table that maps ID <-> Email (publicly or via RLS).
  // OR we ask user to enter User ID? (Bad UX).

  // Let's try `listUsers`? It might be slow.
  // Is there a `project_members` check? Maybe we can only share with people who are ALREADY members?
  // No, granular share usually means "Guest" access.

  // Let's Assume `profiles` table exists? No I didn't create it.
  // Okay, let's use a trick: `supabase.rpc('get_user_id_by_email', { email })`?
  // I haven't created that RPC.

  // Re-check Plan/Migration: Step 68. No profiles.
  // Checking `project_members`?

  // Let's stick to: "You can only granularly share with existing Project Members?"
  // NO, that defeats the purpose of "Single Secret Viewer".

  // Okay, I will try to use `admin.auth.admin.listUsers()`?? No that fetches all.
  // Wait, Supabase Admin API: `supabase.auth.admin.createUser({ email, ... })` returns existing if exists? NO.

  // Let's implement a quick helper using Admin that assumes we can search?
  // Actually `admin.rpc`?

  // I'll create an RPC function `get_user_by_email` in a new migration step?
  // OR I just accept that for this demo I might need to enter ID?
  // No, the UI asks for Email.

  // Let's try to assume the user `profiles` table exists from a previous setup?
  // I can check `list_tables`? No tool for that.

  // Let's write the code to use `admin.auth.admin.listUsers` but filtering?
  // Or just fetch all members of the ORG?
  // Envault seems to be "Personal" projects.

  // BEST APPROACH:
  // Create a new RPC function via SQL execution that allows looking up user ID by email (SECURITY RISK if public, but `security definer` usually okay if limited).
  // I will execute a SQL command to create this function now.

  // But first let's create the file assuming the RPC exists.

  const { data: userIdData, error: rpcError } = await admin.rpc(
    "get_user_id_by_email",
    { email_input: email },
  );

  const targetUserId = userIdData;

  if (rpcError || !targetUserId) {
    // Fallback: Check if we can find in project_members?
    // Maybe they are already a member?
    // We can't resolve email without that RPC or Profiles.
    return {
      error: "User not found. Please ensure the user has an Envault account.",
    };
  }

  // Check if the user is already a project member
  // If they are, they already have access to all secrets, so no need for individual shares
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", targetUserId)
    .single();

  if (existingMember) {
    return {
      error:
        "User is already a member of this project and has access to all secrets.",
    };
  }

  // Insert Share
  const { error: insertError } = await supabase.from("secret_shares").insert({
    secret_id: secretId,
    user_id: targetUserId,
    role: "viewer",
    // added_by? Schema didn't have it, but useful.
  });

  if (insertError) {
    if (insertError.code === "23505")
      return { error: "User already has access" }; // Unique constraint
    return { error: insertError.message };
  }

  // Invalidate secret access cache for the user who was granted access
  await cacheDel(CacheKeys.userSecretAccess(targetUserId, secretId));

  // Invalidate project list cache for the user who was granted access
  await cacheDel(CacheKeys.userProjects(targetUserId));

  // Invalidate project role cache for the shared project
  await cacheDel(CacheKeys.userProjectRole(targetUserId, projectId));

  // Notify
  const { sendAccessGrantedEmail } = await import("@/lib/email");
  await sendAccessGrantedEmail(email, `${project.name} (Single Variable)`);

  revalidatePath("/project/[slug]", "page");
  return { success: true };
}

export async function unshareSecret(secretId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Resolve Project ID
  const { data: secret } = await supabase
    .from("secrets")
    .select("project_id")
    .eq("id", secretId)
    .single();

  if (!secret) return { error: "Secret not found" };

  // 2. Check Permission
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, secret.project_id, user.id);

  if (role !== "owner" && role !== "editor") {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("secret_shares")
    .delete()
    .eq("secret_id", secretId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  // Invalidate secret access cache for the user who lost access
  await cacheDel(CacheKeys.userSecretAccess(userId, secretId));

  revalidatePath("/project/[slug]", "page");
  return { success: true };
}

export async function getSecretSharesWithEmails(secretId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if user has access to the secret's project
  const { data: secret } = await supabase
    .from("secrets")
    .select("project_id")
    .eq("id", secretId)
    .single();

  if (!secret) return { error: "Secret not found" };

  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, secret.project_id, user.id);

  if (!role) return { error: "Unauthorized" };

  // Fetch shares
  const { data: shares } = await supabase
    .from("secret_shares")
    .select("id, user_id, created_at")
    .eq("secret_id", secretId);

  if (!shares) return { shares: [] };

  // Get emails and avatars using admin client
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const sharesWithDetails = await Promise.all(
    shares.map(async (share) => {
      const { data: userData } = await admin.auth.admin.getUserById(
        share.user_id,
      );
      const email = userData?.user?.email || "";
      const username =
        userData?.user?.user_metadata?.username ||
        userData?.user?.user_metadata?.name ||
        undefined;
      const avatar =
        userData?.user?.user_metadata?.avatar_url ||
        userData?.user?.user_metadata?.picture ||
        undefined;

      return {
        ...share,
        email,
        username,
        avatar,
      };
    }),
  );

  return { shares: sharesWithDetails };
}
