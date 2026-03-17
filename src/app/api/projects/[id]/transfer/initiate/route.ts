import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/system/audit-logger";
import { headers } from "next/headers";
import { transferRateLimit } from "@/lib/infra/ratelimit";

const ParamsSchema = z.object({ id: z.string().uuid("Invalid project ID") });

const InitiateTransferSchema = z
  .object({
    targetUserId: z.string().uuid("Invalid target user ID").optional(),
    targetEmail: z.string().email("Invalid target email").optional(),
    currentOwnerAction: z
      .enum(["demote_to_editor", "remove_from_project"])
      .optional(),
  })
  .refine((value) => value.targetUserId || value.targetEmail, {
    message: "Provide targetUserId or targetEmail",
    path: ["targetUserId"],
  });

async function resolveTargetUserId(
  admin: ReturnType<typeof createAdminClient>,
  payload: z.infer<typeof InitiateTransferSchema>,
): Promise<string | null> {
  if (payload.targetUserId) {
    return payload.targetUserId;
  }

  const targetEmail = payload.targetEmail?.trim().toLowerCase();
  if (!targetEmail) {
    return null;
  }

  const { data, error } = await admin.rpc("get_user_id_by_email", {
    email_input: targetEmail,
  });

  if (error) {
    console.error("[transfer:initiate] Failed to resolve user by email", error);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  let payload: z.infer<typeof InitiateTransferSchema>;
  try {
    payload = InitiateTransferSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid request body"
        : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = parsedParams.data.id;
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { success: rateLimitSuccess } = await transferRateLimit.limit(
    `transfer_initiate_${user.id || ip}`,
  );
  if (!rateLimitSuccess) {
    return NextResponse.json(
      { error: "Too many transfer requests. Please try again later." },
      { status: 429 },
    );
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can initiate ownership transfer." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, name, slug, user_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.user_id !== user.id) {
    return NextResponse.json(
      { error: "Only the current owner can initiate transfer." },
      { status: 403 },
    );
  }

  const targetUserId = await resolveTargetUserId(admin, payload);
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Target user not found. They must have an Envault account." },
      { status: 404 },
    );
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Ownership cannot be transferred to the current owner." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // Ensure stale requests are expired first so they do not block new transfers.
  await admin
    .from("project_transfer_requests")
    .update({ status: "expired", responded_at: now })
    .eq("project_id", projectId)
    .eq("status", "pending")
    .lte("expires_at", now);

  const { data: pendingRequest } = await admin
    .from("project_transfer_requests")
    .select("id, expires_at, target_user_id")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .maybeSingle();

  if (pendingRequest) {
    return NextResponse.json(
      {
        error:
          "A pending ownership transfer already exists for this project. Resolve it before creating a new one.",
        requestId: pendingRequest.id,
        expiresAt: pendingRequest.expires_at,
      },
      { status: 409 },
    );
  }

  const ownerAction = payload.currentOwnerAction || "demote_to_editor";

  const { data: createdRequest, error: insertError } = await admin
    .from("project_transfer_requests")
    .insert({
      project_id: projectId,
      current_owner_id: user.id,
      target_user_id: targetUserId,
      initiated_by: user.id,
      current_owner_action: ownerAction,
      status: "pending",
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, target_user_id, expires_at, current_owner_action")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A pending ownership transfer already exists for this project. Resolve it before creating a new one.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let targetEmail = "";
  let targetName = `user-${targetUserId.slice(0, 8)}`;
  let ownerName =
    user.user_metadata?.username ||
    user.user_metadata?.name ||
    user.email ||
    `user-${user.id.slice(0, 8)}`;
  try {
    const [
      { data: targetUserAuth },
      { data: ownerProfile },
      { data: targetProfile },
    ] = await Promise.all([
      admin.auth.admin.getUserById(targetUserId),
      admin.from("profiles").select("username").eq("id", user.id).maybeSingle(),
      admin
        .from("profiles")
        .select("username")
        .eq("id", targetUserId)
        .maybeSingle(),
    ]);

    targetEmail = targetUserAuth?.user?.email || "";
    targetName =
      targetProfile?.username ||
      targetUserAuth?.user?.user_metadata?.username ||
      targetUserAuth?.user?.user_metadata?.name ||
      targetEmail ||
      targetName;
    ownerName = ownerProfile?.username || ownerName;
  } catch (identityError) {
    console.warn(
      "[transfer:initiate] identity enrichment failed",
      identityError,
    );
  }

  await logAuditEvent({
    projectId,
    actorId: user.id,
    actorType: "user",
    action: "transfer.requested",
    targetResourceId: createdRequest.id,
    metadata: {
      event_code: "TRANSFER_REQUESTED",
      transfer_request_id: createdRequest.id,
      project_name: project.name,
      target_user_id: createdRequest.target_user_id,
      target_name: targetName,
      target_email: targetEmail,
      previous_owner_id: user.id,
      previous_owner_name: ownerName,
      previous_owner_email: user.email || "",
      current_owner_action: createdRequest.current_owner_action,
      expires_at: createdRequest.expires_at,
      beneficiary_user_id: createdRequest.target_user_id,
      beneficiary_name: targetName,
      beneficiary_email: targetEmail,
      granted_role: "owner (pending acceptance)",
    },
  });

  try {
    const [
      { createOwnershipTransferRequestedNotification },
      { sendOwnershipTransferRequestedEmail },
    ] = await Promise.all([
      import("@/lib/system/notifications"),
      import("@/lib/infra/email"),
    ]);

    await createOwnershipTransferRequestedNotification(
      targetUserId,
      project.name,
      projectId,
      String(ownerName),
      createdRequest.id,
    );

    if (targetEmail && targetEmail.trim()) {
      await sendOwnershipTransferRequestedEmail(
        targetEmail,
        project.name,
        String(ownerName),
        createdRequest.id,
        targetUserId,
      );
    }
  } catch (notifyError) {
    console.error(
      "[transfer:initiate] notification dispatch failed",
      notifyError,
    );
  }

  return NextResponse.json({
    success: true,
    request: {
      id: createdRequest.id,
      targetUserId: createdRequest.target_user_id,
      expiresAt: createdRequest.expires_at,
      currentOwnerAction: createdRequest.current_owner_action,
    },
  });
}
