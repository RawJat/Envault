"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AuditLogsSkeleton } from "./audit-logs-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuditLog {
  id: string;
  created_at: string;
  actor_id: string;
  actor_type: "user" | "machine";
  action: string;
  ip_address: string | null;
  actor_email?: string;
  actor_name?: string;
}

interface AuditLogsViewProps {
  projectId: string;
}

export function AuditLogsView({ projectId }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/${projectId}/audit-logs`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment.");
        }
        if (res.status === 403 || res.status === 401) {
          throw new Error("Only the project owner can view audit logs.");
        }
        throw new Error("Failed to load audit logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred while fetching audit logs.");
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    if (action.includes("create"))
      return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
    if (action.includes("delete"))
      return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
    if (action.includes("update"))
      return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
    return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20";
  };

  if (isLoading) {
    return <AuditLogsSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Logs</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card/50">
        <div className="rounded-full bg-muted p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          No Audit Logs Found
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          There has been no recorded activity in this project yet. Actions like
          adding or deleting secrets will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View Table */}
      <div className="hidden md:block rounded-md border bg-card min-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[200px] whitespace-nowrap">
                Timestamp
              </TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">
                Action
              </TableHead>
              <TableHead className="w-[250px] min-w-[200px]">Actor</TableHead>
              <TableHead className="w-[150px] min-w-[150px] whitespace-nowrap">
                IP Address
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/25">
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`font-mono font-medium text-[10px] uppercase whitespace-nowrap ${getActionColor(
                      log.action,
                    )}`}
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col truncate">
                    <span className="font-medium text-foreground truncate">
                      {log.actor_name || "Unknown"}
                    </span>
                    {log.actor_email && (
                      <span className="text-xs text-muted-foreground truncate">
                        {log.actor_email}
                      </span>
                    )}
                    {log.actor_type === "machine" && (
                      <span className="text-xs text-primary font-mono truncate">
                        Service Token
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                  {log.ip_address || "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 bg-card rounded-xl border shadow-sm flex flex-col gap-3"
          >
            <div className="flex flex-wrap justify-between items-start gap-2">
              <Badge
                variant="secondary"
                className={`font-mono font-medium text-[10px] uppercase ${getActionColor(
                  log.action,
                )}`}
              >
                {log.action}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
              </span>
            </div>

            <div className="flex flex-col bg-muted/40 rounded-lg p-3">
              <span className="font-medium text-sm text-foreground truncate">
                {log.actor_name || "Unknown"}
              </span>
              <div className="flex items-center gap-2 text-xs truncate">
                {log.actor_email && (
                  <span className="text-muted-foreground truncate">
                    {log.actor_email}
                  </span>
                )}
                {log.actor_type === "machine" && (
                  <span className="text-primary font-mono truncate">
                    Service Token
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex gap-2">
              <span className="font-medium opacity-70">IP:</span>
              <span className="font-mono">{log.ip_address || "N/A"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
