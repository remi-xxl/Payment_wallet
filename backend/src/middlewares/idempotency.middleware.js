import {getCache, setCache} from '../utils/cache.js';
import logger from '../config/logger.js';

//How long to remember idempotency keys.
//24 hrs is standard - clients shoud not retry 24 hrs
const IDEMPOTENCY_TTL= 24 * 60 * 60;

//idempotency key prefix in redis 
const KEY_PREFIX = 'idempotency';


export function idempotency(req,res,next) {
const idempotencyKey = req.headers['x-idempotency-key'];


if(!idempotencyKey) {
    return next();
}

if(!idempotencyKey.length < 10 || idempotencyKey.length > 100) {
    return res.status(400).json({
        success: false,
        message: 'X-idempotency-Key must be between 10 and 100 characters',
    });
}

const cachekey = `${KEY_PREFIX} ${req.user?.userId} :${idempotencyKey}`

(async () => {
    try {
        const cached = await getCache(cachekey);
        
        if(cached){
         logger.info('idempotent request detected', {
            idempotencyKey,
            userId: req.user?.userId,
         });

         return res.status(cached.statusCode).json(cached.body);
        }

        const originalJson = res.json.bind(res);
        res.json = async(body) => {
         if(res.statusCode >= 200 && res.statusCode < 300) {
            await setCache(
                cachekey,
                {
                    statusCode: res.statusCode, body
                },
                IDEMPOTENCY_TTL
            );

            logger.info('Idempotency key stored', {
                idempotencyKey,
                userId: req.user?.userId,
            });
         }

         return originalJson(body);

        };
    } catch (error) {
        
        logger.warn('Idompotency check failed', { error: error.message})
        next();
    }
}) ();
}