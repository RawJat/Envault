"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Loader2,
  Github,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Project } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface GitHubIntegrationDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubIntegrationDialog({
  project,
  open,
  onOpenChange,
}: GitHubIntegrationDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<Array<{ id: number; full_name: string; pushed_at?: string }>>(
    [],
  );
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  // Keep a live copy of the project so we can refresh it client-side after
  // the GitHub callback without depending on the server component re-rendering.
  const [liveProject, setLiveProject] = useState<Project>(project);
  // Always sync if the parent passes a newer version (e.g. after router.refresh)
  useEffect(() => {
    setLiveProject(project);
  }, [project]);

  // When the dialog opens, re-fetch the project row so we always have the
  // latest github_installation_id / github_repo_full_name from the DB.
  useEffect(() => {
    if (!open) return;
    supabase
      .from("projects")
      .select("*")
      .eq("id", project.id)
      .single()
      .then(({ data, error }) => {
        if (error) return;
        setLiveProject(data as Project);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isLinked = !!liveProject.github_installation_id;
  const hasSelectedRepo = !!liveProject.github_repo_full_name;
  const needsRepoSelection = isLinked && !hasSelectedRepo;

  // Fetch repos if we have an installation but no selected repo
  useEffect(() => {
    if (open && needsRepoSelection && liveProject.github_installation_id) {
      fetchRepositories(liveProject.github_installation_id);
    }
  }, [open, needsRepoSelection, liveProject.github_installation_id]);

  const fetchRepositories = async (installationId: number) => {
    setIsFetchingRepos(true);
    try {
      const res = await fetch(
        `/api/github/repositories?installation_id=${installationId}`,
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to fetch repositories: ${body}`);
      }
      const data = await res.json();
      setRepos(data.repositories || []);
    } catch {
      toast.error("Failed to load GitHub repositories");
    } finally {
      setIsFetchingRepos(false);
    }
  };

  const handleConnect = async () => {
    // Check if the user already has the GitHub App installed on another project.
    // If so, reuse that installation_id and skip the GitHub redirect entirely.
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("github_installation_id")
      .not("github_installation_id", "is", null)
      .neq("id", liveProject.id)
      .limit(1)
      .single();

    if (existingProjects?.github_installation_id) {
      // Already installed — just copy the installation_id to this project
      // and let the user pick a repo directly.
      const { error } = await supabase
        .from("projects")
        .update({ github_installation_id: existingProjects.github_installation_id })
        .eq("id", liveProject.id);

      if (!error) {
        setLiveProject((p) => ({
          ...p,
          github_installation_id: existingProjects.github_installation_id,
        }));
        fetchRepositories(existingProjects.github_installation_id);
        return;
      }
    }

    // No existing installation — go through the normal GitHub App install flow.
    // GitHub's Setup URL callback does NOT forward the `state` URL param -
    // so we persist the projectId in a short-lived cookie before leaving.
    // The callback route reads it back to know which project to link.
    document.cookie = `github_oauth_project_id=${liveProject.id}; path=/; max-age=300; SameSite=Lax`;

    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "envault";
    // Navigate the current tab - avoids all popup-blocker issues.
    window.location.href = `https://github.com/apps/${appName}/installations/new`;
  };

  const handleSelectRepo = async (repoFullName: string) => {
    setIsLoading(true);
    try {
      // Prevent the same repo from being linked to more than one project.
      // If shared, JIT access would auto-grant collaborators access to ALL
      // linked projects simultaneously — a security risk for prod secrets.
      const { data: conflict } = await supabase
        .from("projects")
        .select("id, name")
        .eq("github_repo_full_name", repoFullName)
        .neq("id", liveProject.id)
        .limit(1)
        .single();

      if (conflict) {
        toast.error(
          `This repository is already linked to another project ("${conflict.name}"). Each repository can only be linked to one project.`,
        );
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from("projects")
        .update({ github_repo_full_name: repoFullName })
        .eq("id", liveProject.id);

      if (error) throw error;

      setLiveProject((p) => ({ ...p, github_repo_full_name: repoFullName }));
      toast.success("Repository linked successfully!");
      router.refresh();
    } catch {
      toast.error("Failed to link repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ github_repo_full_name: null })
        .eq("id", liveProject.id);

      if (error) throw error;

      // Only clear the repo name - keep the installation ID so the dialog goes
      // back to repo-selection state instead of needing a new GitHub OAuth flow.
      setLiveProject((p) => ({ ...p, github_repo_full_name: null }));
      toast.success("Repository unlinked");
      router.refresh();
      // Immediately reload repos so the user can pick a new one
      if (liveProject.github_installation_id) {
        fetchRepositories(liveProject.github_installation_id);
      }
    } catch {
      toast.error("Failed to unlink repository");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </DialogTitle>
          <DialogDescription>
            Link a GitHub repository to automatically grant access to
            collaborators when they run{" "}
            <code className="bg-muted px-1 py-0.5 rounded">envault pull</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!isLinked && (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-4 sm:p-6 border rounded-lg bg-muted/30">
              <div className="bg-background p-3 rounded-full shadow-sm border">
                <Github className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">No repository linked</h4>
                <p className="text-sm text-muted-foreground">
                  Install the Envault GitHub App to enable Just-in-Time access
                  for your team.
                </p>
              </div>
              <Button onClick={handleConnect} className="w-full sm:w-auto">
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect GitHub Repository
              </Button>
            </div>
          )}

          {needsRepoSelection && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-900">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  App installed! Please select the specific repository to link
                  to this project.
                </p>
              </div>

              <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                {isFetchingRepos ? (
                  <div className="divide-y">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3">
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : repos.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No repositories found. Make sure you granted access to the
                    correct repositories during installation.
                  </div>
                ) : (
                  repos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{repo.full_name}</span>
                        {repo.pushed_at && (
                          <span className="text-xs text-muted-foreground">
                            last commit {formatRelativeTime(repo.pushed_at)}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => handleSelectRepo(repo.full_name)}
                        disabled={isLoading}
                      >
                        Select
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {isLinked && hasSelectedRepo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Successfully Linked
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400 font-mono mt-0.5 truncate">
                      {liveProject.github_repo_full_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isLoading}
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Unlink
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone who is a collaborator on{" "}
                <strong>{liveProject.github_repo_full_name}</strong> will
                automatically be granted Viewer access when they run{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  envault pull
                </code>
                .
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
