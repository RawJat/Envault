"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  Download,
  Settings,
  Share2,
  Trash2,
  CornerDownLeft,
  Command,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EnvVarTable } from "@/components/editor/env-var-table";
import { VariableDialog } from "@/components/editor/variable-dialog";
import { ImportEnvDialog } from "@/components/editor/import-env-dialog";
import { Project, useEnvaultStore } from "@/lib/store";

import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { deleteProject as deleteProjectAction } from "@/app/project-actions";
import { ShareProjectDialog } from "@/components/dashboard/share-project-dialog";
import { RenameProjectDialog } from "@/components/dashboard/rename-project-dialog";
import { GitHubIntegrationDialog } from "@/components/dashboard/github-integration-dialog";
import { AppHeader } from "@/components/dashboard/app-header";
import { Edit3, Github } from "lucide-react";

interface ProjectDetailViewProps {
  project: Project;
}

const ModKey = () => (
  <>
    <Command className="w-3 h-3 mac-only" />
    <span className="non-mac-only">Ctrl</span>
  </>
);

export default function ProjectDetailView({ project }: ProjectDetailViewProps) {
  const router = useRouter();
  const projectId = project.id;
  const { deleteProject } = useEnvaultStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [idCopied, setIdCopied] = useState(false);
  const activeEnvironment = project.active_environment_slug || "development";
  const isAdvancedMode = project.ui_mode === "advanced";
  const availableEnvironments = React.useMemo(
    () => project.environments || [],
    [project.environments],
  );

  const canEdit = project.role === "owner" || project.role === "editor";
  const projectBasePath =
    project.owner_username && project.role !== "owner"
      ? `/${project.owner_username}/${project.slug}`
      : `/project/${project.slug}`;

  useEffect(() => {
    if (!isAdvancedMode || availableEnvironments.length === 0) return;
    availableEnvironments.forEach((env) => {
      router.prefetch(`${projectBasePath}?env=${encodeURIComponent(env.slug)}`);
    });
  }, [isAdvancedMode, availableEnvironments, router, projectBasePath]);

  // Listen for global command context
  useEffect(() => {
    const handleOpenAdd = () => {
      if (!canEdit) return;
      setIsAddDialogOpen(true);
    };
    const handleDownload = () => {
      const btn = document.getElementById("download-env-btn");
      if (btn) btn.click();
    };
    const handleOpenImport = () => {
      if (!canEdit) return;
      setIsImportDialogOpen(true);
    };
    const handleOpenShare = () => {
      if (!canEdit) return;
      setShareDialogOpen(true);
    };
    const handleUniversalDelete = () => {
      if (project.role !== "owner") return;
      // Trigger project delete if specifically requested, or suggest selection
      setDeleteDialogOpen(true);
    };

    document.addEventListener("open-new-variable", handleOpenAdd);
    document.addEventListener("universal-new", handleOpenAdd);
    document.addEventListener("universal-download", handleDownload);
    document.addEventListener("universal-import", handleOpenImport);
    document.addEventListener("universal-share", handleOpenShare);
    document.addEventListener("universal-delete", handleUniversalDelete);

    return () => {
      document.removeEventListener("open-new-variable", handleOpenAdd);
      document.removeEventListener("universal-new", handleOpenAdd);
      document.removeEventListener("universal-download", handleDownload);
      document.removeEventListener("universal-import", handleOpenImport);
      document.removeEventListener("universal-share", handleOpenShare);
      document.removeEventListener("universal-delete", handleUniversalDelete);
    };
  }, [project, canEdit]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteProjectAction(project.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    deleteProject(project.id);
    toast.success("Project deleted");
    setDeleteDialogOpen(false);
    router.push("/dashboard");
  };

  const handleCopyProjectName = async () => {
    try {
      await navigator.clipboard.writeText(project.name);
      toast.success("Project name copied to clipboard");
    } catch {
      toast.error("Failed to copy project name");
    }
  };

  const handleDownloadEnv = async () => {
    const content = project.variables
      .map((v) => `${v.key}=${v.value}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.env`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Open the GitHub integration dialog after a successful callback.
  // We persist the intent in sessionStorage so it survives Fast Refresh remounts
  // (in dev) and any intermediate re-renders before the dialog can mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "github_linked") {
      sessionStorage.setItem("open_github_dialog", "1");
      // Clean up URL immediately so a refresh doesn't re-trigger
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (sessionStorage.getItem("open_github_dialog")) {
      sessionStorage.removeItem("open_github_dialog");
      setTimeout(() => setGithubDialogOpen(true), 0);
    }
  }, []);

  const handleEnvironmentChange = (envSlug: string) => {
    if (!isAdvancedMode) return;
    router.replace(`${projectBasePath}?env=${encodeURIComponent(envSlug)}`);
  };

  // Extract the settings dropdown content into a variable or separate component to pass to actions
  const projectActions =
    project.role === "owner" || project.role === "editor" ? (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="[&_svg]:size-5">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {project.role === "owner" && (
              <DropdownMenuItem onClick={() => setRenameDialogOpen(true)}>
                <Edit3 className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
            )}
            {(project.role === "owner" || project.role === "editor") && (
              <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </DropdownMenuItem>
            )}
            {project.role === "owner" && (
              <DropdownMenuItem onClick={() => setGithubDialogOpen(true)}>
                <Github className="w-4 h-4 mr-2" /> GitHub Integration
              </DropdownMenuItem>
            )}
            {project.role === "owner" && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={project.name}
        backTo="/dashboard"
        actions={projectActions}
        hideSearch
      />

      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 sm:gap-0">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Variables ({project.variables.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Mode: {project.ui_mode || "simple"} | Environment:{" "}
              {project.active_environment_slug ||
                project.default_environment_slug ||
                "development"}
            </p>
            {isAdvancedMode && availableEnvironments.length > 0 && (
              <div className="mt-3">
                <Tabs
                  value={activeEnvironment}
                  onValueChange={handleEnvironmentChange}
                >
                  <TabsList>
                    {availableEnvironments.map((env) => (
                      <TabsTrigger key={env.id} value={env.slug}>
                        {env.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-default">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs text-muted-foreground select-all">
                        {project.id}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">Project ID</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used for CLI authentication and API integration.
                      <br />
                      Active environment:{" "}
                      <span className="font-mono">{activeEnvironment}</span>
                      <br />
                      Run{" "}
                      <code className="font-mono bg-muted px-1 rounded">
                        envault pull --project {project.id} --env{" "}
                        {activeEnvironment}
                      </code>
                    </p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(project.id);
                        setIdCopied(true);
                        setTimeout(() => setIdCopied(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {idCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {idCopied ? "Copied!" : "Copy Project ID"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              id="download-env-btn"
              variant="outline"
              onClick={handleDownloadEnv}
            >
              <Download className="w-4 h-4 mr-2" />
              Download .env
            </Button>
            {canEdit && (
              <>
                <ImportEnvDialog
                  projectId={projectId}
                  environmentSlug={activeEnvironment}
                  existingVariables={project.variables}
                  open={isImportDialogOpen}
                  onOpenChange={setIsImportDialogOpen}
                  trigger={
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import .env
                    </Button>
                  }
                />
                <VariableDialog
                  projectId={projectId}
                  environmentSlug={activeEnvironment}
                  existingVariables={project.variables}
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                  trigger={
                    <Button variant="default">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variable
                      <Kbd variant="primary" size="xs" className="ml-2">
                        N
                      </Kbd>
                    </Button>
                  }
                />
              </>
            )}
          </div>
        </div>

        <EnvVarTable
          projectId={projectId}
          environmentSlug={activeEnvironment}
          variables={project.variables}
          userRole={project.role}
        />
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This
              will permanently delete all environment variables in this project.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="project-delete-confirmation"
              className="text-sm font-normal"
            >
              To confirm, type{" "}
              <span className="inline-flex items-center gap-1 font-bold">
                &quot;{project.name}&quot;{" "}
                <Copy
                  className="h-4 w-4 cursor-pointer hover:text-primary"
                  onClick={handleCopyProjectName}
                />
              </span>{" "}
              below:
            </Label>
            <Input
              id="project-delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={project.name}
              className="bg-background"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-shortcut-submit="true"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== project.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Delete
              <div className="hidden sm:flex items-center gap-1">
                <Kbd variant="primary" size="xs">
                  <ModKey />
                </Kbd>
                <Kbd variant="primary" size="xs">
                  <CornerDownLeft className="h-3 w-3" />
                </Kbd>
              </div>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareProjectDialog
        project={project}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <RenameProjectDialog
        project={project}
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
      />
      <GitHubIntegrationDialog
        project={project}
        open={githubDialogOpen}
        onOpenChange={setGithubDialogOpen}
      />
    </div>
  );
}
