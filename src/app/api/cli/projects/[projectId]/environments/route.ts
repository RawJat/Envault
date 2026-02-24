import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { NextResponse } from "next/server";
import { getProjectRole } from "@/lib/permissions";
import { getProjectEnvironments } from "@/lib/cli-environments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result;
  }
  const userId = result;

  const { projectId } = await params;
  const supabase = createAdminClient();

  const role = await getProjectRole(supabase, projectId, userId);
  if (!role) {
    return NextResponse.json(
      { error: "Forbidden: no access to this project" },
      { status: 403 },
    );
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
