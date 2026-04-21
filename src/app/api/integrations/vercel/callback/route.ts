import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/utils/encryption";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const configurationId = searchParams.get("configurationId");
    const teamId = searchParams.get("teamId") || null; // Will exist if Vercel installed on a Team

    // 1. Validate required Vercel OAuth params
    if (!code || !configurationId) {
      return NextResponse.json(
        { error: "Missing required generic OAuth parameters from Vercel" },
        { status: 400 },
      );
    }

    // Ensure we have server env vars loaded
    const clientId = process.env.VERCEL_CLIENT_ID;
    const clientSecret = process.env.VERCEL_CLIENT_SECRET;
    const redirectUri = process.env.VERCEL_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        "[Vercel Sync] Missing VERCEL OAuth application credentials in .env.local",
      );
      return NextResponse.json(
        { error: "Internal Configuration Error" },
        { status: 500 },
      );
    }

    // 2. Trade the OAuth `code` for an `access_token`
    const tokenResponse = await fetch(
      "https://api.vercel.com/v2/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri, // Must strictly match the integration settings exact Redirect URI string
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[Vercel Sync] Vercel token exchange failed:", tokenData);
      return NextResponse.json(
        { error: "Failed to exchange authorization code with Vercel API" },
        { status: 400 },
      );
    }

    const { access_token: rawAccessToken } = tokenData;

    // 3. Encrypt token at rest before storing.
    const encryptedToken = await encrypt(rawAccessToken);

    // 4. Save to Database (using admin client to bypass row level security for inserts here)
    const supabaseAdmin = await createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: dbError } = await supabaseAdmin
      .from("vercel_installations")
      .upsert(
        {
          configuration_id: configurationId,
          vercel_team_id: teamId,
          access_token: encryptedToken,
          status: "active",
          created_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "configuration_id" }, // Upserts if the configuration ID already exists
      );

    if (dbError) {
      console.error(
        "[Vercel Sync] Failed to store installation in database:",
        dbError,
      );
      return NextResponse.json(
        { error: "Database storage failed" },
        { status: 500 },
      );
    }

    // 5. Build Redirect URL to Dashboard
    // Usually routes to the global projects list or a specific settings callback
    const dashboardURL = next || "/dashboard";

    return NextResponse.redirect(new URL(dashboardURL, request.url));
  } catch (error) {
    console.error("[Vercel Sync] Critical OAuth flow exception:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
