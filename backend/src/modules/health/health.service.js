import prisma from "../../utils/prisma.js";
import { createRedisConnection } from "../../config/redis.js";
import logger from "../../config/logger.js";
import { databaseCircuitBreaker, redisCircuitBreaker } from "../../utils/circuitBreaker.js";


async function  checkDatabase() {
    const start = Date.now();

    try {
        await prisma.$queryRaw`SELECT 1`;
        return {
            status: 'healthy',
            latency: `${Date.now() - start}ms`,
        }
    } catch (error) {
        logger.error('Datebase health checked failed', { error: error.message});

        return {
            status: 'unhealthy',
            latency: `${Date.now() - start}ms`,
            error: error.message
        }
    }
}


async function checkRedis() {
    const start = Date.now();
 const redis = createRedisConnection();
    try {
        const response = await redis.ping()
        return {
            status: response === 'PONG' ? 'healthy' : 'unhealthy',
            latency: `${Date.now() - start}ms`
        }
    } catch (error) {
        logger.error('Redis health check failed', { error: error.message })
        return {
            status: 'unhealthy',
            latency: `${Date.now() - start}ms`,
            error: error.message
        };
    } finally{
        await redis.quit();
    }
}


function checkMemory() {
    const memory = process.memoryUsage();
    //convert bytes to MB for readability
    const heapUsedMB = Math.round(memory.heapUsed / 1024 /1024);
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memory.rss /1024 /1024);

    const heapPercentage = Math.round((memory.heapUsed / memory.heapTotal) * 100);

    return {
        status: heapPercentage > 90 ? 'unhealthy' : 'healthy',
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        rss: `${rssMB}MB`,
        heapPercentage: `${heapPercentage}%`
    }
}

export async function getRedinessStatus() {
    const start = Date.now();

    const [database, redis , memory] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        Promise.resolve(checkMemory()),
    ]);

    const circuitBreakers = {
        database: databaseCircuitBreaker.getStatus(),
        redis: redisCircuitBreaker.getStatus(),
    };

    const allHealthy = [database, redis, memory]
    .every((check) => check.status === 'healthy');

    return {
        status: allHealthy ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        uptime: `${Math.round(process.uptime())}s`,
        latency: `${Date.now() - start}ms`,
         version: 'v1',

        checks: {
            database,
            redis,
            memory
        },
        circuitBreakers
    }
}