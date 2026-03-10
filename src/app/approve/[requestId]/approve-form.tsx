"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { approveRequest, rejectRequest } from "@/app/invite-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ApproveFormProps {
  requestId: string;
  environments?: string[];
}

export function ApproveForm({ requestId, environments = [] }: ApproveFormProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = React.useState(false);
  const [isDenying, setIsDenying] = React.useState(false);
  const [role, setRole] = React.useState<"viewer" | "editor">("viewer");
  const [selectedEnvironments, setSelectedEnvironments] = React.useState<string[]>([]);

  const handleApprove = async () => {
    setIsApproving(true);
    const result = await approveRequest(requestId, role, true, selectedEnvironments);
    if (result.error) {
      toast.error(result.error);
      setIsApproving(false);
      return;
    }
    router.push("/dashboard?approved=true");
  };

  const handleDeny = async () => {
    setIsDenying(true);
    await rejectRequest(requestId);
    router.push("/dashboard?denied=true");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Assign Role</label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as "viewer" | "editor")}
        >
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
          </SelectContent>
        </Select>

        {environments.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-medium">Environment Access</label>
            <div className="flex min-h-[44px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <div className="flex flex-wrap gap-1.5 items-center flex-1">
                {selectedEnvironments.length === 0 && (
                  <span className="text-muted-foreground">None selected</span>
                )}
                {selectedEnvironments.map((env) => (
                  <Badge key={env} variant="secondary" className="pl-2 pr-1 h-6">
                    {env}
                    <button
                      onClick={() => setSelectedEnvironments(prev => prev.filter(e => e !== env))}
                      className="ml-1.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {environments.filter(e => !selectedEnvironments.includes(e)).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="ml-2 h-6 w-6 shrink-0 bg-transparent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {environments.filter(e => !selectedEnvironments.includes(e)).map(env => (
                      <DropdownMenuItem
                        key={env}
                        onClick={() => setSelectedEnvironments(prev => [...prev, env])}
                      >
                        {env}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}

        <Button
          className="w-full h-11 text-base"
          onClick={handleApprove}
          disabled={isApproving || isDenying}
        >
          {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isApproving ? "Approving..." : "Approve Access"}
        </Button>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">OR</span>
        </div>
      </div>

      <Button
        type="button"
        variant="destructive"
        className="w-full h-11 text-base"
        onClick={handleDeny}
        disabled={isApproving || isDenying}
      >
        {isDenying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isDenying ? "Denying..." : "Deny Request"}
      </Button>
    </div>
  );
}
