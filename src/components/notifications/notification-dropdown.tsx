"use client"

import { useState } from 'react'
import { NotificationBell } from './notification-bell'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { Loader2, Inbox, Trash2 } from 'lucide-react'
import Link from 'next/link'

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

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <div>
                    <NotificationBell />
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[380px] p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex items-center gap-2">
                        {unreadNotifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-7 text-xs"
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.some(n => n.is_read) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearRead}
                                className="h-7 text-xs"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Clear read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
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
