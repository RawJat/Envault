import { useState, useEffect, useCallback } from "react";
import {
  Check,
  Copy,
  Key,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project } from "@/lib/stores/store";
import { DateDisplay } from "@/components/ui/date-display";

interface Token {
  id: string;
  name: string;
  environment: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

interface ServiceTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  availableEnvironments: { id: string; name: string; slug: string }[];
}

export function ServiceTokenDialog({
  open,
  onOpenChange,
  project,
  availableEnvironments,
}: ServiceTokenDialogProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdvancedMode = project.ui_mode === "advanced";

  const fetchTokens = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/service-tokens`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      } else {
        const { error } = await res.json();
        toast.error(error || "Failed to load service tokens");
      }
    } catch {
      toast.error("An error occurred while loading tokens");
    } finally {
      setLoading(false);
    }
  }, [open, project.id]);

  useEffect(() => {
    if (open) {
      setRawToken(null);
      setName("");
      setEnvironment(
        isAdvancedMode ? "" : project.default_environment_slug || "development",
      );
      fetchTokens();
    }
  }, [open, fetchTokens, isAdvancedMode, project.default_environment_slug]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEnv = isAdvancedMode
      ? environment
      : project.default_environment_slug || "development";
    if (!name || !targetEnv) {
      toast.error("Please fill out all fields");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/service-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, environment: targetEnv }),
      });
      const data = await res.json();
      if (res.ok) {
        setRawToken(data.token);
        if (data.tokenRecord) {
          setTokens((prev) => [data.tokenRecord, ...prev]);
        } else {
          fetchTokens();
        }
        toast.success("Service token generated successfully");
      } else {
        toast.error(data.error || "Failed to generate service token");
      }
    } catch {
      toast.error("An error occurred while generating token");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/service-tokens/${id}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        toast.success("Service token revoked");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to revoke token");
      }
    } catch {
      toast.error("An error occurred while revoking token");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async () => {
    if (rawToken) {
      await navigator.clipboard.writeText(rawToken);
      setCopied(true);
      toast.success("Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            CI/CD Service Tokens
          </DialogTitle>
          <DialogDescription>
            Generate restricted, environment-scoped tokens for your CI/CD
            pipelines (e.g., Vercel, GitHub Actions) to fetch secrets from
            Envault.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 overflow-y-auto pr-2">
          {rawToken ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-full mt-0.5">
                  <ShieldAlert className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-emerald-500 font-medium">
                    Store this token securely
                  </h3>
                  <p className="text-sm text-emerald-500/80 mt-1">
                    This is the <strong>only time</strong> you will see this
                    token. Store it securely in your CI/CD platform immediately.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={rawToken}
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="whitespace-nowrap"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setRawToken(null);
                  setName("");
                  setEnvironment("");
                }}
              >
                Back to Manage Tokens
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleGenerate}
              className="bg-muted/50 p-4 rounded-lg border space-y-4"
            >
              <div>
                <h4 className="font-medium text-sm mb-3">Create New Token</h4>
                <div
                  className={`grid grid-cols-1 ${isAdvancedMode ? "md:grid-cols-2" : ""} gap-4`}
                >
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Token Name</Label>
                    <Input
                      id="token-name"
                      placeholder="e.g. Vercel Production"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  {isAdvancedMode && (
                    <div className="space-y-2">
                      <Label htmlFor="token-env">Environment</Label>
                      <Select
                        value={environment}
                        onValueChange={setEnvironment}
                        required
                      >
                        <SelectTrigger id="token-env">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEnvironments.map((env) => (
                            <SelectItem key={env.id} value={env.slug}>
                              {env.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                disabled={generating}
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Generate Token
              </Button>
            </form>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Active Tokens</h4>
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center p-8 border rounded-lg border-dashed bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  No service tokens found for this project.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[250px] border rounded-md">
                <div className="divide-y">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="p-4 flex items-center justify-between gap-4 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {token.name}
                          </p>
                          {isAdvancedMode && (
                            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {availableEnvironments.find(
                                (e) => e.slug === token.environment,
                              )?.name || token.environment}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Created: <DateDisplay date={token.created_at} />
                          </span>
                          {token.last_used_at ? (
                            <span>
                              Last used:{" "}
                              <DateDisplay
                                date={token.last_used_at}
                                formatType="relative"
                                addSuffix
                              />
                            </span>
                          ) : (
                            <span>Never used</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive focus:text-destructive shrink-0"
                        onClick={() => handleRevoke(token.id)}
                        disabled={revokingId === token.id}
                      >
                        {revokingId === token.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Revoke</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
