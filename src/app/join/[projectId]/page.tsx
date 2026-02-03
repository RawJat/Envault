import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createAccessRequest } from '@/app/invite-actions'
import Link from 'next/link'

interface JoinPageProps {
    params: Promise<{ projectId: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Redirect to login with return path
        redirect(`/auth?next=/join/${projectId}`)
    }

    // Check project details (public info only if possible, or verify existence)
    // RLS might block reading project if not member.
    // Ideally we fetch just the name if we can, or we rely on server actions to tell us.
    // Since we are Server Component, we can use Service Role if needed or just try to fetch.

    // For "Join" page, usually we want to show "Join [Project Name]".
    // But standard user cannot read project name if they are not a member yet (depending on RLS).
    // If RLS says "view if member", then non-member sees nothing.
    // We might need a `getPublicProjectInfo` action or use admin client here for specific metadata.
    // Let's assume we use a safe query or just show generic if RLS blocks.

    // Using Admin Client for this specific read to show name
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: project } = await admin.from('projects').select('name').eq('id', projectId).single()

    if (!project) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Project Not Found</CardTitle>
                        <CardDescription>The project you are trying to join does not exist or has been deleted.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Join {project.name}</CardTitle>
                    <CardDescription>
                        You have been invited to collaborate on this project.
                        Click below to request access from the owner.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async () => {
                        'use server'
                        await createAccessRequest(projectId)
                        redirect('/dashboard?requested=true')
                    }}>
                        <Button type="submit" className="w-full">
                            Request Access
                        </Button>
                    </form>
                    <Button variant="ghost" asChild className="w-full mt-2">
                        <Link href="/dashboard">Cancel</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
