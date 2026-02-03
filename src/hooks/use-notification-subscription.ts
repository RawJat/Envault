"use client"

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { Notification } from '@/lib/types/notifications'
import { toast } from 'sonner'

export function useNotificationSubscription() {
    const {
        addNotification,
        updateNotification,
        removeNotification,
        fetchNotifications
    } = useNotificationStore()

    useEffect(() => {
        const supabase = createClient()
        let channel: ReturnType<typeof supabase.channel> | null = null
        let isMounted = true

        const setupSubscription = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    if (userError) console.error('Failed to get user for notification subscription:', userError)
                    return
                }

                if (!isMounted) return

                // Initial fetch
                await fetchNotifications()

                if (!isMounted) return

                // Subscribe to real-time changes
                channel = supabase
                    .channel(`notifications:${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${user.id}`
                        },
                        (payload) => {
                            // Handle INSERT
                            if (payload.eventType === 'INSERT') {
                                const notification = payload.new as Notification
                                addNotification(notification)

                                toast.info(notification.title, {
                                    description: notification.message,
                                    action: notification.action_url ? {
                                        label: 'View',
                                        onClick: () => window.location.href = notification.action_url!
                                    } : undefined
                                })
                            }

                            // Handle UPDATE
                            else if (payload.eventType === 'UPDATE') {
                                const notification = payload.new as Notification
                                updateNotification(notification)
                            }

                            // Handle DELETE
                            else if (payload.eventType === 'DELETE') {
                                const notification = payload.old as Notification
                                removeNotification(notification.id)
                            }
                        }
                    )
                    .subscribe((status, err) => {
                        if (err) console.error('Notification subscription error:', err)
                    })

            } catch (error) {
                console.error('Error setting up notification subscription:', error)
            }
        }

        setupSubscription()

        // Cleanup on unmount
        return () => {
            isMounted = false
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [addNotification, updateNotification, removeNotification, fetchNotifications])
}
