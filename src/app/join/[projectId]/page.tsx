import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createAccessRequest } from '@/app/invite-actions'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ShieldAlert, CheckCircle2, Clock, Lock } from 'lucide-react'

interface JoinPageProps {
    params: Promise<{ projectId: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Redirect to login with return path
        redirect(`/login?next=/join/${projectId}`)
    }

    // Check if user is already a full member (owner or project member)
    // Note: We check for actual membership, not secret shares, because users with secret shares
    // should still be able to request full project access
    const { data: projectData } = await supabase
        .from('projects')
        .select('user_id, name')
        .eq('id', projectId)
        .single()

    let isFullMember = false
    if (projectData && projectData.user_id === user.id) {
        isFullMember = true // Owner
    } else {
        // Check if member
        const { data: member } = await supabase
            .from('project_members')
            .select('role')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .single()
        
        if (member) {
            isFullMember = true // Member
        }
    }

    if (isFullMember) {
        // Already has full access, redirect to project page
        redirect(`/project/${projectId}`)
    }

    // Check if there is already a pending request
    const { data: existingRequest } = await supabase
        .from('access_requests')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()

    if (!projectData) {
        return (
            <AuthLayout>
                <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
                    <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
                        <CardHeader className="text-center space-y-2">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 bg-destructive/10 rounded-full">
                                    <ShieldAlert className="w-10 h-10 text-destructive" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight">Project Not Found</CardTitle>
                            <CardDescription>
                                The project you are trying to join does not exist or has been deleted.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full h-11" variant="outline">
                                <Link href="/dashboard">Return to Dashboard</Link>
                            </Button>
                        </CardContent>
                        <CardFooter className="justify-center text-xs text-muted-foreground">
                            <Lock className="w-3 h-3 mr-1" />
                            End-to-end encrypted environment
                        </CardFooter>
                    </Card>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
                <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
                    <CardHeader className="text-center space-y-2">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                {existingRequest ? (
                                    <Clock className="w-10 h-10 text-amber-500" />
                                ) : (
                                    <CheckCircle2 className="w-10 h-10 text-primary" />
                                )}
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Join {projectData.name}</CardTitle>
                        <CardDescription>
                            {existingRequest ? (
                                "Your request to join this project is currently pending approval from the owner."
                            ) : (
                                "You have been invited to collaborate on this project. Request access to start working together."
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!existingRequest ? (
                            <form action={async () => {
                                'use server'
                                const result = await createAccessRequest(projectId)
                                if (result?.error) {
                                    console.error('Failed to create access request:', result.error)
                                    // Instead of redirect, perhaps redirect with error
                                    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
                                }
                                redirect('/dashboard?requested=true')
                            }}>
                                <Button type="submit" className="w-full h-11 text-base">
                                    Request Access
                                </Button>
                            </form>
                        ) : (
                            <Button disabled className="w-full h-11 opacity-50 cursor-not-allowed">
                                Request Pending
                            </Button>
                        )}
                        <Button variant="ghost" asChild className="w-full h-11">
                            <Link href="/dashboard">Cancel and Return</Link>
                        </Button>
                    </CardContent>
                    <CardFooter className="justify-center text-xs text-muted-foreground">
                        <Lock className="w-3 h-3 mr-1" />
                        End-to-end encrypted environment
                    </CardFooter>
                </Card>
            </div>
        </AuthLayout>
    )
}
