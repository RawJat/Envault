"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/app/project-actions";
import { Kbd } from "@/components/ui/kbd";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
});

type ProjectValues = z.infer<typeof projectSchema>;

interface CreateProjectDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
  });

  async function onSubmit(data: ProjectValues) {
    const result = await createProject(data.name);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Project created successfully");
    setOpen(false);
    reset();
    router.push(`/project/${result.data?.slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Project
          <Kbd className="ml-2 h-5 px-1.5 text-[10px] bg-primary-foreground/20 text-primary-foreground border-0">
            N
          </Kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new container for your environment variables.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Project
              <div className="ml-2 flex items-center gap-1">
                <Kbd className="bg-white/20 text-white border-0">⌘</Kbd>
                <Kbd className="bg-white/20 text-white border-0">
                  <CornerDownLeft className="w-3 h-3" />
                </Kbd>
              </div>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
