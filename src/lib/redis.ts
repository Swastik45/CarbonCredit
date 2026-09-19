import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ENABLE_REDIS = process.env.ENABLE_REDIS === 'true';

const globalForRedis = globalThis as unknown as {
  redisClient?: Redis;
  fallbackCache?: LRUCache<string, string>;
};

// Initialize L1 memory cache (instant sub-millisecond retrieval)
export const fallbackCache = globalForRedis.fallbackCache ?? new LRUCache<string, string>({
  max: 10000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.fallbackCache = fallbackCache;
}

let redis: Redis | null = null;
let isRedisAvailable = false;
let redisErrorLogged = false;

function logRedisFallback(context: string, detail?: string) {
  if (redisErrorLogged) return;
  redisErrorLogged = true;
  console.warn(`[Redis] ${context}${detail ? `: ${detail}` : ''}. Using L1 memory fallback.`);
}

if (ENABLE_REDIS) {
  try {
    redis = globalForRedis.redisClient ?? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 1000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForRedis.redisClient = redis;
    }

    redis.on('ready', () => {
      isRedisAvailable = true;
      redisErrorLogged = false;
      console.log('[Redis] Connected and ready.');
    });

    redis.on('error', (err) => {
      isRedisAvailable = false;
      logRedisFallback('Connection error', err.message);
    });

    if (redis.status === 'ready') {
      isRedisAvailable = true;
    } else {
      redis.connect().catch((err) => {
        isRedisAvailable = false;
        logRedisFallback('Initial connection failed', err.message);
      });
    }
  } catch (e: any) {
    isRedisAvailable = false;
    logRedisFallback('Initialization error', e.message);
  }
}

function isReady(): boolean {
  return isRedisAvailable && redis !== null && redis.status === 'ready';
}

export { redis, isRedisAvailable };

/**
 * Get cache value by key (Dual-Layer: L1 Memory -> L2 Redis)
 */
export async function getCache(key: string): Promise<string | null> {
  // L1 Memory Cache Check (Instant, 0.1ms)
  const memoryVal = fallbackCache.get(key);
  if (memoryVal !== undefined) {
    return memoryVal;
  }

  // L2 Redis Cache Check
  if (isReady()) {
    try {
      const val = await redis!.get(key);
      if (val !== null) {
        fallbackCache.set(key, val, { ttl: 60 * 1000 });
        return val;
      }
    } catch (e) {
      console.warn('[Redis Get Cache Error]:', e);
    }
  }
  return null;
}

/**
 * Set cache value in BOTH L1 Memory & L2 Redis
 */
export async function setCache(key: string, value: string, ttlSeconds: number = 60): Promise<void> {
  fallbackCache.set(key, value, { ttl: ttlSeconds * 1000 });

  if (isReady()) {
    try {
      await redis!.set(key, value, 'EX', ttlSeconds);
    } catch (e) {
      console.warn('[Redis Set Cache Error]:', e);
    }
  }
}

/**
 * Clear specific key from BOTH L1 Memory & L2 Redis
 */
export async function deleteCache(key: string): Promise<void> {
  fallbackCache.delete(key);

  if (isReady()) {
    try {
      await redis!.del(key);
    } catch (e) {
      console.warn('[Redis Del Cache Error]:', e);
    }
  }
}

/**
 * Clear all platform stats and plantation cache keys
 */
export async function clearPlatformCaches(): Promise<void> {
  fallbackCache.clear();
  if (isReady()) {
    try {
      const keys = await redis!.keys('carbon:*');
      if (keys && keys.length > 0) {
        await redis!.del(...keys);
      }
    } catch (e) {
      console.warn('[Redis Clear Platform Caches Error]:', e);
    }
  }
}
