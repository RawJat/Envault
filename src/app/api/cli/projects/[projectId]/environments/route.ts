import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/auth/cli-auth";
import { NextResponse } from "next/server";
import { getProjectRole } from "@/lib/auth/permissions";
import { getProjectEnvironments } from "@/lib/utils/cli-environments";
import { humanApiLimit, machineApiLimit } from "@/lib/infra/ratelimit";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if ("status" in result) {
    return result;
  }

  // Bifurcated Rate Limiting
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (result.type === "service") {
    const { success } = await machineApiLimit.limit(
      `cli_machine_${result.tokenId}`,
    );
    if (!success)
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
  } else {
    const identifier = result.userId || ip;
    const { success } = await humanApiLimit.limit(`cli_human_${identifier}`);
    if (!success)
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
  }

  const { projectId } = await params;
  const supabase = createAdminClient();

  if (result.type === "service") {
    if (result.projectId !== projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else {
    const userId = result.userId;
    const role = await getProjectRole(supabase, projectId, userId);
    if (!role) {
      return NextResponse.json(
        { error: "Forbidden: no access to this project" },
        { status: 403 },
      );
    }

    if (role !== "owner") {
      const { data: member } = await supabase
        .from("project_members")
        .select("allowed_environments")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

      if (member?.allowed_environments) {
        try {
          const environments = await getProjectEnvironments(
            supabase,
            projectId,
          );
          const allowed = new Set(member.allowed_environments);
          return NextResponse.json({
            environments: environments
              .filter((env) => allowed.has(env.slug))
              .map((env) => ({
                id: env.id,
                slug: env.slug,
                name: env.name,
                isDefault: env.is_default,
              })),
          });
        } catch (e) {
          return NextResponse.json(
            {
              error:
                e instanceof Error ? e.message : "Failed to fetch environments",
            },
            { status: 500 },
          );
        }
      }

      if (!member) {
        try {
          const { data: sharedSecrets, error: sharedSecretsError } =
            await supabase
              .from("secret_shares")
              .select("secrets!inner(environment_id, project_id)")
              .eq("user_id", userId)
              .eq("secrets.project_id", projectId);

          if (sharedSecretsError) {
            return NextResponse.json(
              { error: sharedSecretsError.message },
              { status: 500 },
            );
          }

          const allowedEnvironmentIds = new Set(
            (sharedSecrets || []).map((share) => {
              const secret = Array.isArray(share.secrets)
                ? share.secrets[0]
                : share.secrets;
              return secret.environment_id as string;
            }),
          );

          const environments = await getProjectEnvironments(
            supabase,
            projectId,
          );
          return NextResponse.json({
            environments: environments
              .filter((env) => allowedEnvironmentIds.has(env.id))
              .map((env) => ({
                id: env.id,
                slug: env.slug,
                name: env.name,
                isDefault: env.is_default,
              })),
          });
        } catch (e) {
          return NextResponse.json(
            {
              error:
                e instanceof Error ? e.message : "Failed to fetch environments",
            },
            { status: 500 },
          );
        }
      }
    }
  }

  try {
    const environments = await getProjectEnvironments(supabase, projectId);
    return NextResponse.json({
      environments: environments.map((env) => ({
        id: env.id,
        slug: env.slug,
        name: env.name,
        isDefault: env.is_default,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to fetch environments",
      },
      { status: 500 },
    );
  }
}
