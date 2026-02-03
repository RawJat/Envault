"use client"

import { formatDistanceToNow } from 'date-fns'
import { Notification } from '@/lib/types/notifications'
import { NotificationIcon } from './notification-icon'
import { Button } from '@/components/ui/button'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface NotificationItemProps {
    notification: Notification
    onClose?: () => void
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
    const router = useRouter()
    const { markAsRead, deleteNotification } = useNotificationStore()

    const handleClick = async () => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }

        if (notification.action_url) {
            router.push(notification.action_url)
            onClose?.()
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await deleteNotification(notification.id)
    }

    return (
        <div
            className={cn(
                'group flex items-start gap-3 p-4 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-accent/50',
                !notification.is_read && 'bg-accent/20'
            )}
            onClick={handleClick}
        >
            <NotificationIcon
                iconName={notification.icon}
                variant={notification.variant}
                className="mt-0.5"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm',
                        !notification.is_read && 'font-semibold'
                    )}>
                        {notification.title}
                    </p>
                    {!notification.is_read && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                </div>

                {notification.message && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                    </p>
                )}

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
