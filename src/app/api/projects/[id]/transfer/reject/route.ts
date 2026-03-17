import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/system/audit-logger";
import { headers } from "next/headers";
import { transferRateLimit } from "@/lib/infra/ratelimit";

const ParamsSchema = z.object({ id: z.string().uuid("Invalid project ID") });
const RejectTransferSchema = z.object({
  transferRequestId: z.string().uuid("Invalid transfer request ID").optional(),
});

type ProjectTransferRequest = {
  id: string;
  current_owner_id: string;
  target_user_id: string;
  expires_at: string;
};

type ProfileRow = {
  username: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  let payload: z.infer<typeof RejectTransferSchema> = {};
  try {
    const raw = await request.json().catch(() => ({}));
    payload = RejectTransferSchema.parse(raw);
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
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { success: rateLimitSuccess } = await transferRateLimit.limit(
    `transfer_reject_${user.id || ip}`,
  );
  if (!rateLimitSuccess) {
    return NextResponse.json(
      { error: "Too many transfer actions. Please try again later." },
      { status: 429 },
    );
  }

  await admin
    .from("project_transfer_requests")
    .update({ status: "expired", responded_at: now })
    .eq("project_id", projectId)
    .eq("status", "pending")
    .lte("expires_at", now);

  let requestQuery = admin
    .from("project_transfer_requests")
    .select("id, current_owner_id, target_user_id, expires_at")
    .eq("project_id", projectId)
    .eq("target_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (payload.transferRequestId) {
    requestQuery = requestQuery.eq("id", payload.transferRequestId);
  }

  const { data: pendingRequests, error: requestError } = await requestQuery;

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  const transferRequest =
    (pendingRequests?.[0] as ProjectTransferRequest | undefined) || null;

  if (!transferRequest) {
    return NextResponse.json(
      { error: "No pending transfer request found for this project." },
      { status: 404 },
    );
  }

  if (transferRequest.expires_at <= now) {
    await admin
      .from("project_transfer_requests")
      .update({ status: "expired", responded_at: now })
      .eq("id", transferRequest.id);

    return NextResponse.json(
      { error: "Transfer request has expired." },
      { status: 410 },
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, name, slug")
    .eq("id", projectId)
    .maybeSingle();

  const { error: rejectError } = await admin
    .from("project_transfer_requests")
    .update({ status: "rejected", responded_at: now })
    .eq("id", transferRequest.id)
    .eq("status", "pending");

  if (rejectError) {
    return NextResponse.json({ error: rejectError.message }, { status: 500 });
  }

  let previousOwnerName = `user-${transferRequest.current_owner_id.slice(0, 8)}`;
  let previousOwnerEmail = "";
  let rejectedByName =
    user.user_metadata?.username ||
    user.user_metadata?.name ||
    user.email ||
    `user-${user.id.slice(0, 8)}`;
  let rejectedByEmail = user.email || "";

  try {
    const [
      { data: previousOwnerAuth },
      { data: previousOwnerProfile },
      { data: rejectedByAuth },
      { data: rejectedByProfile },
    ] = await Promise.all([
      admin.auth.admin.getUserById(transferRequest.current_owner_id),
      admin
        .from("profiles")
        .select("username")
        .eq("id", transferRequest.current_owner_id)
        .maybeSingle<ProfileRow>(),
      admin.auth.admin.getUserById(transferRequest.target_user_id),
      admin
        .from("profiles")
        .select("username")
        .eq("id", transferRequest.target_user_id)
        .maybeSingle<ProfileRow>(),
    ]);

    previousOwnerEmail = previousOwnerAuth?.user?.email || previousOwnerEmail;
    previousOwnerName =
      previousOwnerProfile?.username ||
      previousOwnerAuth?.user?.user_metadata?.username ||
      previousOwnerAuth?.user?.user_metadata?.name ||
      previousOwnerEmail ||
      previousOwnerName;

    rejectedByEmail = rejectedByAuth?.user?.email || rejectedByEmail;
    rejectedByName =
      rejectedByProfile?.username ||
      rejectedByAuth?.user?.user_metadata?.username ||
      rejectedByAuth?.user?.user_metadata?.name ||
      rejectedByEmail ||
      String(rejectedByName);
  } catch (identityError) {
    console.warn("[transfer:reject] identity enrichment failed", identityError);
  }

  await logAuditEvent({
    projectId,
    actorId: user.id,
    actorType: "user",
    action: "transfer.rejected",
    targetResourceId: transferRequest.id,
    metadata: {
      event_code: "TRANSFER_REJECTED",
      transfer_request_id: transferRequest.id,
      previous_owner_id: transferRequest.current_owner_id,
      previous_owner_name: previousOwnerName,
      previous_owner_email: previousOwnerEmail,
      rejected_by_user_id: transferRequest.target_user_id,
      rejected_by_name: rejectedByName,
      rejected_by_email: rejectedByEmail,
      requested_role: "owner",
      beneficiary_user_id: transferRequest.current_owner_id,
      beneficiary_name: previousOwnerName,
      beneficiary_email: previousOwnerEmail,
    },
  });

  try {
    const [
      { createOwnershipTransferRejectedNotification },
      { sendOwnershipTransferRejectedEmail },
    ] = await Promise.all([
      import("@/lib/system/notifications"),
      import("@/lib/infra/email"),
    ]);
    const projectName = project?.name || "Project";

    await createOwnershipTransferRejectedNotification(
      transferRequest.current_owner_id,
      projectName,
      projectId,
      String(rejectedByName),
    );

    if (previousOwnerEmail) {
      await sendOwnershipTransferRejectedEmail(
        previousOwnerEmail,
        projectName,
        String(rejectedByName),
        transferRequest.current_owner_id,
      );
    }
  } catch (notifyError) {
    console.error(
      "[transfer:reject] notification dispatch failed",
      notifyError,
    );
  }

  return NextResponse.json({ success: true });
}
