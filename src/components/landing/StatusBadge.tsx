"use client";

import { getComponents, getIncidents } from "@/actions/status";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Component {
  status: string;
}

interface Incident {
  status: string;
}

export function StatusBadge() {
  const [status, setStatus] = useState<
    "loading" | "operational" | "degraded" | "outage" | "maintenance"
  >("loading");

  useEffect(() => {
    async function fetchData() {
      try {
        const [components, incidents] = await Promise.all([
          getComponents(),
          getIncidents(5),
        ]);

        const activeIncidents =
          incidents?.filter(
            (i: Incident) => (i as Incident).status !== "resolved",
          ) || [];
        const hasActiveIncidents = activeIncidents.length > 0;
        const hasOutage = (components as Component[]).some(
          (c: Component) => c.status === "outage",
        );
        const hasDegraded = (components as Component[]).some(
          (c: Component) => c.status === "degraded",
        );
        const hasMaintenance = (components as Component[]).some(
          (c: Component) => c.status === "maintenance",
        );

        if (hasOutage) setStatus("outage");
        else if (hasActiveIncidents || hasDegraded) setStatus("degraded");
        else if (hasMaintenance) setStatus("maintenance");
        else setStatus("operational");
      } catch (error) {
        console.error("Failed to fetch status:", error);
        setStatus("operational");
      }
    }

    fetchData();
  }, []);

  let statusColor = "bg-emerald-500";
  let statusText = "All systems normal";
  let textColor = "text-emerald-500";
  let borderColor = "border-emerald-500/20";
  let bgColor = "bg-emerald-500/10";

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-border/50 bg-muted/20 text-muted-foreground opacity-50 cursor-wait">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
        Checking status...
      </div>
    );
  }

  if (status === "outage") {
    statusColor = "bg-red-500";
    statusText = "Major System Outage";
    textColor = "text-red-500";
    borderColor = "border-red-500/20";
    bgColor = "bg-red-500/10";
  } else if (status === "degraded") {
    statusColor = "bg-amber-500";
    statusText = "Partial System Outage";
    textColor = "text-amber-500";
    borderColor = "border-amber-500/20";
    bgColor = "bg-amber-500/10";
  } else if (status === "maintenance") {
    statusColor = "bg-blue-500";
    statusText = "System Maintenance";
    textColor = "text-blue-500";
    borderColor = "border-blue-500/20";
    bgColor = "bg-blue-500/10";
  }

  return (
    <Link
      href="/status"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${borderColor} ${bgColor} ${textColor} hover:bg-opacity-20 hover:scale-105`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`}
        ></span>
      </span>
      {statusText}.
    </Link>
  );
}
