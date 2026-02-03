"use client"

import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
    onClick?: () => void
    className?: string
}

export function NotificationBell({ onClick, className }: NotificationBellProps) {
    const unreadCount = useNotificationStore(state => state.unreadCount)

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                className
            )}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute top-0.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-muted-foreground/20 dark:bg-muted-foreground/30 px-1 text-[12px] font-semibold text-foreground border border-border">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    )
}
