import { createAdminClient } from "@/lib/supabase/admin";
import { validateCliToken } from "@/lib/cli-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ProjectNameSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result;
  }
  const userId = result;

  const supabase = createAdminClient();

  // 1. Owned projects
  const { data: owned } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .eq("user_id", userId);

  // 2. Shared projects (where user is a member)
  const { data: shared } = await supabase
    .from("project_members")
    .select("projects(id, name, user_id), role")
    .eq("user_id", userId);

  // 3. Projects with shared secrets (where user has individual secret access)
  const { data: secretShared } = await supabase
    .from("secret_shares")
    .select("secrets!inner(project_id, projects(id, name, user_id))")
    .eq("user_id", userId);

  // Map owned projects with isOwner flag
  const ownedProjects = (owned || []).map((p) => ({
    id: p.id,
    name: p.name,
    isOwner: true,
    role: "owner" as const,
  }));

  // Map shared projects with isOwner flag and role
  interface SharedProjectMember {
    projects:
      | { id: string; name: string; user_id: string }
      | { id: string; name: string; user_id: string }[]
      | null;
    role: "viewer" | "editor" | "owner";
  }

  const sharedProjects = (shared || []).map((m) => {
    const member = m as unknown as SharedProjectMember;
    // Handle potential array or object from join
    const project = Array.isArray(member.projects)
      ? member.projects[0]
      : member.projects;
    return {
      id: project?.id,
      name: project?.name,
      isOwner: false,
      role: member.role,
    };
  });

  // Map secret-shared projects (viewer access only)
  interface SecretShare {
    secrets: {
      projects: {
        id: string;
        name: string;
      } | null;
    } | null;
  }

  const secretSharedProjects = (secretShared || []).map((s) => {
    const secret = s as unknown as SecretShare;
    const project = secret.secrets?.projects;
    return {
      id: project?.id,
      name: project?.name,
      isOwner: false,
      role: "viewer" as const,
    };
  });

  // Combine and dedupe
  const combined = [
    ...ownedProjects,
    ...sharedProjects,
    ...secretSharedProjects,
  ];

  // Dedupe just in case (shouldn't happen if logic is correct: owner can't be member)
  const uniqueMap = new Map();
  combined.forEach((p) => {
    if (!uniqueMap.has(p.id)) {
      uniqueMap.set(p.id, p);
    }
  });

  const finalProjects = Array.from(uniqueMap.values())
    .filter((p) => p.name)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return NextResponse.json({
    projects: finalProjects,
    owned: ownedProjects.sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    ),
    shared: [...sharedProjects, ...secretSharedProjects].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    ),
  });
}

export async function POST(request: Request) {
  const result = await validateCliToken(request);
  if (typeof result !== "string") {
    return result;
  }
  const userId = result;

  const body = await request.json();
  const validation = ProjectNameSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: `Validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const { name } = validation.data;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      user_id: userId,
    })
    .select("id, name, slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notification for project creation
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "project_created",
    title: "Project Created via CLI",
    message: `You created project "${name.trim()}"`,
    icon: "FolderPlus",
    variant: "success",
    metadata: {
      projectId: data.id,
      projectName: name.trim(),
      source: "cli",
    },
    action_url: `/project/${data.slug}`,
    action_type: "view_project",
  });

  // Invalidate user's project list cache
  const { cacheDel, CacheKeys } = await import("@/lib/cache");
  await cacheDel(CacheKeys.userProjects(userId));
  revalidatePath("/dashboard");

  return NextResponse.json({ project: data });
}
