"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { User, X, Plus } from "lucide-react"

interface ShareSecretModalProps {
    projectId?: string
    secretId: string
    secretKey: string
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ShareSecretModal({ projectId, secretId, secretKey, children, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ShareSecretModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [shares, setShares] = useState<any[]>([])
    const [fetchLoading, setFetchLoading] = useState(false)

    const fetchShares = async () => {
        setFetchLoading(true)
        const supabase = createClient()

        // Fetch shares
        const { data, error } = await supabase
            .from('secret_shares')
            .select('id, user_id, created_at')
            .eq('secret_id', secretId)

        if (data) {
            setShares(data)
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
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (val) fetchShares()
        }}>
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
                    <div className="flex flex-col space-y-2">
                        <Label className="text-sm">Add User by Email</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddShare} disabled={loading || !email} className="sm:w-auto">
                                {loading ? "Adding..." : "Add"}
                            </Button>
                        </div>
                    </div>

                    <div className="border-t my-2" />

                    <div>
                        <h4 className="text-sm font-medium mb-3">Who has access</h4>
                        {fetchLoading ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : shares.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No specific shares. Project members still have access.</div>
                        ) : (
                            <div className="space-y-3">
                                {shares.map(share => (
                                    <div key={share.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-sm font-medium leading-none truncate">User {share.user_id.slice(0, 4)}...</p>
                                                <p className="text-xs text-muted-foreground">Viewer</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive shrink-0"
                                            onClick={() => handleRemoveShare(share.user_id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
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
