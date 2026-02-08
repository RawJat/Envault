"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Upload, Download, Settings, Share2, Trash2, Settings as SettingsIcon, LogOut, CornerDownLeft, Keyboard, Copy } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EnvVarTable } from "@/components/editor/env-var-table"
import { VariableDialog } from "@/components/editor/variable-dialog"
import { ImportEnvDialog } from "@/components/editor/import-env-dialog"
import { Project, useEnvaultStore } from "@/lib/store"
import { useReauthStore } from "@/lib/reauth-store"
import { useEffect } from "react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
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
import { signOut } from "@/app/actions"

interface ProjectDetailViewProps {
    project: Project
}

export default function ProjectDetailView({ project }: ProjectDetailViewProps) {
    const params = useParams()
    const projectId = params.id as string
    const router = useRouter()

    // Delete Logic
    const { deleteProject, user } = useEnvaultStore()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState("")
    const [mounted, setMounted] = useState(false)

    const isViewer = project.role === 'viewer'
    const canEdit = project.role === 'owner' || project.role === 'editor'

    useEffect(() => {
        setMounted(true)
    }, [])

    // Listen for global command context
    useEffect(() => {
        const handleOpenAdd = () => {
            if (!canEdit) return
            setIsAddDialogOpen(true)
        }
        const handleDownload = () => {
            const btn = document.getElementById('download-env-btn')
            if (btn) btn.click()
        }
        const handleOpenImport = () => {
            if (!canEdit) return
            setIsImportDialogOpen(true)
        }
        const handleOpenShare = () => {
            if (!canEdit) return
            setShareDialogOpen(true)
        }
        const handleUniversalDelete = () => {
            if (project.role !== 'owner') return
            // Trigger project delete if specifically requested, or suggest selection
            setDeleteDialogOpen(true)
        }

        document.addEventListener('open-new-variable', handleOpenAdd)
        document.addEventListener('universal-new', handleOpenAdd)
        document.addEventListener('universal-download', handleDownload)
        document.addEventListener('universal-import', handleOpenImport)
        document.addEventListener('universal-share', handleOpenShare)
        document.addEventListener('universal-delete', handleUniversalDelete)

        return () => {
            document.removeEventListener('open-new-variable', handleOpenAdd)
            document.removeEventListener('universal-new', handleOpenAdd)
            document.removeEventListener('universal-download', handleDownload)
            document.removeEventListener('universal-import', handleOpenImport)
            document.removeEventListener('universal-share', handleOpenShare)
            document.removeEventListener('universal-delete', handleUniversalDelete)
        }
    }, [project])

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

    const handleCopyProjectName = async () => {
        try {
            await navigator.clipboard.writeText(project.name)
            toast.success("Project name copied to clipboard")
        } catch (err) {
            toast.error("Failed to copy project name")
        }
    }

    const handleDownloadEnv = async () => {
        // Check re-auth
        const { checkReauthRequiredAction } = await import("@/app/reauth-actions")
        const status = await checkReauthRequiredAction()
        if (status.required) {
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

    if (!mounted) {
        return null
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
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <AnimatedThemeToggler />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="[&_svg]:size-5">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShareDialogOpen(true)} disabled={!canEdit}>
                                    <Share2 className="w-4 h-4 mr-2" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteClick} disabled={project.role !== 'owner'}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    <div className="ml-auto hidden md:flex items-center gap-1">
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <NotificationDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full ml-2">
                                    <UserAvatar
                                        user={{
                                            email: user?.email,
                                            avatar: user?.avatar,
                                            firstName: user?.firstName
                                        }}
                                        className="h-8 w-8"
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.firstName || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer flex w-full items-center">
                                        <SettingsIcon className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                        <div className="ml-auto hidden md:flex items-center gap-1">
                                            <Kbd size="xs">G</Kbd>
                                            <Kbd size="xs">O</Kbd>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => document.dispatchEvent(new CustomEvent('open-shortcut-help'))}
                                >
                                    <Keyboard className="mr-2 h-4 w-4" />
                                    <span>Keyboard Shortcuts</span>
                                    <div className="ml-auto hidden md:flex items-center gap-1">
                                        <Kbd size="xs">Shift</Kbd>
                                        <Kbd size="xs">?</Kbd>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 dark:text-red-500 focus:text-red-600 dark:focus:text-red-500 cursor-pointer" onClick={() => {
                                    const { logout } = useEnvaultStore.getState()
                                    logout()
                                    signOut()
                                }}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 sm:gap-0">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Variables ({project.variables.length})</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Button id="download-env-btn" variant="outline" onClick={handleDownloadEnv}>
                            <Download className="w-4 h-4 mr-2" />
                            Download .env
                        </Button>
                        <ImportEnvDialog
                            projectId={projectId}
                            existingVariables={project.variables}
                            open={isImportDialogOpen}
                            onOpenChange={setIsImportDialogOpen}
                            trigger={
                                <Button variant="outline" disabled={!canEdit}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import .env
                                </Button>
                            }
                        />
                        <VariableDialog
                            projectId={projectId}
                            existingVariables={project.variables}
                            open={isAddDialogOpen}
                            onOpenChange={setIsAddDialogOpen}
                            trigger={
                                <Button variant="default" disabled={!canEdit}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Variable<Kbd variant="primary" size="xs" className="ml-2">N</Kbd>
                                </Button>
                            }
                        />
                    </div>
                </div>

                <EnvVarTable projectId={projectId} variables={project.variables} userRole={project.role} />
            </main>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{project.name}&quot;? This will permanently delete all environment variables in this project.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="project-delete-confirmation" className="text-sm font-normal">
                            To confirm, type <span className="inline-flex items-center gap-1 font-bold">"{project.name}" <Copy className="h-4 w-4 cursor-pointer hover:text-primary" onClick={handleCopyProjectName} /></span> below:
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Delete
                            <Kbd variant="primary" size="xs"><CornerDownLeft className="h-3 w-3" /></Kbd>
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
