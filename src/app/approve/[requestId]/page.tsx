import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { approveRequest, rejectRequest } from '@/app/invite-actions'
import { AuthLayout } from '@/components/auth/auth-layout'
import { UserPlus, XCircle, Lock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface ApprovePageProps {
    params: Promise<{ requestId: string }>
}

export default async function ApprovePage({ params }: ApprovePageProps) {
    const { requestId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=/approve/${requestId}`)
    }

    // Fetch request details
    const { data: request, error: requestError } = await supabase
        .from('access_requests')
        .select('*, projects!inner(user_id, name)')
        .eq('id', requestId)
        .single()

    if (requestError || !request) {
        return (
            <AuthLayout>
                <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
                    <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
                        <CardHeader className="text-center space-y-2">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 bg-destructive/10 rounded-full">
                                    <XCircle className="w-10 h-10 text-destructive" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight">Request Not Found</CardTitle>
                            <CardDescription>
                                This access request may have already been processed or deleted.
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

    // Verify User is Owner of the Project
    const projectOwner = (request.projects as any).user_id
    if (projectOwner !== user.id) {
        redirect('/dashboard')
    }

    // Get requester email using admin client
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: requester } = await admin.auth.admin.getUserById(request.user_id)
    const requesterEmail = requester?.user?.email || 'Unknown User'

    return (
        <AuthLayout>
            <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
                <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
                    <CardHeader className="text-center space-y-2">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <UserPlus className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Access Request</CardTitle>
                        <CardDescription>
                            <span className="font-medium text-foreground">{requesterEmail}</span> wants to collaborate on <span className="font-medium text-foreground">{(request.projects as any).name}</span>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Assign Role</label>
                                <form action={async (formData: FormData) => {
                                    'use server'
                                    const role = formData.get('role') as 'viewer' | 'editor'
                                    const result = await approveRequest(requestId, role, true)
                                    if (result.error) {
                                        // In a real app we'd use a toast, but for now we redirect with error
                                        redirect(`/approve/${requestId}?error=${encodeURIComponent(result.error)}`)
                                    }
                                    redirect('/dashboard?approved=true')
                                }} className="space-y-4">
                                    <Select name="role" defaultValue="viewer">
                                        <SelectTrigger className="w-full h-11">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="viewer">Viewer</SelectItem>
                                            <SelectItem value="editor">Editor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button type="submit" className="w-full h-11 text-base">
                                        Approve Access
                                    </Button>
                                </form>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                                </div>
                            </div>

                            <form action={async () => {
                                'use server'
                                await rejectRequest(requestId)
                                redirect('/dashboard?denied=true')
                            }}>
                                <Button type="submit" variant="destructive" className="w-full h-11 text-base">
                                    Deny Request
                                </Button>
                            </form>
                        </div>

                        <Button variant="ghost" asChild className="w-full h-11">
                            <Link href="/dashboard">Back to Dashboard</Link>
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
