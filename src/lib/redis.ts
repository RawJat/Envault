import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

/**
 * Get Redis client instance (lazy initialization)
 * Only initializes when environment variables are available (server-side)
 */
export function getRedisClient(): Redis {
    // Return existing instance if already initialized
    if (redisInstance) {
        return redisInstance
    }

    // Check if we're on the server side and have credentials
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        throw new Error(
            'Redis credentials not found. Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in your environment variables.'
        )
    }

    // Initialize and cache the instance
    redisInstance = new Redis({
        url,
        token,
    })

    return redisInstance
}

// Export a getter for backward compatibility
// This will throw an error if called on client-side
export const redis = new Proxy({} as Redis, {
    get(_target, prop) {
        const client = getRedisClient()
        return client[prop as keyof Redis]
    }
})
