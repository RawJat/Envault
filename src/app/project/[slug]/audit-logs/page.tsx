import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { AuditLogsView } from "@/components/dashboard/audit-logs-view";
import { AppHeader } from "@/components/dashboard/app-header";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Audit Logs - ${slug}`,
  };
}

export default async function AuditLogsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the project by slug and user_id to get project.id
  const { data: project, error: _projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (_projectError || !project) {
    notFound();
  }

  // Verify user is owner
  const { getProjectRole } = await import("@/lib/permissions");
  const role = await getProjectRole(supabase, project.id, user.id);

  if (role !== "owner") {
    // Only owners can access audit logs
    redirect(`/project/${slug}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={`${project.name} - Audit Logs`}
        backTo={`/project/${slug}`}
        hideSearch
      />

      <main className="container mx-auto py-8 flex-1 px-4">
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Project Audit Logs
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Chronological log of activities and security events for {project.name}
          . Data is retained for 7 days.
        </p>

        <div className="mt-4">
          {/* We pass a simplified Project object to reuse the same prop structure, or just pass projectId */}
          <AuditLogsView projectId={project.id} />
        </div>
      </main>
    </div>
  );
}
