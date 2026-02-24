import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { NextResponse } from "next/server";
import { getProjectRole } from "@/lib/permissions";
import { resolveProjectEnvironment } from "@/lib/cli-environments";

function permissionSetForRole(role: string | null) {
  if (role === "owner" || role === "editor") {
    return ["read", "write"];
  }
  if (role === "viewer") {
    return ["read"];
  }
  return [];
}

export async function GET(request: Request) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result;
  }
  const userId = result;

  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(userId);

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId") || "";

  if (!projectId) {
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  }

  const role = await getProjectRole(supabase, projectId, userId);
  if (!role) {
    return NextResponse.json(
      {
        error: "Forbidden: no access to this project",
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 403 },
    );
  }

  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  let envResolution;
  try {
    envResolution = await resolveProjectEnvironment(supabase, projectId, null);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to resolve project environment",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    project: {
      id: projectData?.id || projectId,
      name: projectData?.name || "Unknown",
      role,
      permissions: permissionSetForRole(role),
      defaultEnvironment: envResolution.environment.slug,
    },
  });
}
