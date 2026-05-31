import {Redis} from 'ioredis';
import { env } from './env.js';
import logger from './logger.js';


export function createRedisConnection() {
    return new Redis({
        host: env.redis.host,
        port : env.redis.port,

        maxRetriesPerRequest: null,

        retryStrategy(times) {
            const delay = Math.min(times * 1000, 2000);
            logger.warn(`Redis reconnecting... attempt ${times}`);
            return delay;
        }

    })



}