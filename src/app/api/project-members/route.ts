import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectIdParamSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const validation = ProjectIdParamSchema.safeParse({ projectId });
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user has access to the project
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, projectId, user.id);

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fetch members using admin to bypass RLS
  const { data: membersData } = await admin
    .from("project_members")
    .select("id, user_id, role, created_at")
    .eq("project_id", projectId);

  // Fetch pending requests using admin
  const { data: requestsData } = await admin
    .from("access_requests")
    .select("id, user_id, project_id, status, created_at")
    .eq("project_id", projectId)
    .eq("status", "pending");

  // Fetch project owner
  const { data: project } = await admin
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch emails for members and requests
  const allUserIds = [
    ...(membersData || []).map((m) => m.user_id),
    ...(requestsData || []).map((r) => r.user_id),
    project.user_id, // owner
  ].filter((id, index, arr) => arr.indexOf(id) === index); // unique

  const emails: Record<string, string | undefined> = {};
  const avatars: Record<string, string | undefined> = {};
  await Promise.all(
    allUserIds.map(async (userId) => {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(userId);
        emails[userId] = userData?.user?.email || undefined;
        avatars[userId] =
          userData?.user?.user_metadata?.avatar_url ||
          userData?.user?.user_metadata?.picture ||
          undefined;
      } catch {
        emails[userId] = undefined;
        avatars[userId] = undefined;
      }
    }),
  );

  interface MemberWithUserData {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
    email: string | undefined;
    avatar: string | undefined;
  }

  interface RequestWithUserData {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    email: string | undefined;
    avatar: string | undefined;
  }

  // Build members list
  let allMembers: MemberWithUserData[] = [];
  if (membersData) {
    allMembers = membersData.map((member) => ({
      ...member,
      email: emails[member.user_id],
      avatar: avatars[member.user_id],
    }));
  }

  // Add owner if not already in members
  const hasOwner = allMembers.some((m) => m.user_id === project.user_id);
  if (!hasOwner) {
    allMembers.unshift({
      id: "owner",
      user_id: project.user_id,
      role: "owner",
      created_at: new Date().toISOString(),
      email: emails[project.user_id],
      avatar: avatars[project.user_id],
    });
  }

  // Build requests list
  let allRequests: RequestWithUserData[] = [];
  if (requestsData) {
    allRequests = requestsData.map((request) => ({
      ...request,
      email: emails[request.user_id],
      avatar: avatars[request.user_id],
    }));
  }

  return NextResponse.json({
    members: allMembers,
    requests: allRequests,
  });
}
