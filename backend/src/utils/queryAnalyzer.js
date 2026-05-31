import prisma from './prisma.js';
import logger from '../config/logger.js';


export async function explainQuery(sql, params = []) {
    const result = await prisma.$queryRawUnsafe(
        `EXPLAIN ANALYZE ${sql}`,
        ...params
    );

    return result;
}


export async function measureQuery(queryName, queryFn) {
const start = Date.now();

try {
    const result = await queryFn();
    const duration = Date.now() - start;

    if(process.env.NODE_ENV === 'development') {
        logger.debug('Query Completed', {
            query: queryName,
            duration: `${duration}ms`
        })
    }else if( duration > 100) {
        logger.warn('Slow query deteched', {
            query: queryName,
            duration: `${duration}ms`
        })
    }

    return result;
} catch (error) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
     query: queryName,
     duration: `${duration}ms`,
     error: error.message,
    })

    throw error;
}
}