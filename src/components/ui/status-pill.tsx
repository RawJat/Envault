import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type StatusLevel } from "@/lib/status-config";

interface StatusPillProps {
  level: StatusLevel;
  /**
   * "md" - full-size pill used on the status page hero (default)
   * "sm" - compact pill used inside the top banner
   */
  size?: "md" | "sm";
  className?: string;
}

export function StatusPill({ level, size = "md", className }: StatusPillProps) {
  const cfg = STATUS_CONFIG[level];
  const Icon = cfg.icon;

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm",
          "px-3 py-1 text-xs font-semibold tracking-tight",
          cfg.bg,
          cfg.border,
          cfg.color,
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0 animate-pulse" />
        {cfg.label}.
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-full border backdrop-blur-sm",
        cfg.bgBorder,
        className,
      )}
    >
      <Icon
        className={cn("w-5 h-5 md:w-6 md:h-6 animate-pulse", cfg.color)}
      />
      <span className={cn("text-base md:text-lg font-bold tracking-tight", cfg.color)}>
        {cfg.label}.
      </span>
    </div>
  );
}
