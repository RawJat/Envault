"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateDisplay } from "@/components/ui/date-display";
import { Check, Copy, Loader2, Trash2, RefreshCw } from "lucide-react";
import {
  generateMcpWebToken,
  getMcpWebTokenStatus,
  revokeMcpWebToken,
} from "@/app/actions";

type McpTokenStatus = {
  id: string;
  name: string;
  masked: string;
  ttlDays: number | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

const TTL_OPTIONS = [7, 15, 30] as const;

export function McpTokenManager() {
  const [tokenName, setTokenName] = useState("My MCP Token");
  const [ttlDays, setTtlDays] = useState<string>("7");
  const [status, setStatus] = useState<McpTokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMcpWebTokenStatus();
      if (result.error) {
        toast.error(result.error);
        setStatus(null);
        return;
      }
      setStatus((result.token as McpTokenStatus | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateMcpWebToken({
        tokenName,
        ttlDays: Number(ttlDays),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setOneTimeToken(result.token ?? null);
      toast.success("MCP token generated.");
      await fetchStatus();
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const result = await revokeMcpWebToken();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOneTimeToken(null);
      toast.success("MCP token revoked.");
      await fetchStatus();
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = async () => {
    if (!oneTimeToken) return;
    try {
      await navigator.clipboard.writeText(oneTimeToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy token.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Dashboard Token</CardTitle>
        <CardDescription>
          Create a web-managed MCP token without installing the CLI. Only one active token is allowed per account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mcp-token-name">Token Name</Label>
            <Input
              id="mcp-token-name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="My MCP Token"
              maxLength={60}
              disabled={generating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-token-ttl">Validity</Label>
            <Select value={ttlDays} onValueChange={setTtlDays} disabled={generating}>
              <SelectTrigger id="mcp-token-ttl">
                <SelectValue placeholder="Select validity" />
              </SelectTrigger>
              <SelectContent>
                {TTL_OPTIONS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={generating || !tokenName.trim()}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {status ? "Regenerate Token" : "Generate Token"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={revoking || !status}
          >
            {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Token
          </Button>
        </div>

        {oneTimeToken && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm font-medium">Copy this token now (shown once)</p>
            <div className="mt-2 flex items-center gap-2">
              <Input value={oneTimeToken} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopy} aria-label="Copy token">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              After this view closes, only a masked token preview is shown.
            </p>
          </div>
        )}

        <div className="rounded-md border p-3 text-sm">
          {loading ? (
            <div className="text-muted-foreground">Checking token status...</div>
          ) : !status ? (
            <div className="text-muted-foreground">No active MCP token.</div>
          ) : (
            <div className="space-y-1">
              <div>
                <span className="font-medium">Name:</span> {status.name}
              </div>
              <div>
                <span className="font-medium">Token:</span> <span className="font-mono text-xs">{status.masked}</span>
              </div>
              <div>
                <span className="font-medium">TTL:</span> {status.ttlDays ? `${status.ttlDays} days` : "Unknown"}
              </div>
              <div>
                <span className="font-medium">Last Used:</span>{" "}
                {status.lastUsedAt ? <DateDisplay date={status.lastUsedAt} addSuffix formatType="relative" /> : "Never"}
              </div>
              <div>
                <span className="font-medium">Expires:</span>{" "}
                {status.expiresAt ? <DateDisplay date={status.expiresAt} addSuffix formatType="relative" /> : "Not set"}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
