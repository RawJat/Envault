"use client";

import { useEnvaultStore } from "@/lib/store";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { ProjectCard } from "@/components/dashboard/project-card";
import { ShieldCheck, Share2 } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/app-header";

export default function DashboardPage() {
  const projects = useEnvaultStore((state) => state.projects);
  const { user, isLoading } = useEnvaultStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") || "my-projects",
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const requested = searchParams.get("requested");
  const approved = searchParams.get("approved");
  const denied = searchParams.get("denied");

  // Function to refresh projects
  const refreshProjects = useCallback(async () => {
    const { getProjects } = await import("@/app/project-actions");
    const result = await getProjects(true); // bypass cache
    if (result.data) {
      const setProjects = useEnvaultStore.getState().setProjects;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProjects(result.data as any);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (requested === "true") {
      toast.success("Access request sent!", {
        description: "The project owner will be notified of your request.",
        duration: 5000,
      });
    } else if (approved === "true") {
      toast.success("Access request approved!", {
        description: "The user has been added to the project.",
        duration: 5000,
      });
      // Refresh projects to update roles after approval
      refreshProjects();
    } else if (denied === "true") {
      toast.info("Access request denied.", {
        description: "The request has been removed.",
        duration: 5000,
      });
    }

    if (requested || approved || denied) {
      // Clear the params from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("requested");
      url.searchParams.delete("approved");
      url.searchParams.delete("denied");
      router.replace(url.pathname + url.search);
    }

    // Listen for project role changes
    const handleProjectRoleChanged = () => {
      // Refresh projects with updated roles
      refreshProjects();
    };

    // Refresh projects when window regains focus (in case permissions changed elsewhere)
    const handleWindowFocus = () => {
      refreshProjects();
    };

    document.addEventListener("project-role-changed", handleProjectRoleChanged);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener(
        "project-role-changed",
        handleProjectRoleChanged,
      );
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [requested, approved, denied, router, refreshProjects]);

  // Sync tab state with URL
  useEffect(() => {
    if (!mounted) return;
    const currentUrlTab = searchParams.get("tab");
    const defaultTab = "my-projects";
    // Only update URL if it differs from state
    if (activeTab === defaultTab && !currentUrlTab) return;
    if (activeTab !== currentUrlTab) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeTab === defaultTab) {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(null, "", url);
    }
  }, [activeTab, mounted, pathname, searchParams]);

  // Shortcuts
  useEffect(() => {
    const handleNew = () => setIsCreateDialogOpen(true);
    const handleSwitch = (e: Event) => {
      const index = (e as CustomEvent).detail.index;
      if (index === 0) setActiveTab("my-projects");
      if (index === 1) setActiveTab("shared-with-me");
    };

    document.addEventListener("universal-new", handleNew);
    document.addEventListener("switch-tab", handleSwitch);

    return () => {
      document.removeEventListener("universal-new", handleNew);
      document.removeEventListener("switch-tab", handleSwitch);
    };
  }, []);

  if (!mounted) {
    return null; // Or a more elaborate skeleton if desired
  }

  // Filter Projects
  const myProjects = projects.filter(
    (p) => p.role === "owner" || p.role === "editor",
  );
  const sharedProjects = projects.filter(
    (p) => p.role === "viewer" && p.user_id !== user?.id,
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your environment variables securely.
            </p>
          </div>
          <CreateProjectDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger
              value="my-projects"
              className="flex items-center gap-2"
            >
              My Projects<Kbd size="xs">1</Kbd>
            </TabsTrigger>
            <TabsTrigger
              value="shared-with-me"
              className="flex items-center gap-2"
            >
              Shared with Me<Kbd size="xs">2</Kbd>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-projects">
            {isLoading ? (
              <ProjectSkeletonGrid />
            ) : myProjects.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                {myProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared-with-me">
            {isLoading ? (
              <ProjectSkeletonGrid />
            ) : sharedProjects.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No shared projects</h3>
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t been invited to any projects yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                {sharedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export function ProjectSkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border bg-card text-card-foreground shadow h-full min-h-[12rem] relative overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="absolute bottom-0 w-full bg-muted/20 border-t p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="h-12" /> {/* Spacer for footer */}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border-2 border-dashed rounded-xl">
      <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium">No projects yet</h3>
      <p className="text-muted-foreground mb-4">
        Create your first project to get started.
      </p>
      <div className="inline-block">
        <CreateProjectDialog />
      </div>
    </div>
  );
}
