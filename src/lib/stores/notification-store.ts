import { create } from 'zustand'
import { Notification } from '@/lib/types/notifications'

interface NotificationStore {
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean

    // Actions
    fetchNotifications: () => Promise<void>
    addNotification: (notification: Notification) => void
    updateNotification: (notification: Notification) => void
    removeNotification: (id: string) => void
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    deleteNotification: (id: string) => Promise<void>
    deleteMultiple: (ids: string[]) => Promise<void>
    deleteAllRead: () => Promise<void>
    incrementUnreadCount: () => void
    decrementUnreadCount: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: true })

        const fetchWithRetry = async (retries = 3, delay = 1000) => {
            try {
                // Use cached server action (dynamically imported to avoid build issues if this file is bundled client-side)
                const { getNotificationsAction } = await import('@/app/notification-actions')
                const { data, error } = await getNotificationsAction()

                if (error) throw error

                const notifications = (data || []) as Notification[]
                const unreadCount = notifications.filter(n => !n.is_read).length

                set({
                    notifications,
                    unreadCount,
                    isLoading: false
                })
            } catch (error) {
                console.error(`Failed to fetch notifications (attempt ${4 - retries}/3):`, error)
                if (retries > 0) {
                    setTimeout(() => fetchWithRetry(retries - 1, delay * 1.5), delay)
                } else {
                    set({ isLoading: false })
                }
            }
        }

        fetchWithRetry()
    },

    addNotification: (notification: Notification) => {
        set(state => ({
            notifications: [notification, ...state.notifications],
            unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1
        }))
    },

    updateNotification: (notification: Notification) => {
        set(state => {
            const oldNotification = state.notifications.find(n => n.id === notification.id)
            const wasUnread = oldNotification && !oldNotification.is_read
            const isNowRead = notification.is_read

            return {
                notifications: state.notifications.map(n =>
                    n.id === notification.id ? notification : n
                ),
                unreadCount: wasUnread && isNowRead
                    ? Math.max(0, state.unreadCount - 1)
                    : state.unreadCount
            }
        })
    },

    removeNotification: (id: string) => {
        set(state => {
            const notification = state.notifications.find(n => n.id === id)
            const wasUnread = notification && !notification.is_read

            return {
                notifications: state.notifications.filter(n => n.id !== id),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
            }
        })
    },

    markAsRead: async (id: string) => {
        // Optimistic update - update UI immediately
        const state = get()
        const notification = state.notifications.find(n => n.id === id)
        const wasUnread = notification && !notification.is_read

        if (wasUnread) {
            set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id
                        ? { ...n, is_read: true, read_at: new Date().toISOString() }
                        : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }))
        }

        // Then update database via server action
        const { markNotificationReadAction } = await import('@/app/notification-actions')
        try {
            const { error } = await markNotificationReadAction(id)
            if (error) throw error
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            // Rollback on error
            if (wasUnread) {
                set(state => ({
                    notifications: state.notifications.map(n =>
                        n.id === id
                            ? { ...n, is_read: false, read_at: undefined }
                            : n
                    ),
                    unreadCount: state.unreadCount + 1
                }))
            }
        }
    },

    markAllAsRead: async () => {
        // Optimistic update
        const previousState = get().notifications
        const previousUnreadCount = get().unreadCount

        set(state => ({
            notifications: state.notifications.map(n => ({
                ...n,
                is_read: true,
                read_at: new Date().toISOString()
            })),
            unreadCount: 0
        }))

        // Then update database
        const { markAllNotificationsReadAction } = await import('@/app/notification-actions')
        try {
            const { error } = await markAllNotificationsReadAction()
            if (error) throw error
        } catch (error) {
            console.error('Failed to mark all as read:', error)
            // Rollback on error
            set({
                notifications: previousState,
                unreadCount: previousUnreadCount
            })
        }
    },

    deleteNotification: async (id: string) => {
        // Optimistic update - remove from UI immediately
        const state = get()
        const notification = state.notifications.find(n => n.id === id)
        const wasUnread = notification && !notification.is_read

        // Store for potential rollback
        const previousNotifications = state.notifications
        const previousUnreadCount = state.unreadCount

        set(state => ({
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
        }))

        // Then delete from database
        const { deleteNotificationAction } = await import('@/app/notification-actions')
        try {
            const { error } = await deleteNotificationAction(id)
            if (error) throw error
        } catch (error) {
            console.error('Failed to delete notification:', error)
            // Rollback on error
            set({
                notifications: previousNotifications,
                unreadCount: previousUnreadCount
            })
        }
    },

    deleteMultiple: async (ids: string[]) => {
        // Optimistic update
        const state = get()
        const deletedNotifications = state.notifications.filter(n => ids.includes(n.id))
        const unreadDeleted = deletedNotifications.filter(n => !n.is_read).length
        const previousNotifications = state.notifications
        const previousUnreadCount = state.unreadCount

        set({
            notifications: state.notifications.filter(n => !ids.includes(n.id)),
            unreadCount: Math.max(0, state.unreadCount - unreadDeleted)
        })

        // Then delete from database
        const { deleteMultipleNotificationsAction } = await import('@/app/notification-actions')
        try {
            const { error } = await deleteMultipleNotificationsAction(ids)
            if (error) throw error
        } catch (error) {
            console.error('Failed to delete notifications:', error)
            // Rollback on error
            set({
                notifications: previousNotifications,
                unreadCount: previousUnreadCount
            })
        }
    },

    deleteAllRead: async () => {
        // Optimistic update
        const previousNotifications = get().notifications

        set(state => ({
            notifications: state.notifications.filter(n => !n.is_read)
        }))

        // Then delete from database
        const { deleteAllReadNotificationsAction } = await import('@/app/notification-actions')
        try {
            const { error } = await deleteAllReadNotificationsAction()
            if (error) throw error
        } catch (error) {
            console.error('Failed to delete read notifications:', error)
            // Rollback on error
            set({ notifications: previousNotifications })
        }
    },

    incrementUnreadCount: () => {
        set(state => ({ unreadCount: state.unreadCount + 1 }))
    },

    decrementUnreadCount: () => {
        set(state => ({ unreadCount: Math.max(0, state.unreadCount - 1) }))
    }
}))
