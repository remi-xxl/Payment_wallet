import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";
import logger from "../config/logger.js";



export function errorHandler(err, req,res, next) {
    logger.error(
        'Request error',{
            requestId: req.requestId,
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            userId: req.user?.userId,
            statusCode: err.statusCode,
        }
    );

    if(err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        })
    }

    if(err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'A record with this value already exists',
        });
    }

    return res.status(500).json({
        success: false,
        message: 'An interval server error occurred',
        ...(env.nodeEnv === 'development' && { stack: err.stack})
    });
}

export function notFound(req,res,next) {
    next( new ApiError(404, `Route ${req.method} ${req.path} not found`));
}