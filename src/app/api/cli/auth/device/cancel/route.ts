import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { device_code } = body;

    if (!device_code) {
      return NextResponse.json(
        { error: "Missing device_code" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("device_flow_sessions")
      .delete()
      .eq("device_code", device_code);

    if (error) {
      console.error("Error cancelling device session:", error);
      return NextResponse.json(
        { error: "Failed to cancel session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Device flow cancel error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
