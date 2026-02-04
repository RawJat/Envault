"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Folder, MoreVertical, Trash2, CornerDownLeft } from "lucide-react"
import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Project, useEnvaultStore } from "@/lib/store"
import { toast } from "sonner"
import { deleteProject as deleteProjectAction } from "@/app/project-actions"
import { useReauthStore } from "@/lib/reauth-store"
import { ShareProjectDialog } from "@/components/dashboard/share-project-dialog"
import { Share2 } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { getModifierKey } from "@/lib/utils"

interface ProjectCardProps {
    project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
    const deleteProject = useEnvaultStore((state) => state.deleteProject)
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [shareDialogOpen, setShareDialogOpen] = React.useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
    const router = useRouter()

    const handleDeleteClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setDeleteConfirmation("")
        setDeleteDialogOpen(true)
    }

    // Listen for contextual shortcuts
    React.useEffect(() => {
        const handleUniversalShare = () => {
            // If this card is focused or has a focused element within it
            if (document.activeElement?.closest(`a[href="/project/${project.id}"]`)) {
                setShareDialogOpen(true)
            }
        }
        const handleUniversalDelete = () => {
            if (document.activeElement?.closest(`a[href="/project/${project.id}"]`)) {
                handleDeleteClick()
            }
        }

        document.addEventListener('universal-share', handleUniversalShare)
        document.addEventListener('universal-delete', handleUniversalDelete)
        return () => {
            document.removeEventListener('universal-share', handleUniversalShare)
            document.removeEventListener('universal-delete', handleUniversalDelete)
        }
    }, [project.id])

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
        router.refresh()
    }

    return (
        <>
            <Link href={`/project/${project.id}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-all">
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md group relative overflow-hidden">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                    <Folder className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                            </div>
                            <div className="flex items-center" onClick={(e) => e.preventDefault()}>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation()
                                            setShareDialogOpen(true)
                                        }}>
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Share<Kbd variant="outline" size="xs" className="ml-auto hidden md:inline-flex">A</Kbd>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600 dark:text-red-500 focus:text-red-600 dark:focus:text-red-500" onClick={handleDeleteClick}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                            <div className="ml-auto hidden md:flex items-center gap-1">
                                                <Kbd variant="outline" size="xs">{getModifierKey('ctrl')}</Kbd>
                                                <Kbd variant="outline" size="xs">X</Kbd>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="absolute bottom-0 w-full bg-muted/20 border-t p-3">
                        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                            <span>{project.secretCount ?? project.variables.length} variables</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="cursor-help">{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{new Date(project.createdAt).toLocaleString()}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </CardFooter>
                    <div className="h-12" /> {/* Spacer for footer */}
                </Card>
            </Link>

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
        </>
    )
}
