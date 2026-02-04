"use client"


import { useNotificationSubscription } from '@/hooks/use-notification-subscription'

/**
 * Component to set up notification subscription
 * Should be rendered once in the dashboard layout
 */
export function NotificationProvider() {
    useNotificationSubscription()

    return null
}
