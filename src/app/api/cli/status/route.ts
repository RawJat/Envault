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
  if ('status' in result) {
    return result;
  }

  const supabase = createAdminClient();
  let projectId = new URL(request.url).searchParams.get("projectId") || "";
  let user = { email: "" };
  let userId = "";

  if (result.type === 'service') {
    if (projectId && projectId !== result.projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    projectId = result.projectId;
    user = { email: "Service Token (CI)" };
  } else {
    userId = result.userId;
    const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !userData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    user = { email: userData.user.email || "" };
  }

  if (!projectId) {
    return NextResponse.json({
      user,
    });
  }

  let role: string | null = null;
  if (result.type === 'service') {
    role = "owner"; // Service tokens have read/write access to their linked project
  } else {
    role = await getProjectRole(supabase, projectId, userId);
  }

  if (!role) {
    return NextResponse.json(
      { error: "Forbidden: no access to this project" },
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
    user,
    project: {
      id: projectData?.id || projectId,
      name: projectData?.name || "Unknown",
      role,
      permissions: permissionSetForRole(role),
      defaultEnvironment: envResolution.environment.slug,
    },
  });
}
