"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VercelIntegrationDropdown } from "@/components/integrations/VercelIntegrationDropdown";
import { Project } from "@/lib/stores/store";
import { Triangle } from "lucide-react";

interface VercelIntegrationDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VercelIntegrationDialog({
  project,
  open,
  onOpenChange,
}: VercelIntegrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:w-full flex flex-col max-h-[90dvh] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Triangle className="h-5 w-5 fill-current" strokeWidth={0} />
            Vercel Integration
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed mt-2">
            Link this Envault project directly to a Vercel project for native
            Zero-Knowledge synchronization.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4 space-y-4">
          <VercelIntegrationDropdown
            envaultProjectId={project.id}
            uiMode={project.ui_mode}
            defaultEnvironmentSlug={project.default_environment_slug}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
