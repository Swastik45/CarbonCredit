// In-memory rate limiting with sliding window
const rateLimitMap = new Map();

const DEFAULT_LIMIT = 5; // 5 attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

/**
 * Checks if a given key (IP address or email) has exceeded rate limits.
 * @param {string} key 
 * @param {number} limit 
 * @param {number} windowMs 
 * @returns {Promise<{ limited: boolean, resetTime: number, remaining: number }>}
 */
export async function isRateLimited(key, limit = DEFAULT_LIMIT, windowMs = WINDOW_MS) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  // Reset window if expired
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  rateLimitMap.set(key, record);

  // Periodic cleanup of stale entries (every 100 insertions)
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
  }

  const remaining = Math.max(0, limit - record.count);
  if (record.count > limit) {
    return { limited: true, resetTime: record.resetTime, remaining: 0 };
  }

  return { limited: false, resetTime: record.resetTime, remaining };
}
