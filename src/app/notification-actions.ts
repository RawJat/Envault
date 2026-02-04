'use server'

import { createClient } from '@/lib/supabase/server'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CACHE_TTL } from '@/lib/cache'
import { Notification, NotificationPreferences } from '@/lib/types/notifications'


/**
 * Get notification preferences for the current user
 * Uses Redis cache to reduce DB hits
 */
export async function getNotificationPreferencesAction() {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: null, error: 'User not authenticated' }

        const cacheKey = CacheKeys.userPreferences(user.id)

        // Try cache first
        const cached = await cacheGet<NotificationPreferences>(cacheKey)
        if (cached) {
            return { data: cached, error: null }
        }

        // Fetch from DB
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') {
            return { data: null, error }
        }

        // Cache result (even if null/default)
        if (data) {
            await cacheSet(cacheKey, data, CACHE_TTL.PREFERENCES)
        }

        return { data, error: null }
    } catch (error) {
        console.error('Error in getNotificationPreferencesAction:', error)
        return { data: null, error: 'Internal server error' }
    }
}

/**
 * Update notification preferences
 * Updates DB and invalidates/updates cache
 */
export async function updateNotificationPreferencesAction(preferences: Partial<NotificationPreferences>) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        // Update DB
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: user.id,
                ...preferences,
                updated_at: new Date().toISOString()
            })

        if (error) return { error }

        // Update cache
        const cacheKey = CacheKeys.userPreferences(user.id)
        await cacheSet(cacheKey, preferences, CACHE_TTL.PREFERENCES)

        return { error: null }
    } catch (error) {
        console.error('Error in updateNotificationPreferencesAction:', error)
        return { error: 'Internal server error' }
    }
}

/**
 * Get notifications list for the current user
 * Uses Redis cache for initial load
 */
export async function getNotificationsAction(limit = 50) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: [], error: 'User not authenticated' }

        const cacheKey = CacheKeys.userNotificationsList(user.id)

        // Try cache first
        // Note: We cache the *default* list (limit 50). If params change, we might skip cache.
        if (limit === 50) {
            const cached = await cacheGet<Notification[]>(cacheKey)
            if (cached) {
                return { data: cached, error: null }
            }
        }

        // Fetch from DB
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) return { data: [], error }

        const notifications = (data || []) as Notification[]

        // Cache result (only if standard limit)
        if (limit === 50) {
            await cacheSet(cacheKey, notifications, CACHE_TTL.NOTIFICATIONS_LIST)
        }

        return { data: notifications, error: null }
    } catch (error) {
        console.error('Error in getNotificationsAction:', error)
        return { data: [], error: 'Internal server error' }
    }
}

/**
 * Mark notification as read
 * Updates DB and invalidates cache
 */
export async function markNotificationReadAction(id: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id) // Security check

        if (error) return { error }

        // Invalidate list cache
        // We could selectively update the item in cache, but invalidation is safer/easier
        await cacheDel(CacheKeys.userNotificationsList(user.id))

        // Also invalidate unread count if we cached it (we do)
        // Ideally we decrement it, but for now invalidation works
        await cacheDel(CacheKeys.userUnreadCount(user.id))

        return { error: null }
    } catch (error) {
        console.error('Error in markNotificationReadAction:', error)
        return { error: 'Internal server error' }
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadAction() {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('is_read', false)

        if (error) return { error }

        await cacheDel(CacheKeys.userNotificationsList(user.id))
        await cacheDel(CacheKeys.userUnreadCount(user.id))

        return { error: null }
    } catch (error) {
        console.error('Error in markAllNotificationsReadAction:', error)
        return { error: 'Internal server error' }
    }
}

/**
 * Delete notification
 */
export async function deleteNotificationAction(id: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) return { error }

        await cacheDel(CacheKeys.userNotificationsList(user.id))
        await cacheDel(CacheKeys.userUnreadCount(user.id))

        return { error: null }
    } catch (error) {
        console.error('Error in deleteNotificationAction:', error)
        return { error: 'Internal server error' }
    }
}

/**
 * Delete multiple notifications
 */
export async function deleteMultipleNotificationsAction(ids: string[]) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id)

        if (error) return { error }

        await cacheDel(CacheKeys.userNotificationsList(user.id))
        await cacheDel(CacheKeys.userUnreadCount(user.id))

        return { error: null }
    } catch (error) {
        console.error('Error in deleteMultipleNotificationsAction:', error)
        return { error: 'Internal server error' }
    }
}

/**
 * Delete all read notifications
 */
export async function deleteAllReadNotificationsAction() {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'User not authenticated' }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('is_read', true)

        if (error) return { error }

        await cacheDel(CacheKeys.userNotificationsList(user.id))

        return { error: null }
    } catch (error) {
        console.error('Error in deleteAllReadNotificationsAction:', error)
        return { error: 'Internal server error' }
    }
}
