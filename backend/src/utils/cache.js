import { createRedisConnection } from "../config/redis.js";
import logger from '../config/logger.js';


const redis = createRedisConnection();
export const CacheKeys = {
    wallet:(userId) => `wallet:${userId}`,

    profile: (userId) => `profile: ${userId}`,

    transactions: (userId, page, limit) => `transactions:${userId}:${page}:${limit}`
};


export const CacheTTL = {
    wallet: 60,
    profile: 300,
    transactions: 30,
};


export async function getCache(key) {
    try {
        const data = await redis.get(key);

        if(!data) {
            return null;
        }

        return JSON.parse(data);
    } catch (error) {
        logger.warn('Cache get failed', { key, error: error.message});
        return null;
    }
} 

export async function setCache(key, data, ttlSeconds){
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
    } catch (error) {
        logger.warn('Cache set failed', {key, error: error.message})
    }
}


export async function deleteCache(key) {
    try {
        await redis.del(key);
    } catch (error) {
        logger.warn('Cache delete failed', {key, error: error.message})
    }
}


export async function deletePattern(pattern) {
    try {
       const keys = await redis.keys(pattern)  ;

       if(keys.length > 0) {
        await redis.del(...keys);
        logger.debug('Cache pattern deleted', { pattern, count:keys.length})
       }
    } catch (error) {
        logger.warn('Cache pattern delete failed', {pattern, error: error.message})
    }
} 

export async function withCache(key, ttlSeconds, fetchFn) {
    const cached = await getCache(key);

    if(cached !== null) {
      logger.debug('Cache hit', {key});
      return cached;
    }

    logger.debug('Cache miss', {key});

    const data = await fetchFn();

    await setCache(key, data, ttlSeconds);

    return data;
}