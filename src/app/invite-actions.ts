"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { cacheDel, CacheKeys, invalidateUserSecretAccess } from "@/lib/cache";

export async function createAccessRequest(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = token; // Assuming simplified flow where link ID = Project ID for now to start.

  // Check if project exists
  // We use Admin Client here because RLS blocks non-members from seeing project details
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, user_id, name") // Added name here
    .eq("id", projectId)
    .single();

  if (!project) {
    return { error: "Project not found or invalid link." };
  }

  if (project.user_id === user.id) {
    return { error: "You are already the owner of this project." };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { error: "You are already a member of this project." };
  }

  // Create Request
  const { error } = await supabase.from("access_requests").insert({
    project_id: projectId,
    user_id: user.id,
    status: "pending",
  });
  // If conflict (unique constraint), just return success (idempotent for user)

  if (error) {
    if (error.code === "23505") {
      // Unique violation
      return { success: true, message: "Request already pending." };
    }
    return { error: error.message };
  }

  // Notify Owner via email and in-app notification
  try {
    // Get owner email
    const { data: owner } = await admin.auth.admin.getUserById(project.user_id);

    // Get requester email
    const { data: requester } = await admin.auth.admin.getUserById(user.id);

    if (owner?.user?.email && requester?.user?.email) {
      // We need to get the requestId.
      // If it was already pending, we might not have the ID from the insert.
      // But if it's new, we get it from data.
      const { data: requestData } = await supabase
        .from("access_requests")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      if (requestData) {
        // Send email notification
        const { sendAccessRequestEmail } = await import("@/lib/email");
        await sendAccessRequestEmail(
          owner.user.email,
          requester.user.email,
          project.name,
          requestData.id,
        );

        // Create in-app notification
        const { createAccessRequestNotification } =
          await import("@/lib/notifications");
        await createAccessRequestNotification(
          project.user_id,
          requester.user.email,
          project.name,
          projectId,
          user.id,
          requestData.id,
        );
      }
    }
  } catch (emailError) {
    // Don't fail the request if email/notification fails
    console.error("Failed to send access request notification:", emailError);
  }

  return { success: true };
}

export async function approveRequest(
  requestId: string,
  role: "viewer" | "editor",
  notifyUser: boolean = false,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Use Admin client for verification and modifications to bypass RLS issues during approval
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Fetch request details
  const { data: request, error: requestError } = await admin
    .from("access_requests")
    .select("*, projects!inner(user_id, name)")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    return { error: "Request not found." };
  }

  // Verify User is Owner of the Project
  const projectOwner = (request.projects as unknown as { user_id: string })
    .user_id;
  if (projectOwner !== user.id) {
    return { error: "Unauthorized." };
  }

  // Check if user is already a member
  const { data: existingMember } = await admin
    .from("project_members")
    .select("id")
    .eq("project_id", request.project_id!)
    .eq("user_id", request.user_id)
    .single();

  if (existingMember) {
    // Delete the request since they are already a member
    await admin.from("access_requests").delete().eq("id", requestId);
    return { success: true };
  }

  // 1. Add to Project Members (Use Admin for reliability)
  const { error: memberError } = await admin.from("project_members").insert({
    project_id: request.project_id!,
    user_id: request.user_id,
    role: role,
    added_by: user.id,
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // 1.5. Clean up any existing secret_shares for this user in this project
  // Since they now have full project access, individual secret shares are redundant
  const { data: projectSecrets } = await admin
    .from("secrets")
    .select("id")
    .eq("project_id", request.project_id!);

  if (projectSecrets && projectSecrets.length > 0) {
    const secretIds = projectSecrets.map((s) => s.id);
    const { error: cleanupError } = await admin
      .from("secret_shares")
      .delete()
      .eq("user_id", request.user_id)
      .in("secret_id", secretIds);

    if (cleanupError) {
      // Don't fail the request for this, just log it
    }
  }

  // 2. Delete Request (Use Admin to ensure it's removed)
  const { error: deleteError } = await admin
    .from("access_requests")
    .delete()
    .eq("id", requestId);
  if (deleteError) {
    // Warning logged
  }

  // 3. Invalidate caches for the new member
  await cacheDel(CacheKeys.userProjects(request.user_id));
  await cacheDel(
    CacheKeys.userProjectRole(request.user_id, request.project_id!),
  );
  await cacheDel(CacheKeys.projectMembers(request.project_id!));

  // 4. Notify User via email and in-app notification
  if (notifyUser) {
    const { sendAccessGrantedEmail } = await import("@/lib/email");
    // We need requester email.
    // Supabase join `auth_users` might return it if we have access to auth schema (rarely enabled by default for users)
    // Usually we can't select from `auth.users` directly via client unless view exists.
    // We might need to use `supabaseAdmin` to fetch the email OR rely on the ID.

    // Use Admin client for email lookup
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();
    const { data: requester } = await adminSupabase.auth.admin.getUserById(
      request.user_id,
    );

    if (requester && requester.user && requester.user.email) {
      const projectName = (request.projects as unknown as { name: string })
        .name;

      // Send email
      await sendAccessGrantedEmail(requester.user.email, projectName);

      // Create in-app notification
      const { createAccessGrantedNotification } =
        await import("@/lib/notifications");
      await createAccessGrantedNotification(
        request.user_id,
        projectName,
        request.project_id!,
        role,
      );
    }
  }

  revalidatePath("/dashboard"); // Refresh owner dashboard
  revalidatePath("/project/[slug]", "page"); // Refresh project page
  return { success: true };
}

export async function rejectRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Use Admin client
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Fetch request to verify ownership
  const { data: request, error: fetchError } = await admin
    .from("access_requests")
    .select("projects!inner(user_id, name)")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { error: "Request not found." };
  }

  const projectOwner = (request.projects as unknown as { user_id: string })
    .user_id;
  if (projectOwner !== user.id) {
    return { error: "Unauthorized." };
  }

  // Get project details and requester info for notification
  const { data: fullRequest } = await admin
    .from("access_requests")
    .select("user_id, project_id, projects(name)")
    .eq("id", requestId)
    .single();

  // Hard Delete
  const { error: deleteError } = await admin
    .from("access_requests")
    .delete()
    .eq("id", requestId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  // Notify requester that their request was denied
  if (fullRequest) {
    try {
      const { createAccessDeniedNotification } =
        await import("@/lib/notifications");
      const projectName =
        (fullRequest.projects as unknown as { name: string })?.name ||
        "Unknown Project";
      await createAccessDeniedNotification(
        fullRequest.user_id,
        projectName,
        fullRequest.project_id,
      );
    } catch (error) {
      console.error("Failed to send access denied notification:", error);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeMember(projectId: string, memberUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify Owner
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, user.id);

  if (role !== "owner") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);

  if (error) return { error: error.message };

  // Invalidate caches for the removed member
  await cacheDel(CacheKeys.userProjects(memberUserId));
  await cacheDel(CacheKeys.userProjectRole(memberUserId, projectId));
  await cacheDel(CacheKeys.projectMembers(projectId));
  // Invalidate all secret access caches for this user in this project
  await invalidateUserSecretAccess(memberUserId);

  revalidatePath("/project/[slug]", "page");
  return { success: true };
}

export async function updateMemberRole(
  projectId: string,
  memberUserId: string,
  newRole: "viewer" | "editor",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify Owner
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, user.id);

  if (role !== "owner") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("project_members")
    .update({ role: newRole })
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);

  if (error) return { error: error.message };

  // Invalidate caches for the member whose role changed
  await cacheDel(CacheKeys.userProjectRole(memberUserId, projectId));
  // Invalidate all secret access caches since permissions changed
  await invalidateUserSecretAccess(memberUserId);

  revalidatePath("/project/[slug]", "page");
  return { success: true };
}

export async function inviteUser(projectId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify Owner or Editor
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, user.id);

  if (role !== "owner" && role !== "editor") return { error: "Unauthorized" };

  // Check project name for email
  const { data: project } = await supabase
    .from("projects")
    .select("name, user_id")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found" };

  // Check if the email belongs to a user who is already a member
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers();
  const invitedUser = users.users.find((u) => u.email === email);

  if (invitedUser) {
    // Check if it's the project owner
    if (invitedUser.id === project.user_id) {
      return { error: "Cannot invite the project owner." };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", invitedUser.id)
      .single();

    if (existingMember) {
      return { error: "User is already a member of this project." };
    }
  }

  // Send Email
  const { sendInviteEmail } = await import("@/lib/email");
  await sendInviteEmail(email, project.name, projectId);

  return { success: true };
}
