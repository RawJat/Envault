"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pushWithTransition } from "@/lib/utils/view-transition-navigation";

interface TransferRequestActionsProps {
  requestId: string;
  projectId: string;
  projectName: string;
}

export function TransferRequestActions({
  requestId,
  projectId,
  projectName,
}: TransferRequestActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState<"accept" | "reject" | null>(
    null,
  );

  const submitAction = async (action: "accept" | "reject") => {
    setIsPending(action);

    try {
      const response = await fetch(`/api/projects/${projectId}/transfer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferRequestId: requestId }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        toast.error(body.error || `Failed to ${action} transfer request.`);
        return;
      }

      toast.success(
        action === "accept"
          ? `You are now the owner of ${projectName}.`
          : `Transfer request for ${projectName} was rejected.`,
      );

      pushWithTransition(router, "/dashboard", "nav-back");
      router.refresh();
    } catch (error) {
      console.error(`[transfer:${action}] request failed`, error);
      toast.error(`Failed to ${action} transfer request.`);
    } finally {
      setIsPending(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Button
        variant="outline"
        className="w-full sm:flex-1 h-11"
        disabled={isPending !== null}
        onClick={() => submitAction("reject")}
      >
        {isPending === "reject" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Rejecting...
          </>
        ) : (
          "Reject"
        )}
      </Button>
      <Button
        className="w-full sm:flex-1 h-11"
        disabled={isPending !== null}
        onClick={() => submitAction("accept")}
      >
        {isPending === "accept" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Accepting...
          </>
        ) : (
          "Accept Transfer"
        )}
      </Button>
    </div>
  );
}
