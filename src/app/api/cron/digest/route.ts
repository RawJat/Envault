import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDigestEmail } from "@/lib/email";
import { Notification } from "@/lib/types/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Verify Authentication
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Determine Frequency
  const searchParams = request.nextUrl.searchParams;
  const frequency = searchParams.get("frequency");

  if (frequency !== "daily" && frequency !== "weekly") {
    return new NextResponse(
      'Invalid frequency parameter. Must be "daily" or "weekly".',
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  try {
    // 3. Get Users with valid preference
    // explicitly exclude 'none' by only selecting matching frequency
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("digest_frequency", frequency);

    if (prefError) throw prefError;
    if (!preferences || preferences.length === 0) {
      return NextResponse.json({
        message: "No users (with this frequency) found",
      });
    }

    const userIds = preferences.map((p) => p.user_id);

    // 4. Calculate Time Window
    const now = new Date();
    const timeWindow =
      frequency === "daily"
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const timeWindowIso = timeWindow.toISOString();

    // 5. Process each user
    const results = [];

    for (const userId of userIds) {
      // Get user email
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(userId);

      if (userError || !user || !user.email) {
        console.error(`[Digest] Failed to get user ${userId}:`, userError);
        continue;
      }

      // Get recent notifications
      const { data: notifications, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", timeWindowIso)
        .order("created_at", { ascending: false });

      if (notifError) {
        console.error(
          `[Digest] Failed to get notifications for ${userId}:`,
          notifError,
        );
        continue;
      }


      // Send Email if there is activity
      if (notifications && notifications.length > 0) {
        await sendDigestEmail(
          user.email,
          notifications as Notification[],
          frequency,
        );
        results.push({ userId, sent: true, count: notifications.length });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter((r) => r.sent).length,
      details: results,
    });
  } catch (error: any) {
    console.error("Digest Cron Job Failed:", error);
    return new NextResponse(`Internal Server Error: ${error.message}`, {
      status: 500,
    });
  }
}
