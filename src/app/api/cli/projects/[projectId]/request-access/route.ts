import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  // 1. Authenticate CLI token
  const result = await validateCliToken(request);
  if ("status" in result) return result;

  // Service tokens cannot request access - they should already have it
  if (result.type === "service") {
    return NextResponse.json(
      { error: "Service tokens cannot submit access requests." },
      { status: 403 },
    );
  }

  const { projectId } = await params;
  const userId = result.userId;
  const supabase = createAdminClient();

  // 2. Ensure the project exists
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // 3. Ensure they don't already have access (no double-requesting)
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (existingMember || project.user_id === userId) {
    return NextResponse.json(
      { error: "You already have access to this project." },
      { status: 409 },
    );
  }

  // 4. Insert access request (idempotent - ignore unique conflicts)
  const { error: insertError } = await supabase
    .from("access_requests")
    .insert({ project_id: projectId, user_id: userId, status: "pending" });

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 5. Fetch the access request ID for notifications
  const { data: requestRecord } = await supabase
    .from("access_requests")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  // 6. Fire notifications (non-blocking)
  try {
    const [ownerData, requesterData] = await Promise.all([
      supabase.auth.admin.getUserById(project.user_id),
      supabase.auth.admin.getUserById(userId),
    ]);

    const ownerEmail = ownerData.data?.user?.email;
    const requesterEmail = requesterData.data?.user?.email || "A team member";

    if (requestRecord && ownerEmail) {
      const { sendAccessRequestEmail } = await import("@/lib/email");
      const { createAccessRequestNotification } =
        await import("@/lib/notifications");

      await Promise.all([
        sendAccessRequestEmail(
          ownerEmail,
          requesterEmail,
          project.name,
          requestRecord.id,
          project.user_id,
        ),
        createAccessRequestNotification(
          project.user_id,  // ownerId
          requesterEmail,   // requesterEmail
          project.name,     // projectName
          projectId,        // projectId
          userId,           // requesterId
          requestRecord.id, // requestId
        ),
      ]).catch((e) => console.error("[request-access] Notification error:", e));
    }
  } catch (e) {
    // Non-blocking - don't fail the request if notifications error
    console.error("[request-access] Failed to send notifications:", e);
  }

  return NextResponse.json({
    success: true,
    message: "Access request submitted. The project owner has been notified.",
  });
}
