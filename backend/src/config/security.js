import rateLimit from 'express-rate-limit';


export const corsOption = {
    origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5500',
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH' , 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};


export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 100,

    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
      // "standardHeaders" adds rate limit info to response headers:
  standardHeaders: true,
   
    // Disables older X-RateLimit-* headers (replaced by standardHeaders)
  legacyHeaders: false,
})

export const authLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10, 
    skip: () => process.env.NODE_ENV === 'test',

    message: {
        success: false,
        message: 'Too many attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const transferLimiter = rateLimit({
    windowMs:  60 * 1000,
     
    max:10,
    message: {
        success: false,
        message: 'Too many transfer requests, please slow down'
    }
});
