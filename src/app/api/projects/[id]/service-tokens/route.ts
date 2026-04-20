import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/auth/permissions";

const CreateServiceTokenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  environment: z.string().min(1, "Environment is required"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can view service tokens." },
      { status: 403 },
    );
  }

  const { data: tokens, error } = await supabase
    .from("service_tokens")
    .select("id, name, environment, created_at, expires_at, last_used_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tokens });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can create service tokens." },
      { status: 403 },
    );
  }

  let payload: z.infer<typeof CreateServiceTokenSchema>;
  try {
    payload = CreateServiceTokenSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid request body"
        : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rawToken = `envault_svc_${crypto.randomBytes(32).toString("hex")}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { data, error: insertError } = await supabase
    .from("service_tokens")
    .insert({
      project_id: projectId,
      name: payload.name,
      environment: payload.environment,
      created_by: user.id,
      token_hash: tokenHash,
    })
    .select("id, name, environment, created_at, expires_at, last_used_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ token: rawToken, tokenRecord: data });
}
