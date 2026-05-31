import logger from '../config/logger.js';


export function requestTimeout(timeoutMs = 30000) {
    return (req,res,next) => {
        const timer = setTimeout(() => {
            logger.error('Request Timeout', {
                requestId: req.requestId,
                method: req.method,
                url: req.url,
                timeout: `${timeoutMs}ms`,
                userId: req.user?.userId
            });

            if(!res.headerSent) {
                res.status(408).json({
                    success: false,
                    message: 'Request timeout. please try again'
                }, );
            }
           
        }, timeoutMs);

        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));

        next();
    }
}