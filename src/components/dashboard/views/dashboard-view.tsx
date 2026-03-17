import { AppHeader } from "@/components/dashboard/ui/app-header";
import { DashboardClient, ProjectSkeletonGrid } from "./dashboard-client";
import { getProjects } from "@/app/project-actions";

export default async function DashboardLogic() {
  const result = await getProjects();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = (result.data as any) || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <DashboardClient initialProjects={projects} />
    </div>
  );
}

export { ProjectSkeletonGrid };
