"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormattedDateProps {
  date: Date | string | number;
  formatStr: string;
  className?: string;
}

export function FormattedDate({
  date,
  formatStr,
  className,
}: FormattedDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Skeleton
        className={cn("h-4 w-24 inline-block align-middle", className)}
      />
    );
  }

  return <span className={className}>{format(new Date(date), formatStr)}</span>;
}
