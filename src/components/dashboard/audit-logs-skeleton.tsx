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
    <>
      <div className="hidden md:block rounded-md border min-w-full overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Action</TableHead>
              <TableHead className="w-[250px]">Actor</TableHead>
              <TableHead className="w-[150px]">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-[160px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[100px] rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-3 w-[180px]" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[100px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-card border rounded-lg shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-[100px] rounded-full" />
              <Skeleton className="h-4 w-[120px]" />
            </div>
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-3 w-[180px]" />
            </div>
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ))}
      </div>
    </>
  );
}
