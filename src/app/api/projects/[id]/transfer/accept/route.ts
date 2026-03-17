import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/system/audit-logger";
import {
  cacheDel,
  CacheKeys,
  invalidateProjectCaches,
  invalidateUserSecretAccess,
} from "@/lib/infra/cache";
import { headers } from "next/headers";
import { transferRateLimit } from "@/lib/infra/ratelimit";

const ParamsSchema = z.object({ id: z.string().uuid("Invalid project ID") });
const AcceptTransferSchema = z.object({
  transferRequestId: z.string().uuid("Invalid transfer request ID").optional(),
});

type ProjectTransferRequest = {
  id: string;
  project_id: string;
  current_owner_id: string;
  target_user_id: string;
  current_owner_action: "demote_to_editor" | "remove_from_project";
  expires_at: string;
};

type ExecuteTransferResult = {
  previous_owner_id: string;
  new_owner_id: string;
  owner_action: "demote_to_editor" | "remove_from_project";
  transferred_secret_count: number;
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

  let payload: z.infer<typeof AcceptTransferSchema> = {};
  try {
    const raw = await request.json().catch(() => ({}));
    payload = AcceptTransferSchema.parse(raw);
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
    `transfer_accept_${user.id || ip}`,
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
    .select(
      "id, project_id, current_owner_id, target_user_id, current_owner_action, expires_at",
    )
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

  const { data: transferResult, error: rpcError } = await admin.rpc(
    "execute_project_transfer",
    {
      p_transfer_request_id: transferRequest.id,
      p_project_id: projectId,
      p_actor_user_id: user.id,
    },
  );

  if (rpcError) {
    const message = rpcError.message || "Failed to accept transfer request.";
    const lowered = message.toLowerCase();

    if (lowered.includes("expired")) {
      return NextResponse.json(
        { error: "Transfer request has expired." },
        { status: 410 },
      );
    }
    if (lowered.includes("target_mismatch")) {
      return NextResponse.json(
        { error: "Only the intended recipient can accept this transfer." },
        { status: 403 },
      );
    }

    return NextResponse.json({ error: message }, { status: 409 });
  }

  const resultRow = Array.isArray(transferResult)
    ? (transferResult[0] as ExecuteTransferResult | undefined)
    : (transferResult as ExecuteTransferResult | null);

  if (!resultRow) {
    return NextResponse.json(
      { error: "Transfer completed but no result metadata was returned." },
      { status: 500 },
    );
  }

  let previousOwnerName = `user-${resultRow.previous_owner_id.slice(0, 8)}`;
  let previousOwnerEmail = "";
  let newOwnerName =
    user.user_metadata?.username ||
    user.user_metadata?.name ||
    user.email ||
    `user-${resultRow.new_owner_id.slice(0, 8)}`;
  let newOwnerEmail = user.email || "";

  try {
    const [
      { data: previousOwnerAuth },
      { data: previousOwnerProfile },
      { data: newOwnerAuth },
      { data: newOwnerProfile },
    ] = await Promise.all([
      admin.auth.admin.getUserById(resultRow.previous_owner_id),
      admin
        .from("profiles")
        .select("username")
        .eq("id", resultRow.previous_owner_id)
        .maybeSingle<ProfileRow>(),
      admin.auth.admin.getUserById(resultRow.new_owner_id),
      admin
        .from("profiles")
        .select("username")
        .eq("id", resultRow.new_owner_id)
        .maybeSingle<ProfileRow>(),
    ]);

    previousOwnerEmail = previousOwnerAuth?.user?.email || previousOwnerEmail;
    previousOwnerName =
      previousOwnerProfile?.username ||
      previousOwnerAuth?.user?.user_metadata?.username ||
      previousOwnerAuth?.user?.user_metadata?.name ||
      previousOwnerEmail ||
      previousOwnerName;

    newOwnerEmail = newOwnerAuth?.user?.email || newOwnerEmail;
    newOwnerName =
      newOwnerProfile?.username ||
      newOwnerAuth?.user?.user_metadata?.username ||
      newOwnerAuth?.user?.user_metadata?.name ||
      newOwnerEmail ||
      String(newOwnerName);
  } catch (identityError) {
    console.warn("[transfer:accept] identity enrichment failed", identityError);
  }

  await logAuditEvent({
    projectId,
    actorId: user.id,
    actorType: "user",
    action: "transfer.accepted",
    targetResourceId: transferRequest.id,
    metadata: {
      event_code: "TRANSFER_ACCEPTED",
      transfer_request_id: transferRequest.id,
      previous_owner_id: resultRow.previous_owner_id,
      previous_owner_name: previousOwnerName,
      previous_owner_email: previousOwnerEmail,
      new_owner_id: resultRow.new_owner_id,
      new_owner_name: newOwnerName,
      new_owner_email: newOwnerEmail,
      current_owner_action: resultRow.owner_action,
      previous_owner_disposition: resultRow.owner_action,
      granted_role: "owner",
      granted_access: "project.owner",
      transferred_secret_count: resultRow.transferred_secret_count,
      beneficiary_user_id: resultRow.new_owner_id,
      beneficiary_name: newOwnerName,
      beneficiary_email: newOwnerEmail,
    },
  });

  try {
    const [
      { createOwnershipTransferAcceptedNotification },
      { sendOwnershipTransferAcceptedEmail },
    ] = await Promise.all([
      import("@/lib/system/notifications"),
      import("@/lib/infra/email"),
    ]);
    const projectName = project?.name || "Project";

    await createOwnershipTransferAcceptedNotification(
      resultRow.previous_owner_id,
      projectName,
      projectId,
      String(newOwnerName),
    );

    if (previousOwnerEmail) {
      await sendOwnershipTransferAcceptedEmail(
        previousOwnerEmail,
        projectName,
        String(newOwnerName),
        resultRow.previous_owner_id,
      );
    }
  } catch (notifyError) {
    console.error(
      "[transfer:accept] notification dispatch failed",
      notifyError,
    );
  }

  await Promise.all([
    cacheDel(CacheKeys.userProjects(resultRow.previous_owner_id)),
    cacheDel(CacheKeys.userProjects(resultRow.new_owner_id)),
    cacheDel(CacheKeys.userProjectRole(resultRow.previous_owner_id, projectId)),
    cacheDel(CacheKeys.userProjectRole(resultRow.new_owner_id, projectId)),
    cacheDel(CacheKeys.projectMembers(projectId)),
    invalidateUserSecretAccess(resultRow.previous_owner_id),
    invalidateUserSecretAccess(resultRow.new_owner_id),
    invalidateProjectCaches(projectId),
  ]);

  return NextResponse.json({
    success: true,
    transfer: {
      previousOwnerId: resultRow.previous_owner_id,
      newOwnerId: resultRow.new_owner_id,
      previousOwnerDisposition: resultRow.owner_action,
      transferredSecrets: resultRow.transferred_secret_count,
    },
  });
}
