"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const next = (formData?.get("next") as string) || "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error(error);
    redirect("/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithGithub(formData?: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const next = (formData?.get("next") as string) || "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error(error);
    redirect("/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const next = formData.get("next") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (next && next.startsWith("/")) {
    redirect(next);
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccountAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  // 0. Clean up user memberships and shared access
  // We must clean these up explicitly because they might be on projects/secrets NOT owned by the user,
  // or the foreign keys might not be set to CASCADE for these specific relationships.

  // Access Requests (where user is requesting access)
  const { error: reqError } = await adminSupabase
    .from("access_requests")
    .delete()
    .eq("user_id", user.id);
  if (reqError) console.error("Error deleting access requests:", reqError);

  // Secret Shares (where user is a viewer)
  const { error: shareError } = await adminSupabase
    .from("secret_shares")
    .delete()
    .eq("user_id", user.id);
  if (shareError) console.error("Error deleting secret shares:", shareError);

  // Project Members (where user is a member)
  const { error: memberError } = await adminSupabase
    .from("project_members")
    .delete()
    .eq("user_id", user.id);
  if (memberError)
    console.error("Error deleting project memberships:", memberError);

  // Project Members (where user added someone else)
  // If we don't delete these, the 'added_by' foreign key constraint will fail.
  // Ideally we would transfer these to the owner, but deleting is acceptable for account deletion.
  const { error: addedByError } = await adminSupabase
    .from("project_members")
    .delete()
    .eq("added_by", user.id);
  if (addedByError)
    console.error("Error deleting members added by user:", addedByError);

  // Secrets (where user updated them but doesn't own them)
  // We must NULL out the reference, otherwise we can't delete the user.
  // We do NOT want to delete the secret itself as it belongs to someone else.
  const { error: updatedByError } = await adminSupabase
    .from("secrets")
    .update({ last_updated_by: null })
    .eq("last_updated_by", user.id);

  if (updatedByError)
    console.error("Error nullifying updated_by:", updatedByError);

  // 1. Delete user's secrets
  const { error: secretsError } = await adminSupabase
    .from("secrets")
    .delete()
    .eq("user_id", user.id);

  if (secretsError) {
    console.error("Error deleting user secrets:", secretsError);
    return { error: "Failed to clean up user data (secrets)" };
  }

  // 2. Delete user's projects
  const { error: projectsError } = await adminSupabase
    .from("projects")
    .delete()
    .eq("user_id", user.id);

  if (projectsError) {
    console.error("Error deleting user projects:", projectsError);
    return { error: "Failed to clean up user data (projects)" };
  }

  // 3. Delete the user account
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Error deleting user:", error);
    return { error: error.message };
  }

  await supabase.auth.signOut();
  redirect("/?accountDeleted=true");
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getPersonalAccessTokens() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("personal_access_tokens")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { tokens: data };
}

export async function revokePersonalAccessToken(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("personal_access_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // Ensure ownership

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
