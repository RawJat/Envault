import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { RegMark } from "@/components/landing/RegMark";
import { getComponents, getIncidents } from "@/actions/status";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Timeline,
  TimelineItem,
  TimelineHeader,
  TimelineSeparator,
  TimelineIcon,
  TimelineBody,
} from "@/components/ui/timeline";
import { CheckCircle2, AlertTriangle, XCircle, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

import { FormattedDate } from "@/components/ui/formatted-date";

export const revalidate = 300; // 5 minutes ISR

export default async function StatusPage() {
  const components = await getComponents();
  const allIncidents = await getIncidents(20);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeIncidents = allIncidents.filter(
    (i: any) => i.status !== "resolved",
  );
  const pastIncidents = allIncidents.filter(
    (i: any) => i.status === "resolved",
  );

  const hasActiveIncidents = activeIncidents.length > 0;
  const hasOutage = components.some((c: any) => c.status === "outage");
  const hasDegraded = components.some((c: any) => c.status === "degraded");
  const hasMaintenance = components.some(
    (c: any) => c.status === "maintenance",
  );

  let statusColor = "text-emerald-500";
  let statusBg = "bg-emerald-500/10 border-emerald-500/20";
  let statusText = "All Systems Operational";
  let StatusIcon = CheckCircle2;
  let statusMessage = "All services are running smoothly.";

  if (hasOutage) {
    statusColor = "text-red-500";
    statusBg = "bg-red-500/10 border-red-500/20";
    statusText = "Major System Outage";
    StatusIcon = XCircle;
    statusMessage =
      "We are currently experiencing a major outage. Our team is investigating.";
  } else if (hasActiveIncidents || hasDegraded) {
    statusColor = "text-amber-500";
    statusBg = "bg-amber-500/10 border-amber-500/20";
    statusText = "Partial System Outage";
    StatusIcon = AlertTriangle;
    statusMessage = "Some systems are experiencing issues.";
  } else if (hasMaintenance) {
    statusColor = "text-blue-500";
    statusBg = "bg-blue-500/10 border-blue-500/20";
    statusText = "System Maintenance";
    StatusIcon = Wrench;
    statusMessage = "Scheduled maintenance is currently in progress.";
  }

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative sharp bg-background text-foreground">
      <Navbar user={user} />

      <main className="flex-1 relative pt-24 md:pt-32 pb-16 md:pb-24 px-4 md:px-6">
        <RegMark position="top-left" />
        <RegMark position="top-right" />

        <div className="max-w-4xl mx-auto space-y-16 relative z-10">
          {/* Hero Status Section */}
          <div className="text-center space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div
              className={cn(
                "inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-full border backdrop-blur-sm",
                statusBg,
              )}
            >
              <StatusIcon
                className={cn(
                  "w-5 h-5 md:w-6 md:h-6 animate-pulse",
                  statusColor,
                )}
              />
              <span
                className={cn(
                  "text-base md:text-lg font-bold tracking-tight",
                  statusColor,
                )}
              >
                {statusText}.
              </span>
            </div>

            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto px-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium tracking-tight">
                Real-time System Status
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {statusMessage}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground/60 font-mono">
                Last updated:{" "}
                <FormattedDate
                  className="text-xs md:text-sm text-muted-foreground/60 font-mono"
                  date={new Date()}
                  formatStr="MMM d, h:mm:ss a"
                />
              </p>
            </div>
          </div>

          {/* Active Incidents Banner */}
          {activeIncidents.length > 0 && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="flex items-center gap-2 md:gap-3">
                <h2 className="text-xl md:text-2xl font-serif whitespace-nowrap">
                  Active Incidents
                </h2>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="grid gap-4 md:gap-6">
                {activeIncidents.map((incident: any) => (
                  <div
                    key={incident.id}
                    className="group relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-4 md:p-6 shadow-sm transition-all hover:shadow-md hover:border-destuctive/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative space-y-3 md:space-y-4">
                      <div className="flex flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                          <div className="flex h-7 items-center shrink-0">
                            <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
                          </div>
                          <h3 className="text-lg md:text-xl font-bold break-words">
                            {incident.title}
                          </h3>
                        </div>
                        <Badge
                          variant={
                            incident.severity === "critical"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs shrink-0 self-start"
                        >
                          {incident.status.charAt(0).toUpperCase() +
                            incident.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-3 md:space-y-4 pl-0 sm:pl-9">
                        <div className="prose dark:prose-invert max-w-none text-sm md:text-base">
                          <Timeline>
                            {incident.incident_updates.map(
                              (update: any, idx: number) => (
                                <TimelineItem
                                  key={update.id}
                                  className="group pb-0"
                                >
                                  <TimelineHeader className="relative w-4 md:w-5 items-center shrink-0">
                                    {idx !==
                                      incident.incident_updates.length - 1 && (
                                      <TimelineSeparator className="w-px bg-border top-0 left-1/2 -translate-x-1/2 h-full" />
                                    )}
                                    <TimelineIcon className="bg-background border-2 border-border size-4 md:size-5 p-0 z-10 shrink-0">
                                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground" />
                                    </TimelineIcon>
                                  </TimelineHeader>
                                  <TimelineBody
                                    className={cn(
                                      "pl-3 md:pl-4",
                                      idx ===
                                        incident.incident_updates.length - 1
                                        ? "pb-2"
                                        : "pb-4",
                                    )}
                                  >
                                    <div className="space-y-2">
                                      <div className="flex flex-row sm:items-baseline gap-1 sm:gap-3">
                                        <span className="text-xs font-mono text-muted-foreground">
                                          <FormattedDate
                                            className="text-xs font-mono text-muted-foreground"
                                            date={update.created_at}
                                            formatStr="MMM d, h:mm a"
                                          />
                                        </span>
                                        <span className="text-xs font-mono tracking-wider text-muted-foreground">
                                          {update.status
                                            .charAt(0)
                                            .toUpperCase() +
                                            update.status.slice(1)}
                                        </span>
                                      </div>
                                      <p className="text-sm md:text-base text-foreground/90 leading-relaxed break-words">
                                        {update.message}
                                      </p>
                                    </div>
                                  </TimelineBody>
                                </TimelineItem>
                              ),
                            )}
                          </Timeline>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Components Grid */}
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-xl md:text-2xl font-serif whitespace-nowrap">
                System Components
              </h2>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {components.map((component: any) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all shrink-0",
                        component.status === "operational"
                          ? "bg-emerald-500 ring-emerald-500/20"
                          : component.status === "degraded"
                            ? "bg-amber-500 ring-amber-500/20"
                            : component.status === "outage"
                              ? "bg-red-500 ring-red-500/20"
                              : "bg-blue-500 ring-blue-500/20",
                      )}
                    />
                    <span className="font-medium group-hover:translate-x-1 transition-transform text-sm md:text-base truncate">
                      {component.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground shrink-0">
                    <span className="capitalize inline">
                      {component.status.replace("-", " ")}
                    </span>
                    {component.status === "operational" && (
                      <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    {component.status === "degraded" && (
                      <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500" />
                    )}
                    {component.status === "outage" && (
                      <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                    )}
                    {component.status === "maintenance" && (
                      <Wrench className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Incidents */}
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-xl md:text-2xl font-serif whitespace-nowrap">
                Past Incidents
              </h2>
              <div className="h-px bg-border flex-1" />
            </div>

            {pastIncidents.length === 0 ? (
              <div className="p-6 md:p-8 text-center rounded-lg border border-dashed bg-muted/20">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 mx-auto text-muted-foreground mb-2 md:mb-3 opacity-50" />
                <p className="text-sm md:text-base text-muted-foreground">
                  No incidents reported in the past 90 days.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-4">
                {pastIncidents.map((incident: any) => (
                  <AccordionItem
                    key={incident.id}
                    value={incident.id}
                    className="border rounded-lg bg-card/20 px-3 md:px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3 md:py-4">
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 text-left w-full">
                        {/* Date row - always on first line */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              incident.severity === "minor"
                                ? "bg-blue-500"
                                : "bg-orange-500",
                            )}
                          />
                          <span className="text-xs md:text-sm font-mono text-muted-foreground shrink-0">
                            <FormattedDate
                              className="text-xs md:text-sm font-mono text-muted-foreground"
                              date={incident.created_at}
                              formatStr="MMM d, yyyy"
                            />
                          </span>
                        </div>
                        {/* Title + Badge row - wraps to second line on mobile, stays inline on sm+ */}
                        <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto pl-3.5 sm:pl-0">
                          <span className="font-medium flex-1 text-sm md:text-base break-words min-w-0">
                            {incident.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="mr-2 font-normal text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0"
                          >
                            {incident.status.charAt(0).toUpperCase() +
                              incident.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-4 md:pb-6 px-1">
                      <Timeline>
                        {incident.incident_updates.map(
                          (update: any, idx: number) => (
                            <TimelineItem
                              key={update.id}
                              className="group pb-0"
                            >
                              <TimelineHeader className="relative w-4 md:w-5 items-center shrink-0">
                                {idx !==
                                  incident.incident_updates.length - 1 && (
                                  <TimelineSeparator className="w-px bg-border top-0 left-1/2 -translate-x-1/2 h-full" />
                                )}
                                <TimelineIcon className="bg-background border-2 border-border size-4 md:size-5 p-0 z-10 shrink-0">
                                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground" />
                                </TimelineIcon>
                              </TimelineHeader>
                              <TimelineBody
                                className={cn(
                                  "pl-3 md:pl-4",
                                  idx === incident.incident_updates.length - 1
                                    ? "pb-2"
                                    : "pb-4",
                                )}
                              >
                                <div className="space-y-2">
                                  <div className="flex flex-row sm:items-baseline gap-1 sm:gap-3">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      <FormattedDate
                                        className="text-xs font-mono text-muted-foreground"
                                        date={update.created_at}
                                        formatStr="MMM d, h:mm a"
                                      />
                                    </span>
                                    <span className="text-xs font-mono tracking-wider text-muted-foreground">
                                      {update.status.charAt(0).toUpperCase() +
                                        update.status.slice(1)}
                                    </span>
                                  </div>
                                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed break-words">
                                    {update.message}
                                  </p>
                                </div>
                              </TimelineBody>
                            </TimelineItem>
                          ),
                        )}
                      </Timeline>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>

        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />
      </main>

      <Footer />
    </div>
  );
}
