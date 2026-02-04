"use client"

import { useState, useEffect } from 'react'
import { NotificationBell } from './notification-bell'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { Inbox, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { NotificationSkeleton } from './notification-skeleton'

export function NotificationDropdown() {
    const [open, setOpen] = useState(false)
    const { notifications, isLoading, markAllAsRead, deleteAllRead } = useNotificationStore()

    const unreadNotifications = notifications.filter(n => !n.is_read)
    const recentNotifications = notifications.slice(0, 5)

    const handleMarkAllRead = async () => {
        await markAllAsRead()
    }

    const handleClearRead = async () => {
        await deleteAllRead()
    }

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <NotificationBell />
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align={isMobile ? "center" : "end"}
                className="w-[90vw] max-w-[380px] sm:w-[380px] p-0"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex flex-row items-center justify-between p-4 border-b gap-2">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex items-center gap-2 w-auto">
                        {unreadNotifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-7 text-xs flex-1 sm:flex-none"
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.some(n => n.is_read) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearRead}
                                className="h-7 text-xs flex-1 sm:flex-none"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Clear read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="divide-y">
                            <NotificationSkeleton />
                            <NotificationSkeleton />
                            <NotificationSkeleton />
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                            <Inbox className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                    ) : (
                        recentNotifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onClose={() => setOpen(false)}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 5 && (
                    <div className="border-t p-2">
                        <Link href="/notifications" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full text-sm">
                                View all notifications
                            </Button>
                        </Link>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
