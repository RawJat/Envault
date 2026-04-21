"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Save,
  Triangle,
  Unlink2,
} from "lucide-react";

// Types
interface VercelInstallation {
  configuration_id: string;
  vercel_team_id: string | null;
  status: string;
  account_label?: string;
  account_kind?: "team" | "personal";
}

interface VercelProject {
  id: string;
  name: string;
}

interface LinkedProject {
  id: string;
  vercel_project_name: string;
  vercel_project_id: string;
  configuration_id: string;
}

interface VercelStatusResponse {
  installations: VercelInstallation[];
  linkedProjects: LinkedProject[];
}

type EnvironmentSlug = "development" | "preview" | "production";
type SyncRowState = {
  status: "idle" | "running" | "success" | "error";
  message?: string;
  at?: string;
};

const ENV_LABELS: Record<EnvironmentSlug, string> = {
  development: "Development",
  preview: "Preview",
  production: "Production",
};

function getReadableAccountLabel(installation: VercelInstallation): string {
  const raw =
    installation.account_label ||
    installation.vercel_team_id ||
    "Personal Account";
  const cleaned = raw.trim();

  if (!cleaned || cleaned.startsWith("team_") || cleaned.startsWith("icfg_")) {
    return installation.account_kind === "team" ? "Team Account" : "Personal Account";
  }

  return cleaned;
}

export function VercelIntegrationDropdown({
  envaultProjectId,
  uiMode,
  defaultEnvironmentSlug,
}: {
  envaultProjectId: string;
  uiMode?: "simple" | "advanced";
  defaultEnvironmentSlug?: string;
}) {
  const vercelInstallUrl =
    process.env.NEXT_PUBLIC_VERCEL_INTEGRATION_INSTALL_URL ||
    "https://vercel.com/dashboard/integrations";

  const [installations, setInstallations] = useState<VercelInstallation[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [enabledEnvironments, setEnabledEnvironments] = useState<
    Record<EnvironmentSlug, boolean>
  >({
    development: true,
    preview: true,
    production: true,
  });
  const [syncStatusByEnvironment, setSyncStatusByEnvironment] = useState<
    Record<EnvironmentSlug, SyncRowState>
  >({
    development: { status: "idle" },
    preview: { status: "idle" },
    production: { status: "idle" },
  });

  const [isBaseLoading, setIsBaseLoading] = useState(false);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isMappingsLoading, setIsMappingsLoading] = useState(false);
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unlinkingLinkId, setUnlinkingLinkId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusy =
    isBaseLoading ||
    isProjectsLoading ||
    isLinking ||
    isMappingsLoading ||
    isSavingMappings ||
    isSyncing;

  const selectedInstallation = installations.find(
    (installation) => installation.configuration_id === selectedConfigId,
  );

  const effectiveMode = uiMode || "simple";
  const effectiveDefaultEnvironment =
    defaultEnvironmentSlug === "preview" || defaultEnvironmentSlug === "production"
      ? defaultEnvironmentSlug
      : "development";

  const relevantEnvironmentSlugs = useMemo<EnvironmentSlug[]>(() => {
    return effectiveMode === "advanced"
      ? ["development", "preview", "production"]
      : [effectiveDefaultEnvironment];
  }, [effectiveDefaultEnvironment, effectiveMode]);

  const scopedLinkedProjects = linkedProjects.filter(
    (link) => link.configuration_id === selectedConfigId,
  );

  const selectedLinkedProject = scopedLinkedProjects.find(
    (link) => link.id === selectedLinkId,
  );

  // Phase 3: Configuration UI Lifecycle

  // 1. Fetch available Vercel Installations (e.g. from Team or Personal Account Auth)
  // and previously linked projects.
  const fetchBaseDependencies = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsBaseLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(
          `/api/integrations/vercel/status?projectId=${envaultProjectId}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as
          | VercelStatusResponse
          | { error?: string };

        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error ||
              "Failed to load Vercel integration status",
          );
        }

        const typedData = data as VercelStatusResponse;
        const nextInstallations = typedData.installations || [];
        setInstallations(nextInstallations);
        setLinkedProjects(typedData.linkedProjects || []);
        setNotice(null);

        // Keep a valid selected account without forcing a manual re-selection.
        if (nextInstallations.length === 0) {
          setSelectedConfigId("");
          setVercelProjects([]);
          setSelectedProjectId("");
        } else {
          setSelectedConfigId((currentSelected) => {
            if (
              currentSelected &&
              nextInstallations.some(
                (installation) =>
                  installation.configuration_id === currentSelected,
              )
            ) {
              return currentSelected;
            }
            return nextInstallations[0].configuration_id;
          });
        }
      } catch (err) {
        setError(String(err));
      } finally {
        if (!silent) {
          setIsBaseLoading(false);
        }
      }
    },
    [envaultProjectId],
  );

  useEffect(() => {
    void fetchBaseDependencies();
  }, [fetchBaseDependencies]);

  useEffect(() => {
    setSelectedLinkId((current) => {
      if (
        current &&
        scopedLinkedProjects.some((linkedProject) => linkedProject.id === current)
      ) {
        return current;
      }
      return scopedLinkedProjects[0]?.id || "";
    });
  }, [selectedConfigId, scopedLinkedProjects]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void fetchBaseDependencies({ silent: true });
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchBaseDependencies({ silent: true });
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [fetchBaseDependencies]);

  // 2. Fetch all raw Vercel Projects from the Vercel API
  // via our backend proxy using the decrypted OAuth token
  // tied to `selectedConfigId`
  useEffect(() => {
    const fetchRemoteVercelProjectsList = async () => {
      if (!selectedConfigId) return;

      setIsProjectsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/vercel/projects?projectId=${envaultProjectId}&configurationId=${selectedConfigId}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          projects?: VercelProject[];
          error?: string;
        };

        if (!res.ok) throw new Error(data.error);

        setVercelProjects(data.projects || []);
        setSelectedProjectId("");
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProjectsLoading(false);
      }
    };
    fetchRemoteVercelProjectsList();
  }, [selectedConfigId, envaultProjectId]);

  const handleLinkProject = async () => {
    if (!selectedConfigId || !selectedProjectId) return;

    setIsLinking(true);
    setError(null);

    try {
      // Find name to display natively in the local mapping UI without constant API lookups
      const vercelProjectName =
        vercelProjects.find((p) => p.id === selectedProjectId)?.name ||
        "Unknown";

      // POST the exact map to our new links table
      const res = await fetch(`/api/integrations/vercel/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envaultProjectId,
          vercelProjectId: selectedProjectId,
          vercelProjectName,
          configurationId: selectedConfigId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link project");

      await fetchBaseDependencies({ silent: true });
      setNotice("Linked successfully. Default environment mappings were created.");
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkProject = async (linkId: string) => {
    setUnlinkingLinkId(linkId);
    setError(null);

    try {
      const res = await fetch(`/api/integrations/vercel/link`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envaultProjectId,
          linkId,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to unlink project");

      await fetchBaseDependencies({ silent: true });
      setNotice("Unlinked successfully.");
    } catch (err) {
      setError(String(err));
    } finally {
      setUnlinkingLinkId(null);
    }
  };

  useEffect(() => {
    const fetchMappings = async () => {
      if (!selectedLinkedProject || !selectedConfigId) {
        return;
      }

      setIsMappingsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          projectId: envaultProjectId,
          configurationId: selectedConfigId,
          vercelProjectId: selectedLinkedProject.vercel_project_id,
        });
        const res = await fetch(`/api/integrations/vercel/mappings?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          mappings?: Array<{
            envault_environment_slug: EnvironmentSlug;
          }>;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || "Failed to load mappings");
        }

        const nextEnabled: Record<EnvironmentSlug, boolean> = {
          development: false,
          preview: false,
          production: false,
        };

        const rows = data.mappings || [];
        if (rows.length === 0) {
          // Fallback for older setups: assume mode-driven defaults.
          for (const slug of relevantEnvironmentSlugs) {
            nextEnabled[slug] = true;
          }
        } else {
          for (const mapping of rows) {
            nextEnabled[mapping.envault_environment_slug] = true;
          }
        }

        setEnabledEnvironments(nextEnabled);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsMappingsLoading(false);
      }
    };

    void fetchMappings();
  }, [
    envaultProjectId,
    selectedConfigId,
    selectedLinkedProject,
    relevantEnvironmentSlugs,
  ]);

  const handleSaveMappings = async () => {
    if (!selectedLinkedProject || !selectedConfigId) {
      return;
    }

    setIsSavingMappings(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        projectId: envaultProjectId,
        configurationId: selectedConfigId,
        vercelProjectId: selectedLinkedProject.vercel_project_id,
        mappings: relevantEnvironmentSlugs
          .filter((environmentSlug) => enabledEnvironments[environmentSlug])
          .map((environmentSlug) => ({
          envault_environment_slug: environmentSlug,
          vercel_target: environmentSlug,
          })),
      };

      const res = await fetch("/api/integrations/vercel/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save mappings");
      }

      setNotice("Mappings saved.");
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSavingMappings(false);
    }
  };

  const handleSyncNow = async () => {
    if (!selectedLinkedProject || !selectedConfigId) {
      return;
    }

    setIsSyncing(true);
    setError(null);
    setNotice(null);

    try {
      let hasAnyError = false;
      const selectedEnvironments = relevantEnvironmentSlugs.filter(
        (environmentSlug) => enabledEnvironments[environmentSlug],
      );

      if (selectedEnvironments.length === 0) {
        setNotice("No environments selected for sync.");
        return;
      }

      for (const environmentSlug of selectedEnvironments) {
        setSyncStatusByEnvironment((current) => ({
          ...current,
          [environmentSlug]: {
            status: "running",
            message: "Syncing...",
          },
        }));

        const res = await fetch("/api/integrations/vercel/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: envaultProjectId,
            environmentSlug,
            mode: "full",
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          errors?: string[];
          syncedLinks?: number;
          skippedLinks?: number;
          appliedChanges?: number;
        };

        const completedAt = new Date().toLocaleTimeString();

        if (!res.ok) {
          hasAnyError = true;
          setSyncStatusByEnvironment((current) => ({
            ...current,
            [environmentSlug]: {
              status: "error",
              message: data.error || `Failed syncing ${environmentSlug}`,
              at: completedAt,
            },
          }));
          continue;
        }

        if (Array.isArray(data.errors) && data.errors.length > 0) {
          hasAnyError = true;
          const syncErrors = data.errors;
          setSyncStatusByEnvironment((current) => ({
            ...current,
            [environmentSlug]: {
              status: "error",
              message: syncErrors.join(" | "),
              at: completedAt,
            },
          }));
          continue;
        }

        setSyncStatusByEnvironment((current) => ({
          ...current,
          [environmentSlug]: {
            status: "success",
            message: `Synced links: ${data.syncedLinks ?? 0}, skipped: ${data.skippedLinks ?? 0}, changes: ${data.appliedChanges ?? 0}`,
            at: completedAt,
          },
        }));
      }

      if (hasAnyError) {
        setError("Manual sync completed with some errors. Check row status.");
      } else {
        setNotice("Manual sync completed.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSyncing(false);
    }
  };

  const hasSyncStatus = relevantEnvironmentSlugs.some(
    (environmentSlug) => syncStatusByEnvironment[environmentSlug].status !== "idle",
  );

  return (
    <div className="space-y-6 px-1 pb-2">
      {/* Current Links */}
      <div>
        {isBaseLoading && linkedProjects.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : scopedLinkedProjects.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Linked Projects (Selected Account)
            </h4>
            <ul className="space-y-2">
              {scopedLinkedProjects.map((link) => (
                <li
                  key={link.id}
                  className={`flex items-center justify-between p-3 rounded-md border bg-muted/30 ${selectedLinkId === link.id ? "ring-1 ring-primary/40" : ""}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground text-left"
                    onClick={() => setSelectedLinkId(link.id)}
                  >
                    <Triangle
                      className="w-4 h-4 text-foreground shrink-0 fill-current"
                      strokeWidth={0}
                    />
                    <span className="truncate">{link.vercel_project_name}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20">
                      Active
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkProject(link.id)}
                      disabled={unlinkingLinkId === link.id}
                      className="h-7 px-2"
                    >
                      {unlinkingLinkId === link.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink2 className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">Remove</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 text-center p-6 border rounded-lg bg-muted/20">
            <div className="bg-background p-3 rounded-full shadow-sm border">
              <Triangle
                className="h-6 w-6 text-muted-foreground fill-current"
                strokeWidth={0}
              />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm">No Vercel project linked</h4>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                Link a Vercel project to automatically sync your environment
                variables natively.
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedConfigId && scopedLinkedProjects.length === 0 && (
        <div className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/20">
          No projects are linked under this account yet.
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {notice && (
        <div className="p-3 text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          {notice}
        </div>
      )}

      {selectedLinkedProject && (
        <div className="space-y-3 pt-4 border-t">
          <div>
            <h4 className="text-sm font-medium">Environment Mapping</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {effectiveMode === "simple"
                ? `Simple mode syncs only ${ENV_LABELS[effectiveDefaultEnvironment]}.`
                : "Advanced mode: select only the environments you want to sync. Targets are fixed 1:1 (Development:Development, Preview:Preview, Production:Production)."}
            </p>
          </div>

          {isMappingsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex flex-wrap items-center gap-4 rounded-md border p-3">
              {relevantEnvironmentSlugs.map((environmentSlug) => (
                <label
                  key={environmentSlug}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    className="!rounded-sm"
                    checked={enabledEnvironments[environmentSlug]}
                    onCheckedChange={(checked) =>
                      setEnabledEnvironments((current) => ({
                        ...current,
                        [environmentSlug]: checked === true,
                      }))
                    }
                    disabled={isBusy}
                  />
                  <span>{ENV_LABELS[environmentSlug]}</span>
                </label>
              ))}
            </div>
          )}

          {hasSyncStatus && (
            <div className="text-[11px] text-muted-foreground space-y-1">
              {relevantEnvironmentSlugs.map((environmentSlug) => {
                const row = syncStatusByEnvironment[environmentSlug];
                if (row.status === "idle") return null;
                return (
                  <div key={environmentSlug}>
                    {ENV_LABELS[environmentSlug]}: {row.status}
                    {row.message ? ` • ${row.message}` : ""}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleSaveMappings}
              disabled={isBusy}
            >
              {isSavingMappings ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Mapping
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncNow}
              disabled={isBusy}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          </div>
        </div>
      )}

      {/* New Link Form */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Link New Project</h4>

        {/* Step 1: Account / Configuration */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            1. Vercel Account
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-2 items-center">
            {isBaseLoading && installations.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : installations.length === 0 ? (
              <div className="flex-1 text-sm text-muted-foreground border border-dashed rounded-md p-2 px-3">
                No installations found.
              </div>
            ) : (
              <div className="min-w-0">
                <Select
                  value={selectedConfigId}
                  onValueChange={setSelectedConfigId}
                  disabled={isBusy}
                >
                  <SelectTrigger className="w-full max-w-full [&>span]:truncate">
                    <SelectValue
                      placeholder="Select Vercel account..."
                      aria-label={
                        selectedInstallation
                          ? `${selectedInstallation.account_kind === "team" ? "Team" : "Personal"} • ${getReadableAccountLabel(selectedInstallation)}`
                          : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {installations.map((inst) => (
                      <SelectItem
                        className="max-w-full"
                        key={inst.configuration_id}
                        value={inst.configuration_id}
                      >
                        <span className="block max-w-[260px] truncate">
                          {inst.account_kind === "team" ? "Team • " : "Personal • "}
                          {getReadableAccountLabel(inst)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="outline" asChild className="w-full shrink-0 group">
              <a
                href={vercelInstallUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add Account
                <ExternalLink className="ml-2 w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
            </Button>
          </div>
        </div>

        {/* Step 2: Target Project */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            2. Vercel Project
          </label>
          {isProjectsLoading && selectedConfigId ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={
                !selectedConfigId || isBusy || vercelProjects.length === 0
              }
            >
              <SelectTrigger className="w-full flex-1">
                <SelectValue
                  placeholder={
                    !selectedConfigId
                      ? "Select an account first..."
                      : vercelProjects.length === 0 && isProjectsLoading
                        ? "Loading projects..."
                        : "Select Vercel project to link..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vercelProjects.length > 0 ? (
                  vercelProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No projects found.
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          onClick={handleLinkProject}
          disabled={!selectedConfigId || !selectedProjectId || isBusy}
          className="w-full mt-2"
        >
          {isLinking ? (
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
          ) : (
            <LinkIcon className="w-4 h-4 mr-2" />
          )}
          Connect & Link Project
        </Button>
      </div>
    </div>
  );
}
