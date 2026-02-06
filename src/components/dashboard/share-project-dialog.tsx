"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Copy, Share2, Check, CornerDownLeft } from "lucide-react"
import { MemberSkeleton } from "@/components/notifications/notification-skeleton"
import { inviteUser, approveRequest, rejectRequest, updateMemberRole, removeMember } from "@/app/invite-actions"
import { Project } from "@/lib/store"
import { ShareConfirmationDialog, PendingChange } from "./share-confirmation-dialog"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { Kbd } from "@/components/ui/kbd"
import { getModifierKey } from "@/lib/utils"

interface ShareProjectDialogProps {
    project: Project
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

interface Member {
    id: string
    user_id: string
    role: 'owner' | 'viewer' | 'editor'
    created_at: string
    email?: string
    avatar?: string
}

interface PendingRequest {
    id: string
    user_id: string
    project_id: string
    status: string
    created_at: string
    email?: string
    avatar?: string
}

export function ShareProjectDialog({ project, children, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ShareProjectDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const [membersLoading, setMembersLoading] = useState(false)

    // Track pending changes
    const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [applying, setApplying] = useState(false)

    const isOwner = project.role === 'owner' || !project.role
    const hasChanges = pendingChanges.size > 0

    useEffect(() => {
        if (open) {
            fetchMembersAndRequests()
        }
    }, [open])

    const fetchMembersAndRequests = async () => {
        setMembersLoading(true)
        try {
            const response = await fetch(`/api/project-members?projectId=${project.id}`)
            if (!response.ok) {
                throw new Error('Failed to fetch members')
            }
            const { members, requests } = await response.json()
            setMembers(members)
            setPendingRequests(requests)
        } catch (error) {
            console.error('Failed to fetch members and requests:', error)
        } finally {
            setMembersLoading(false)
            setPendingChanges(new Map()) // Reset changes on refresh
        }
    }

    const handleInvite = async () => {
        if (!email) return
        setLoading(true)

        const result = await inviteUser(project.id, email)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Invitation sent!")
            setEmail("")
        }
        setLoading(false)
    }

    const handleCopyLink = () => {
        const link = `${window.location.origin}/join/${project.id}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        toast.success("Link copied to clipboard")
        setTimeout(() => setCopied(false), 5000)
    }

    const handleRequestAction = (request: PendingRequest, action: 'pending' | 'approve' | 'deny') => {
        const newChanges = new Map(pendingChanges)

        if (action === 'pending') {
            // Remove change if set back to pending
            newChanges.delete(request.user_id)
        } else {
            newChanges.set(request.user_id, {
                userId: request.user_id,
                type: action,
                currentRole: 'pending',
                newRole: action === 'approve' ? 'viewer' : undefined,
                email: request.email,
                avatar: request.avatar,
                requestId: request.id
            })
        }

        setPendingChanges(newChanges)
    }

    const handleMemberRoleChange = (member: Member, newValue: 'viewer' | 'editor' | 'revoke') => {
        if (member.role === 'owner') return // Secure guard
        const newChanges = new Map(pendingChanges)

        if (newValue === member.role) {
            // Remove change if set back to original
            newChanges.delete(member.user_id)
        } else if (newValue === 'revoke') {
            newChanges.set(member.user_id, {
                userId: member.user_id,
                type: 'revoke',
                currentRole: member.role,
                email: member.email,
                avatar: member.avatar
            })
        } else {
            newChanges.set(member.user_id, {
                userId: member.user_id,
                type: 'role_change',
                currentRole: member.role,
                newRole: newValue,
                email: member.email,
                avatar: member.avatar
            })
        }

        setPendingChanges(newChanges)
    }

    const handleSave = () => {
        setShowConfirmation(true)
    }

    const applyChanges = async () => {
        setApplying(true)
        const changes = Array.from(pendingChanges.values())
        let successCount = 0
        let errorCount = 0

        for (const change of changes) {
            try {
                switch (change.type) {
                    case 'approve':
                        await approveRequest(change.requestId!, 'viewer', true)
                        break
                    case 'deny':
                        await rejectRequest(change.requestId!)
                        break
                    case 'role_change':
                        await updateMemberRole(project.id, change.userId, change.newRole!)
                        break
                    case 'revoke':
                        await removeMember(project.id, change.userId)
                        break
                }
                successCount++
            } catch (error) {
                console.error('Failed to apply change:', error)
                errorCount++
            }
        }

        setApplying(false)
        setShowConfirmation(false)

        if (errorCount === 0) {
            toast.success(`Successfully applied ${successCount} change${successCount !== 1 ? 's' : ''}`)
        } else {
            toast.error(`Applied ${successCount} changes, ${errorCount} failed`)
        }

        await fetchMembersAndRequests()

        // Notify dashboard to refresh projects
        document.dispatchEvent(new CustomEvent('project-role-changed'))
    }

    const getCurrentValue = (userId: string, originalValue: string | undefined): string => {
        const change = pendingChanges.get(userId)
        if (!change) return originalValue || ""

        if (change.type === 'approve') return 'approve'
        if (change.type === 'deny') return 'deny'
        if (change.type === 'revoke') return 'revoke'
        if (change.type === 'role_change') return change.newRole!

        return originalValue || ""
    }

    // Shortcut for saving changes
    useHotkeys("mod+s", (e) => {
        if (open && isOwner && hasChanges) {
            e.preventDefault()
            handleSave()
        }
    }, { enableOnContentEditable: true, enableOnFormTags: true })

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                {children ? (
                    <DialogTrigger asChild>
                        {children}
                    </DialogTrigger>
                ) : !isControlled ? (
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
                    </DialogTrigger>
                ) : null}
                <DialogContent className="w-[95vw] max-w-md sm:w-full">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">Share {project.name}</DialogTitle>
                        <DialogDescription className="text-sm">
                            Invite collaborators to this project.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="invite" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="invite">Invite</TabsTrigger>
                            <TabsTrigger value="members">
                                Members
                                {pendingRequests.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="invite" className="space-y-4 pt-4">
                            <div className="flex flex-row gap-2">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">Link</Label>
                                    <Input
                                        id="link"
                                        defaultValue={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${project.id}`}
                                        readOnly
                                        className="text-xs sm:text-sm"
                                    />
                                </div>
                                <Button size="icon" variant="secondary" onClick={handleCopyLink} className="shrink-0">
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>

                            <div className="border-t my-4" />

                            <form onSubmit={(e) => { e.preventDefault(); handleInvite() }} className="flex flex-col space-y-2">
                                <Label className="text-sm">Invite by Email</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        placeholder="colleague@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" disabled={loading || !email} className="sm:w-auto">
                                        {loading ? "Sending..." : <span className="flex items-center gap-2">Send Invitation <span className="flex items-center gap-1"><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">{getModifierKey('mod')}</Kbd><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0"><CornerDownLeft className="w-3 h-3" /></Kbd></span></span>}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="members" className="pt-4 space-y-4">
                            <div className="space-y-4">
                                {membersLoading ? (
                                    <MemberSkeleton />
                                ) : (members.length === 0 && pendingRequests.length === 0) ? (
                                    <div className="text-sm text-muted-foreground text-center py-8">No members yet.</div>
                                ) : (
                                    <>
                                        {/* Pending Requests */}
                                        {pendingRequests.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium">Pending Requests</h4>
                                                <div className="grid gap-2">
                                                    {pendingRequests.map((request) => (
                                                        <div key={request.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-muted/30">
                                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                                <UserAvatar
                                                                    className="h-8 w-8 shrink-0"
                                                                    user={{ email: request.email || "unknown", avatar: request.avatar }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium leading-none truncate">
                                                                        {request.email || 'Unknown User'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isOwner && (
                                                                <Select
                                                                    value={getCurrentValue(request.user_id, 'pending')}
                                                                    onValueChange={(value: 'pending' | 'approve' | 'deny') =>
                                                                        handleRequestAction(request, value)
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-full sm:w-32">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="pending">Pending</SelectItem>
                                                                        <SelectItem value="approve">Approve</SelectItem>
                                                                        <SelectItem value="deny">Deny</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Active Members */}
                                        {members.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium">Active Members</h4>
                                                <div className="grid gap-2">
                                                    {members.map((member) => (
                                                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg">
                                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                                <UserAvatar
                                                                    className="h-8 w-8 shrink-0"
                                                                    user={{ email: member.email || "unknown", avatar: member.avatar }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium leading-none truncate">
                                                                        {member.email || 'Unknown User'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isOwner && member.role !== 'owner' ? (
                                                                <Select
                                                                    value={getCurrentValue(member.user_id, member.role)}
                                                                    onValueChange={(value: 'viewer' | 'editor' | 'revoke') =>
                                                                        handleMemberRoleChange(member, value)
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-full sm:w-32">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                                        <SelectItem value="editor">Editor</SelectItem>
                                                                        <SelectItem value="revoke">Revoke</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Badge variant="outline" className="capitalize">
                                                                    {member.role}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Save Button */}
                                        {isOwner && (
                                            <Button
                                                className="w-full"
                                                onClick={handleSave}
                                                disabled={!hasChanges}
                                            >
                                                Save Changes <span className="ml-2 flex items-center gap-1"><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">{getModifierKey('mod')}</Kbd><Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">S</Kbd></span>
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <ShareConfirmationDialog
                open={showConfirmation}
                onOpenChange={setShowConfirmation}
                changes={Array.from(pendingChanges.values())}
                onConfirm={applyChanges}
                loading={applying}
            />
        </>
    )
}
