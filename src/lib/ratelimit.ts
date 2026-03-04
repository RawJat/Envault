import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "./redis";

// Allow 5 requests per 1 minute for Auth operations (Sign-in/up/reset)
export const authRateLimit = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/auth",
});

// Allow 20 requests per 10 seconds for general API reads
export const apiRateLimit = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit/api",
});

// Allow 10 requests per 1 minute for write operations (POST/PUT/DELETE)
export const writeRateLimit = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/write",
});
