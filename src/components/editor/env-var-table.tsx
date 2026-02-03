"use client"

import * as React from "react"
import { Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, Share2, User } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { toast } from "sonner"
import { ShareSecretModal } from "@/components/dashboard/share-secret-modal"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { EnvironmentVariable, useEnvaultStore } from "@/lib/store"
import { VariableDialog } from "./variable-dialog"
import { deleteVariable as deleteVariableAction } from "@/app/project-actions"
import { useRouter } from "next/navigation"
import { useReauthStore } from "@/lib/reauth-store"

interface EnvVarTableProps {
    projectId: string
    variables: EnvironmentVariable[]
}

export function EnvVarTable({ projectId, variables }: EnvVarTableProps) {
    const [editingVariable, setEditingVariable] = React.useState<EnvironmentVariable | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [variableToDelete, setVariableToDelete] = React.useState<string | null>(null)
    const router = useRouter()

    // Local state for visibility toggles map: variableId -> boolean (true = visible)
    const [visibleSecrets, setVisibleSecrets] = React.useState<Record<string, boolean>>({})
    const [sharingSecret, setSharingSecret] = React.useState<EnvironmentVariable | null>(null)

    const toggleVisibility = async (id: string, isCurrentlyVisible: boolean) => {
        if (!isCurrentlyVisible) {
            // We are about to show it. Check re-auth
            const { checkReauthRequiredAction } = await import("@/app/reauth-actions")
            const reauthRequired = await checkReauthRequiredAction()

            if (reauthRequired) {
                useReauthStore.getState().openReauth(() => toggleVisibility(id, isCurrentlyVisible))
                return
            }
        }
        setVisibleSecrets(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
    }

    const handleDeleteClick = (id: string) => {
        setVariableToDelete(id)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!variableToDelete) return

        const result = await deleteVariableAction(variableToDelete, projectId)
        if (result.error) {
            if (result.error === 'REAUTH_REQUIRED') {
                useReauthStore.getState().openReauth(() => handleDeleteConfirm())
                return
            }
            toast.error(result.error)
            return
        }
        toast.success("Variable deleted")
        setDeleteDialogOpen(false)
        setVariableToDelete(null)
        router.refresh()
    }

    return (
        <>
            {/* Desktop View */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px] w-[300px]">Key</TableHead>
                            <TableHead className="min-w-[300px]">Value</TableHead>
                            <TableHead className="min-w-[200px]">Last Updated</TableHead>
                            <TableHead className="w-[100px] text-right min-w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variables.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No variables added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            variables.map((variable) => {
                                const isVisible = !variable.isSecret || visibleSecrets[variable.id];
                                return (
                                    <TableRow key={variable.id}>
                                        <TableCell className="font-mono font-medium">{variable.key}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2 container-type-normal">
                                                <div className="font-mono text-sm break-all line-clamp-1 max-w-[400px]">
                                                    {isVisible ? variable.value : "••••••••••••••••"}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() =>
                                                        variable.isSecret ? toggleVisibility(variable.id, !!visibleSecrets[variable.id]) : copyToClipboard(variable.value)
                                                    }
                                                >
                                                    {variable.isSecret ? (
                                                        isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />
                                                    ) : (
                                                        null
                                                    )}
                                                </Button>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => copyToClipboard(variable.value)}
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Copy Value</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                </TooltipProvider>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {variable.lastUpdatedAt ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center space-x-2 cursor-help">
                                                                {variable.userInfo?.updater?.email ? (
                                                                    <UserAvatar
                                                                        className="h-6 w-6"
                                                                        user={{
                                                                            email: variable.userInfo.updater.email,
                                                                            avatar: variable.userInfo.updater.avatar,
                                                                            name: variable.userInfo.updater.email
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium leading-none">
                                                                        {variable.userInfo?.updater?.email
                                                                            ? `${variable.userInfo.updater.email.split('@')[0]}` // Or simpler display
                                                                            : "Former Member"}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {formatDistanceToNow(new Date(variable.lastUpdatedAt), { addSuffix: true })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="p-3 text-xs space-y-2">
                                                            {variable.userInfo?.creator && (
                                                                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                                    <span className="text-muted-foreground">Created by:</span>
                                                                    <div className="flex items-center space-x-2">
                                                                        <UserAvatar
                                                                            className="h-4 w-4"
                                                                            user={{
                                                                                email: variable.userInfo.creator.email,
                                                                                avatar: variable.userInfo.creator.avatar,
                                                                                name: variable.userInfo.creator.email
                                                                            }}
                                                                        />
                                                                        <span>{variable.userInfo.creator.email}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                                <span className="text-muted-foreground">Updated by:</span>
                                                                <div className="flex items-center space-x-2">
                                                                    {variable.userInfo?.updater?.email ? (
                                                                        <>
                                                                            <UserAvatar
                                                                                className="h-4 w-4"
                                                                                user={{
                                                                                    email: variable.userInfo.updater.email,
                                                                                    avatar: variable.userInfo.updater.avatar,
                                                                                    name: variable.userInfo.updater.email
                                                                                }}
                                                                            />
                                                                            <span>{variable.userInfo.updater.email}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span>User Left</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                                                <span className="text-muted-foreground">Time:</span>
                                                                <span>{new Date(variable.lastUpdatedAt).toLocaleString()}</span>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => copyToClipboard(variable.key)}>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Key
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => copyToClipboard(variable.value)}>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Value
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditingVariable(variable)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {variable.isSecret && (
                                                        <DropdownMenuItem onClick={() => setSharingSecret(variable)}>
                                                            <Share2 className="w-4 h-4 mr-2" />
                                                            Share
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(variable.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {
                    variables.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                            No variables added yet.
                        </div>
                    ) : (
                        variables.map((variable) => {
                            const isVisible = !variable.isSecret || visibleSecrets[variable.id];
                            return (
                                <div key={variable.id} className="bg-card text-card-foreground p-4 rounded-xl border shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="font-mono font-medium break-all">{variable.key}</div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => copyToClipboard(variable.key)}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Key
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyToClipboard(variable.value)}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Value
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEditingVariable(variable)}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {variable.isSecret && (
                                                    <DropdownMenuItem onClick={() => setSharingSecret(variable)}>
                                                        <Share2 className="w-4 h-4 mr-2" />
                                                        Share
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(variable.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex items-center space-x-2 bg-muted/40 p-2 rounded-md">
                                        <div className="font-mono text-sm break-all line-clamp-2 flex-1">
                                            {isVisible ? variable.value : "••••••••••••••••"}
                                        </div>
                                        {variable.isSecret && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => toggleVisibility(variable.id, !!visibleSecrets[variable.id])}
                                                >
                                                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => copyToClipboard(variable.value)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-1">
                                        {variable.lastUpdatedAt && (
                                            <span>Updated {formatDistanceToNow(new Date(variable.lastUpdatedAt), { addSuffix: true })}</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )
                }
            </div >

            <VariableDialog
                projectId={projectId}
                existingVariable={editingVariable || undefined}
                existingVariables={variables}
                open={!!editingVariable}
                onOpenChange={(open) => !open && setEditingVariable(null)}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Variable</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this variable? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {
                sharingSecret && (
                    <ShareSecretModal
                        projectId={projectId}
                        secretId={sharingSecret.id}
                        secretKey={sharingSecret.key}
                        open={!!sharingSecret}
                        onOpenChange={(open) => !open && setSharingSecret(null)}
                    />
                )
            }
        </>
    )
}
