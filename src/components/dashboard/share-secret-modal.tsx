"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/ui/user-avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { User, X, Plus, CornerDownLeft } from "lucide-react"
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

// Define interface for shares
interface SecretShare {
    id: string
    user_id: string // Keep for API calls, but don't display
    created_at: string
    email?: string
    username?: string
    avatar?: string
}

interface ShareSecretModalProps {
    // projectId unused
    // projectId?: string
    secretId: string
    secretKey: string
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ShareSecretModal({ secretId, secretKey, children, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ShareSecretModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [shares, setShares] = useState<SecretShare[]>([])
    const [fetchLoading, setFetchLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetchShares()
        }
    }, [open])

    const fetchShares = async () => {
        setFetchLoading(true)

        try {
            const { getSecretSharesWithEmails } = await import('@/app/secret-actions')
            const result = await getSecretSharesWithEmails(secretId)

            if (result.error) {
                toast.error(result.error)
            } else {
                setShares(result.shares || [])
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to fetch shares")
        }
        setFetchLoading(false)
    }

    const handleAddShare = async () => {
        // We need to resolve Email -> UserID. 
        // CLIENT CANNOT DO THIS securely without a lookup function/RPC.
        // We need a Server Action: `shareSecret(secretId, email)`.
        // Let's assume we create/import this action.
        setLoading(true)

        try {
            // Import dynamic to avoid breaking if action file not perfect yet
            const { shareSecret } = await import('@/app/secret-actions')
            const result = await shareSecret(secretId, email)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Shared ${secretKey} with ${email}`)
                setEmail("")
                fetchShares()
                // Notify dashboard to refresh projects (sharing a secret makes project shared)
                document.dispatchEvent(new CustomEvent('project-role-changed'))
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to share secret")
        }
        setLoading(false)
    }

    const handleRemoveShare = async (userId: string) => {
        const { unshareSecret } = await import('@/app/secret-actions')
        const result = await unshareSecret(secretId, userId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Access revoked")
            fetchShares()
            // Notify dashboard to refresh projects (unsharing might change shared status)
            document.dispatchEvent(new CustomEvent('project-role-changed'))
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children ? (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            ) : !isControlled ? (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
                </DialogTrigger>
            ) : null}
            <DialogContent className="w-[95vw] max-w-md sm:w-full">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Share Variable: {secretKey}</DialogTitle>
                    <DialogDescription className="text-sm">
                        Grant read-only access to this specific variable.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <form onSubmit={(e) => { e.preventDefault(); handleAddShare() }} className="flex flex-col space-y-2">
                        <Label className="text-sm">Add User by Email</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={loading || !email} className="sm:w-auto">
                                {loading ? "Adding..." : <span className="flex items-center gap-2">Add <span className="flex items-center gap-1"><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">⌘</Kbd><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0"><CornerDownLeft className="w-3 h-3" /></Kbd></span></span>}
                            </Button>
                        </div>
                    </form>

                    <div className="border-t my-2" />

                    <div>
                        <h4 className="text-sm font-medium mb-3">Who has access</h4>
                        {fetchLoading ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3 p-2">
                                    <div className="flex items-center space-x-3 flex-1">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                                <div className="flex items-center justify-between gap-3 p-2">
                                    <div className="flex items-center space-x-3 flex-1">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-3 w-28" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        ) : shares.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No specific shares. Project members still have access.</div>
                        ) : (
                            <div className="space-y-3">
                                {shares.map(share => (
                                    <div key={share.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <UserAvatar 
                                                email={share.email}
                                                avatar={share.avatar}
                                                className="h-8 w-8 shrink-0"
                                            />
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-sm font-medium leading-none truncate">{share.username || share.email || 'User'}</p>
                                                <p className="text-xs text-muted-foreground">Viewer</p>
                                            </div>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Access</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to revoke access to this secret for {share.username || share.email || 'this user'}?
                                                        They will no longer be able to view this variable.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleRemoveShare(share.user_id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Remove Access
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
