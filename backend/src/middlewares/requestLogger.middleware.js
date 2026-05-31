import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export function requestLogger (res, req, next) {
    const requestId = uuidv4();

    req.requestId = requestId;

    const startTime = Date.now();

    logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
    });


    res.on('finish', () => {
        const duration = Date.now() - startTime;

        const level =
            res.statusCode >= 500 ? 'error' :
            res.statusCode >= 400 ? 'warn' :
            'info';

        logger.log(level, 'Request completed', {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId,
        });

        if(duration > 1000) {
            logger.warn('Slow request detected', {
                requestId,
                url: req.url,
                duration: `${duration}ms`,
            });
        }
    })

    next();
}