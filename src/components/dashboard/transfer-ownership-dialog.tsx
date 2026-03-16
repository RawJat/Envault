"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransferOwnershipDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferOwnershipDialog({
  project,
  open,
  onOpenChange,
}: TransferOwnershipDialogProps) {
  const [target, setTarget] = React.useState("");
  const [ownerAction, setOwnerAction] = React.useState<
    "demote_to_editor" | "remove_from_project"
  >("demote_to_editor");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTarget("");
      setOwnerAction("demote_to_editor");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTarget = target.trim();
    if (!trimmedTarget) {
      toast.error("Enter the target user email or user ID.");
      return;
    }

    setIsSubmitting(true);

    const isEmail = trimmedTarget.includes("@");
    const payload = {
      currentOwnerAction: ownerAction,
      ...(isEmail
        ? { targetEmail: trimmedTarget }
        : { targetUserId: trimmedTarget }),
    };

    try {
      const response = await fetch(
        `/api/projects/${project.id}/transfer/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        request?: { expiresAt?: string };
      };

      if (!response.ok) {
        toast.error(data.error || "Failed to initiate ownership transfer.");
        return;
      }

      const expiresAt = data.request?.expiresAt
        ? new Date(data.request.expiresAt).toLocaleString()
        : "48 hours";

      toast.success(`Transfer request sent. It expires on ${expiresAt}.`);
      onOpenChange(false);
    } catch (error) {
      console.error("[transfer-ownership] request failed", error);
      toast.error("Failed to initiate ownership transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg sm:w-full">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Ownership transfer requires recipient consent. The target user must
            explicitly accept before ownership changes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-target">Target User</Label>
            <Input
              id="transfer-target"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="email@example.com or user UUID"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label>After Transfer, My Access</Label>
            <Select
              value={ownerAction}
              onValueChange={(
                value: "demote_to_editor" | "remove_from_project",
              ) => setOwnerAction(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demote_to_editor">
                  Demote me to Editor
                </SelectItem>
                <SelectItem value="remove_from_project">
                  Remove me from project
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !target.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              Request Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
