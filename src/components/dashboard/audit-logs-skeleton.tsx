import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AuditLogsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:w-[220px]" />
        <Skeleton className="h-9 w-full sm:w-[220px]" />
      </div>

      <div className="hidden md:block rounded-md border bg-card min-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]" />
              <TableHead className="w-[200px]">Timestamp</TableHead>
              <TableHead className="w-[170px]">Action</TableHead>
              <TableHead className="w-[250px]">Actor</TableHead>
              <TableHead className="min-w-[260px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-7 w-7 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[170px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[120px] rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-3 w-[180px]" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[220px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 bg-card border rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-6 w-[120px] rounded-full" />
              </div>
              <Skeleton className="h-4 w-[110px]" />
            </div>
            <div className="flex flex-col space-y-2 bg-muted/40 rounded-lg p-3">
              <Skeleton className="h-4 w-[130px]" />
              <Skeleton className="h-3 w-[170px]" />
            </div>
            <Skeleton className="h-4 w-[220px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
