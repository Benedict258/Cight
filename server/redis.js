import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.warn('Redis connection error:', err.message);
});

let connected = false;

export async function connectRedis() {
  if (connected) return;
  try {
    await redis.connect();
    connected = true;
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis unavailable, running without cache:', err.message);
  }
}

export async function getCache(key) {
  if (!connected) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 300) {
  if (!connected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silently fail — cache is optional
  }
}

export async function delCache(pattern) {
  if (!connected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // silently fail
  }
}

export default redis;
