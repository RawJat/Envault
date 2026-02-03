"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Upload, Download, Settings, Share2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EnvVarTable } from "@/components/editor/env-var-table"
import { VariableDialog } from "@/components/editor/variable-dialog"
import { ImportEnvDialog } from "@/components/editor/import-env-dialog"
import { Project, useEnvaultStore } from "@/lib/store"
import { useReauthStore } from "@/lib/reauth-store"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { deleteProject as deleteProjectAction } from "@/app/project-actions"
import { ShareProjectDialog } from "@/components/dashboard/share-project-dialog"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"

interface ProjectDetailViewProps {
    project: Project
}

export default function ProjectDetailView({ project }: ProjectDetailViewProps) {
    const params = useParams()
    const projectId = params.id as string
    const router = useRouter()

    // Delete Logic
    const deleteProject = useEnvaultStore((state) => state.deleteProject)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState("")

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setDeleteConfirmation("")
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        const result = await deleteProjectAction(project.id)
        if (result.error) {
            if (result.error === 'REAUTH_REQUIRED') {
                useReauthStore.getState().openReauth(() => handleDeleteConfirm())
                return
            }
            toast.error(result.error)
            return
        }
        deleteProject(project.id)
        toast.success("Project deleted")
        setDeleteDialogOpen(false)
        router.push("/dashboard")
    }

    const handleDownloadEnv = async () => {
        // Check re-auth
        const { checkReauthRequiredAction } = await import("@/app/reauth-actions")
        const reauthRequired = await checkReauthRequiredAction()
        if (reauthRequired) {
            useReauthStore.getState().openReauth(() => handleDownloadEnv())
            return
        }

        const content = project.variables
            .map((v) => `${v.key}=${v.value}`)
            .join("\n")

        const blob = new Blob([content], { type: "text/plain" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.env`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft style={{ width: '24px', height: '24px' }} />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="font-bold text-lg">{project.name}</h1>
                            <span className="text-xs text-muted-foreground">Environment Variables</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteClick}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AnimatedThemeToggler />
                        <NotificationDropdown />
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 sm:gap-0">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Variables ({project.variables.length})</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleDownloadEnv}>
                            <Download className="w-4 h-4 mr-2" />
                            Download .env
                        </Button>
                        <ImportEnvDialog
                            projectId={projectId}
                            existingVariables={project.variables}
                            trigger={
                                <Button variant="outline">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import .env
                                </Button>
                            }
                        />
                        <VariableDialog
                            projectId={projectId}
                            existingVariables={project.variables}
                            trigger={
                                <Button variant="default">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Variable
                                </Button>
                            }
                        />
                    </div>
                </div>

                <EnvVarTable projectId={projectId} variables={project.variables} />
            </main>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{project.name}"? This will permanently delete all environment variables in this project.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="project-delete-confirmation" className="text-sm font-normal">
                            To confirm, type <span className="font-bold">{project.name}</span> below:
                        </Label>
                        <Input
                            id="project-delete-confirmation"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder={project.name}
                            className="bg-background"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteConfirmation !== project.name}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ShareProjectDialog
                project={project}
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
            />
        </div>
    )
}
