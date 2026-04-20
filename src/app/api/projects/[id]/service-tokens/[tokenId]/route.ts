import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/auth/permissions";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId, tokenId } = await params;

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can delete service tokens." },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("service_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
