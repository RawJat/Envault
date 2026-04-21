import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

function hasRequiredRole(role: string | null | undefined) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "owner" || normalized === "admin";
}

async function canManageProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return false;
  }

  if (project.user_id === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return hasRequiredRole(membership?.role);
}

type VercelInstallationRecord = {
  configuration_id: string;
  vercel_team_id: string | null;
  access_token: string | null;
  status: string;
};

type VercelIdentity = {
  account_label: string;
  account_kind: "team" | "personal";
};

async function resolveVercelIdentity(
  accessToken: string,
  teamId: string | null,
): Promise<VercelIdentity> {
  if (teamId) {
    const teamResponse = await fetch(`https://api.vercel.com/v2/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (teamResponse.ok) {
      const teamPayload = (await teamResponse.json()) as {
        id?: string;
        name?: string;
        slug?: string;
      };
      const explicitTeamLabel = teamPayload.name || teamPayload.slug;
      if (explicitTeamLabel) {
        return {
          account_label: explicitTeamLabel,
          account_kind: "team",
        };
      }
    }

    const teamsResponse = await fetch("https://api.vercel.com/v2/teams", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (teamsResponse.ok) {
      const teamsPayload = (await teamsResponse.json()) as {
        teams?: Array<{ id: string; name?: string; slug?: string }>;
      };
      const matchedTeam = teamsPayload.teams?.find((team) => team.id === teamId);
      if (matchedTeam) {
        const teamLabel = matchedTeam.name || matchedTeam.slug;
        if (teamLabel) {
          return {
            account_label: teamLabel,
            account_kind: "team",
          };
        }
      }
    }

    return { account_label: "Team Account", account_kind: "team" };
  }

  const userResponse = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (userResponse.ok) {
    const userPayload = (await userResponse.json()) as {
      user?: { name?: string; username?: string; email?: string };
    };
    const user = userPayload.user;
    const label = user?.name || user?.username || user?.email;
    if (label) {
      return { account_label: label, account_kind: "personal" };
    }
  }

  return { account_label: "Personal Account", account_kind: "personal" };
}

function sanitizeAccountLabel(
  rawLabel: string,
  accountKind: "team" | "personal",
): string {
  const trimmed = rawLabel.trim();
  if (!trimmed) {
    return accountKind === "team" ? "Team Account" : "Personal Account";
  }

  // Never leak raw opaque IDs as the primary user-facing label.
  if (trimmed.startsWith("team_") || trimmed.startsWith("icfg_")) {
    return accountKind === "team" ? "Team Account" : "Personal Account";
  }

  return trimmed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId parameter" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasProjectAccess = await canManageProject(
      supabase,
      projectId,
      user.id,
    );
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: installations, error: installationsError } =
      await supabaseAdmin
        .from("vercel_installations")
        .select("configuration_id, vercel_team_id, access_token, status")
        .eq("created_by", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (installationsError) {
      console.error(
        "[Vercel Sync] Failed to fetch installations:",
        installationsError,
      );
      return NextResponse.json(
        { error: "Failed to load integrations" },
        { status: 500 },
      );
    }

    const { data: linkedProjects, error: linksError } = await supabaseAdmin
      .from("vercel_project_links")
      .select("id, vercel_project_name, vercel_project_id, configuration_id")
      .eq("envault_project_id", projectId)
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error(
        "[Vercel Sync] Failed to fetch linked projects:",
        linksError,
      );
      return NextResponse.json(
        { error: "Failed to load linked projects" },
        { status: 500 },
      );
    }

    const normalizedInstallations = (installations ??
      []) as VercelInstallationRecord[];

    const enrichedInstallations = await Promise.all(
      normalizedInstallations.map(async (installation) => {
        if (!installation.access_token) {
          const accountKind = installation.vercel_team_id ? "team" : "personal";
          return {
            configuration_id: installation.configuration_id,
            vercel_team_id: installation.vercel_team_id,
            status: installation.status,
            account_label: sanitizeAccountLabel(
              installation.vercel_team_id || "Personal Account",
              accountKind,
            ),
            account_kind: accountKind,
          };
        }

        try {
          const vercelAccessToken = installation.access_token.startsWith("v1:")
            ? await decrypt(installation.access_token)
            : installation.access_token;
          const identity = await resolveVercelIdentity(
            vercelAccessToken,
            installation.vercel_team_id,
          );
          return {
            configuration_id: installation.configuration_id,
            vercel_team_id: installation.vercel_team_id,
            status: installation.status,
            account_label: sanitizeAccountLabel(
              identity.account_label,
              identity.account_kind,
            ),
            account_kind: identity.account_kind,
          };
        } catch (identityError) {
          console.error(
            "[Vercel Sync] Failed to resolve installation identity:",
            identityError,
          );
          const accountKind = installation.vercel_team_id ? "team" : "personal";
          return {
            configuration_id: installation.configuration_id,
            vercel_team_id: installation.vercel_team_id,
            status: installation.status,
            account_label: accountKind === "team" ? "Team Account" : "Personal Account",
            account_kind: accountKind,
          };
        }
      }),
    );

    return NextResponse.json({
      installations: enrichedInstallations,
      linkedProjects: linkedProjects ?? [],
    });
  } catch (error) {
    console.error("[Vercel Sync] Status endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
