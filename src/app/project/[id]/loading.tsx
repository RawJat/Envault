
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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

                {/* Desktop View Table Skeleton */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px] w-[300px]">Key</TableHead>
                                <TableHead className="min-w-[300px]">Value</TableHead>
                                <TableHead className="min-w-[200px]">Last Updated</TableHead>
                                <TableHead className="w-[100px] text-right min-w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-4 w-3/4" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-6 w-6 rounded-md" />
                                            <Skeleton className="h-6 w-6 rounded-md" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-3 w-20" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                            <div className="text-xs text-muted-foreground pt-1">
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
