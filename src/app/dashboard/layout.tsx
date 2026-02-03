import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectsSync } from '@/components/dashboard/projects-sync'
import { NotificationProvider } from '@/components/notifications/notification-provider'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    return (
        <>
            <ProjectsSync />
            <NotificationProvider />
            {children}
        </>
    )
}
