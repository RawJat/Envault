
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header Skeleton */}
            <header className="border-b bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" disabled>
                            <ArrowLeft style={{ width: '24px', height: '24px' }} />
                        </Button>
                        <div className="flex flex-col space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-3 w-32" />
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
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Desktop View Table Skeleton */}
                <div className="hidden md:block rounded-md border text-card-foreground shadow-sm">
                    <div className="h-12 border-b bg-muted/50 px-4 flex items-center">
                        <div className="grid grid-cols-12 w-full gap-4">
                            <div className="col-span-3 font-medium text-muted-foreground text-sm">Key</div>
                            <div className="col-span-7 font-medium text-muted-foreground text-sm">Value</div>
                            <div className="col-span-2 text-right font-medium text-muted-foreground text-sm">Actions</div>
                        </div>
                    </div>
                    <div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-4 border-b last:border-0 flex items-center h-16">
                                <div className="grid grid-cols-12 w-full gap-4 items-center">
                                    <div className="col-span-3">
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                    <div className="col-span-7 flex items-center space-x-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-6 w-6 rounded-md" />
                                        <Skeleton className="h-6 w-6 rounded-md" />
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile View Skeleton */}
                <div className="md:hidden space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-card text-card-foreground p-4 rounded-xl border shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                            <div className="flex items-center space-x-2 bg-muted/40 p-2 rounded-md h-12">
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
