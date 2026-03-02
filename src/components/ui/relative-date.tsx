"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RelativeDateProps {
    date: Date | string | number;
    addSuffix?: boolean;
    className?: string;
}

export function RelativeDate({
    date,
    addSuffix = false,
    className,
}: RelativeDateProps) {
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

    return (
        <span className={className}>
            {formatDistanceToNow(new Date(date), { addSuffix })}
        </span>
    );
}
