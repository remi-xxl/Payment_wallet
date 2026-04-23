import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";




export function errorHandler(err, req,res, next) {
    console.log(`[ERROR] ${err.message}`);

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