import DashboardLogic, { ProjectSkeletonGrid } from "@/components/dashboard/dashboard-view";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
    return (
        <Suspense fallback={
            <div className="container mx-auto py-8 px-4 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <ProjectSkeletonGrid />
                </div>
            </ div>
        }>
            <DashboardLogic />
        </Suspense>
    );
}
