"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { NotificationsList } from '@/components/notifications/notifications-list'

export default function NotificationsPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                            <ArrowLeft style={{ width: '24px', height: '24px' }} />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold">Notifications</h1>
                            <p className="text-sm text-muted-foreground">Manage all your notifications</p>
                        </div>
                    </div>
                    <AnimatedThemeToggler />
                </div>
            </header>

            <main className="container mx-auto py-8 px-4 max-w-4xl">
                <NotificationsList />
            </main>
        </div>
    )
}
