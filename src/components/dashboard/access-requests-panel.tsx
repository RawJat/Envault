"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Check, X, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { approveRequest, rejectRequest } from "@/app/invite-actions"
import { createClient } from "@/lib/supabase/client"
import { AccessRequestSkeleton } from "@/components/notifications/notification-skeleton"

interface AccessRequest {
    id: string
    user_id: string
    project_id: string
    status: string
    created_at: string
    projects: any // Supabase join returns array, we'll handle it
    requester_email?: string
}

export function AccessRequestsPanel() {
    const [requests, setRequests] = useState<AccessRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

    const fetchRequests = async () => {
        setLoading(true)
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch pending requests for projects owned by current user
        const { data, error } = await supabase
            .from('access_requests')
            .select(`
                id,
                user_id,
                project_id,
                status,
                created_at,
                projects!inner(name, user_id)
            `)
            .eq('status', 'pending')
            .eq('projects.user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) {
            // Fetch requester emails using admin client via API
            const requestsWithEmails = await Promise.all(
                data.map(async (request) => {
                    try {
                        const response = await fetch('/api/user-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: request.user_id })
                        })
                        const { email } = await response.json()
                        return { ...request, requester_email: email }
                    } catch {
                        return request
                    }
                })
            )
            setRequests(requestsWithEmails as AccessRequest[])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleApprove = async (requestId: string, projectName: string) => {
        setProcessingIds(prev => new Set(prev).add(requestId))

        const result = await approveRequest(requestId, 'viewer', true)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Access granted to ${projectName}`)
            fetchRequests() // Refresh list
        }

        setProcessingIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(requestId)
            return newSet
        })
    }

    const handleReject = async (requestId: string, projectName: string) => {
        setProcessingIds(prev => new Set(prev).add(requestId))

        const result = await rejectRequest(requestId)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Request rejected for ${projectName}`)
            fetchRequests() // Refresh list
        }

        setProcessingIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(requestId)
            return newSet
        })
    }

    if (loading) {
        return <AccessRequestSkeleton />
    }

    if (requests.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pending Access Requests</CardTitle>
                    <CardDescription>Review and manage access requests to your projects</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">No pending requests</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Pending Access Requests
                    <Badge variant="secondary">{requests.length}</Badge>
                </CardTitle>
                <CardDescription>Review and manage access requests to your projects</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {requests.map((request) => {
                        const isProcessing = processingIds.has(request.id)
                        const projectName = (request.projects as any)?.name || 'Unknown Project'

                        return (
                            <div
                                key={request.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <UserAvatar
                                        className="h-10 w-10"
                                        user={{ email: request.requester_email || "unknown" }}
                                        avatarSeed={request.user_id}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {request.requester_email || `User ${request.user_id.slice(0, 8)}...`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Requesting access to <span className="font-medium">{projectName}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(request.created_at).toLocaleDateString()} at{' '}
                                            {new Date(request.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleApprove(request.id, projectName)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-1" />
                                                Approve
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(request.id, projectName)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <X className="h-4 w-4 mr-1" />
                                                Reject
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
