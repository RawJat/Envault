import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EnvVarTableSkeleton } from "@/components/editor/env-var-table-skeleton";
import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft style={{ width: "24px", height: "24px" }} />
            </Button>
            <div className="flex flex-col">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 sm:gap-0">
          <div>
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        <EnvVarTableSkeleton />
      </main>
    </div>
  );
}
