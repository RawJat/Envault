import { redis } from './redis'

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const CACHE_TTL = {
    ENCRYPTION_KEY: 86400,      // 24 hours (existing)
    ACTIVE_KEY: 3600,            // 1 hour (existing)
    PROJECT_ROLE: 600,           // 10 minutes
    SECRET_ACCESS: 600,          // 10 minutes
    PROJECT_LIST: 900,           // 15 minutes
    PROJECT_MEMBERS: 600,        // 10 minutes
    UNREAD_COUNT: 120,           // 2 minutes (real-time data)
    DETAILS: 3600,               // 1 hour
    PREFERENCES: 3600,           // 1 hour
    NOTIFICATIONS_LIST: 300,     // 5 minutes
    USER_PROFILE: 3600,          // 1 hour
} as const

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
    // User-specific keys
    userProjectRole: (userId: string, projectId: string) =>
        `user:${userId}:project:${projectId}:role`,

    userSecretAccess: (userId: string, secretId: string) =>
        `user:${userId}:secret:${secretId}:access`,

    userProjects: (userId: string) =>
        `user:${userId}:projects`,

    userUnreadCount: (userId: string) =>
        `user:${userId}:unread_count`,

    userPreferences: (userId: string) =>
        `user:${userId}:preferences`,

    userNotificationsList: (userId: string) =>
        `user:${userId}:notifications:list`,

    userProfile: (userId: string) =>
        `user:${userId}:profile`,

    // Project-specific keys
    projectMembers: (projectId: string) =>
        `project:${projectId}:members`,

    // Encryption keys (existing)
    encryptionKey: (keyId: string) =>
        `key:${keyId}`,

    activeKey: () =>
        `active_key`,
} as const

/**
 * Type-safe cache get operation
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    // Only run on server side
    if (typeof window !== 'undefined') {
        console.warn('Cache operations should only be called on the server side')
        return null
    }

    try {
        const value = await redis.get<T>(key)
        return value
    } catch (error) {
        console.warn(`Cache GET error for key ${key}:`, error)
        return null
    }
}

/**
 * Type-safe cache set operation with TTL
 */
export async function cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds: number
): Promise<boolean> {
    // Only run on server side
    if (typeof window !== 'undefined') {
        console.warn('Cache operations should only be called on the server side')
        return false
    }

    try {
        await redis.set(key, value, { ex: ttlSeconds })
        return true
    } catch (error) {
        console.warn(`Cache SET error for key ${key}:`, error)
        return false
    }
}

/**
 * Delete a single cache key
 */
export async function cacheDel(key: string): Promise<boolean> {
    try {
        await redis.del(key)
        return true
    } catch (error) {
        console.warn(`Cache DEL error for key ${key}:`, error)
        return false
    }
}

/**
 * Delete multiple cache keys
 */
export async function cacheDelMultiple(keys: string[]): Promise<boolean> {
    if (keys.length === 0) return true

    try {
        await redis.del(...keys)
        return true
    } catch (error) {
        console.warn(`Cache DEL multiple error:`, error)
        return false
    }
}

/**
 * Atomic increment operation (for counters like unread count)
 */
export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number | null> {
    try {
        const newValue = await redis.incr(key)

        // Set TTL if provided and key was just created
        if (ttlSeconds && newValue === 1) {
            await redis.expire(key, ttlSeconds)
        }

        return newValue
    } catch (error) {
        console.warn(`Cache INCR error for key ${key}:`, error)
        return null
    }
}

/**
 * Atomic decrement operation (for counters like unread count)
 */
export async function cacheDecr(key: string): Promise<number | null> {
    // Only run on server side
    if (typeof window !== 'undefined') {
        console.warn('Cache operations should only be called on the server side')
        return null
    }

    try {
        const newValue = await redis.decr(key)
        // Don't allow negative counts
        if (newValue < 0) {
            await redis.set(key, 0)
            return 0
        }
        return newValue
    } catch (error) {
        console.warn(`Cache DECR error for key ${key}:`, error)
        return null
    }
}

/**
 * Pattern-based cache invalidation
 * Note: This uses SCAN which is safe for production but may be slow for large datasets
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
    try {
        // Upstash Redis supports SCAN via keys() method
        const keys = await redis.keys(pattern)

        if (keys.length === 0) return 0

        await redis.del(...keys)
        return keys.length
    } catch (error) {
        console.warn(`Cache DEL pattern error for ${pattern}:`, error)
        return 0
    }
}

/**
 * Invalidate all caches for a specific user
 */
export async function invalidateUserCaches(userId: string): Promise<void> {
    await cacheDelPattern(`user:${userId}:*`)
}

/**
 * Invalidate all caches for a specific project
 */
export async function invalidateProjectCaches(projectId: string): Promise<void> {
    await cacheDelPattern(`project:${projectId}:*`)
}

/**
 * Invalidate project role cache for a user
 */
export async function invalidateUserProjectRole(
    userId: string,
    projectId: string
): Promise<void> {
    await cacheDel(CacheKeys.userProjectRole(userId, projectId))
}

/**
 * Invalidate all secret access caches for a user in a project
 * This is called when a user's role changes or they're removed from a project
 */
export async function invalidateUserSecretAccess(
    userId: string,

): Promise<void> {
    // We need to invalidate all secret access caches for this user in this project
    // Since we don't know all secret IDs, we use pattern matching
    await cacheDelPattern(`user:${userId}:secret:*`)
}

/**
 * Get cache statistics (useful for monitoring)
 */
export async function getCacheStats(): Promise<{
    dbSize: number | null
    memoryUsage: string | null
}> {
    try {
        // Note: Upstash Redis may not support all INFO commands
        // This is a basic implementation
        const dbSize = await redis.dbsize()

        return {
            dbSize,
            memoryUsage: 'N/A (Upstash managed)'
        }
    } catch (error) {
        console.warn('Cache stats error:', error)
        return {
            dbSize: null,
            memoryUsage: null
        }
    }
}
