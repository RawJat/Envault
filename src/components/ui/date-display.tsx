"use client";

import { formatDistanceToNow, format } from "date-fns";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DateDisplayProps {
  date: Date | string | number;
  formatType?: "relative" | "absolute" | "date" | "time";
  addSuffix?: boolean;
  className?: string;
}

export function DateDisplay({
  date,
  formatType = "absolute",
  addSuffix = false,
  className,
}: DateDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Skeleton
        className={cn("h-4 w-24 inline-block align-middle", className)}
      />
    );
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return <span className={className}>Invalid date</span>;
  }

  const isCurrentYear = parsedDate.getFullYear() === new Date().getFullYear();
  const baseDateFormat = isCurrentYear ? "MMM dd" : "MMM dd, yyyy";
  const timeFormat = "hh:mm a";

  let displayString = "";

  switch (formatType) {
    case "relative":
      displayString = formatDistanceToNow(parsedDate, { addSuffix });
      break;
    case "absolute":
      displayString = format(
        parsedDate,
        `${baseDateFormat}',' ${timeFormat}`,
      );
      break;
    case "date":
      displayString = format(parsedDate, baseDateFormat);
      break;
    case "time":
      displayString = format(parsedDate, timeFormat);
      break;
  }

  return <span className={className}>{displayString}</span>;
}
