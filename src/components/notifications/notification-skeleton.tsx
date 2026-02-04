import { Skeleton } from "@/components/ui/skeleton"

export function NotificationSkeleton() {
    return (
        <div className="flex items-start p-4 gap-3 border-b">
            <Skeleton className="h-5 w-5 bg-muted rounded-full shrink-0 mt-1" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-3 w-full bg-muted" />
            </div>
            <Skeleton className="h-3 w-12 bg-muted shrink-0" />
        </div>
    )
}

export function NotificationListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Toolbar Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 bg-card p-3 sm:p-4 rounded-lg">
                <Skeleton className="h-10 w-full sm:w-1/2 bg-muted" />
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="h-9 w-24 bg-muted" />
                    <Skeleton className="h-9 w-24 bg-muted" />
                </div>
            </div>

            {/* Table/Card Skeleton */}
            <div className="border rounded-lg overflow-hidden bg-card">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center p-4 border-b last:border-0 gap-4">
                        <Skeleton className="h-4 w-4 bg-muted shrink-0" />
                        <Skeleton className="h-8 w-8 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3 bg-muted" />
                            <Skeleton className="h-3 w-2/3 bg-muted" />
                        </div>
                        <Skeleton className="h-4 w-20 bg-muted shrink-0" />
                        <Skeleton className="h-8 w-8 bg-muted shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function PreferencesSkeleton() {
    return (
        <div className="space-y-6">
            {/* Repeat for cards */}
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <Skeleton className="h-6 w-48 bg-muted" />
                        <Skeleton className="h-4 w-72 bg-muted" />
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Skeleton className="h-4 w-32 bg-muted" />
                                    <Skeleton className="h-3 w-56 bg-muted" />
                                </div>
                                <Skeleton className="h-6 w-11 rounded-full bg-muted" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function AccessRequestSkeleton() {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
                <Skeleton className="h-6 w-48 bg-muted" />
                <Skeleton className="h-4 w-72 bg-muted" />
            </div>
            <div className="p-6 pt-0 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48 bg-muted" />
                                <Skeleton className="h-3 w-64 bg-muted" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20 bg-muted" />
                            <Skeleton className="h-9 w-20 bg-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function MemberSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32 bg-muted" />
                    </div>
                    <Skeleton className="h-8 w-24 bg-muted shrink-0" />
                </div>
            ))}
        </div>
    )
}
