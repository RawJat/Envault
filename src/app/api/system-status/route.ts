import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/system-status";

// Edge runtime: runs closest to the user, minimal cold starts.
export const runtime = "edge";

// ISR-style: CDN serves stale for up to 5 min while revalidating in bg.
export const revalidate = 60;

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json(status, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    // Always return a valid response - never crash the banner fetch
    return NextResponse.json(
      { level: "operational", message: null, incidentCount: 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  }
}
