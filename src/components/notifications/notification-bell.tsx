"use client"

import { Bell } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { cn } from '@/lib/utils'

import { forwardRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NotificationBellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {

}

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(({ className, ...props }, ref) => {
    const unreadCount = useNotificationStore(state => state.unreadCount)

    return (
        <button
            ref={ref}
            {...props}
            className={cn(
                'inline-flex items-center justify-center h-10 px-3 rounded-md transition-colors gap-2',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                className
            )}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <Kbd showOnMobile>{unreadCount > 9 ? '9+' : unreadCount}</Kbd>
            )}
        </button>
    )
})
NotificationBell.displayName = "NotificationBell"
