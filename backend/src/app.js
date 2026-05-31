import express from 'express'
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import walletRoutes from './modules/wallet/wallet.routes.js' 
import transactionRoute from './modules/transaction/transaction.routes.js'
import profileRoutes from './modules/profile/profile.routes.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import  {generalLimiter, corsOption} from './config/security.js'
import helmet from 'helmet';
import { sessionMiddleware } from './config/session.js';
import v1Router from './routes/v1/index.js';
import './workers/index.js'
import { emailWorker } from './workers/index.js';
import logger from './config/logger.js';
import compression from 'compression';
import healthRoutes from './modules/health/health.routes.js'
import { requestTimeout } from './middlewares/timeout.middleware.js';
import metricsRoutes from './modules/health/metrics.routes.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';

const app = express();

BigInt.prototype.toJSON = function () { return this.toString(); };

app.set('trust proxy', 1)

app.use(helmet())
app.use(requestTimeout(30000))

app.use(cors(corsOption))

app.use(generalLimiter)

app.use(express.json());

// cookieParser() reads the Cookie header from incoming requests
// and populates req.cookies so you can do req.cookies.refreshToken
app.use(cookieParser())
app.use(metricsMiddleware)

app.use(sessionMiddleware);

app.use(compression({
    threshold: 1024,
    level: 6,
    filter: (req,res) => {
        if(req.headers['x-no-compression']){
            return false;
        }
        return compression.filter(req,res)
    }
}))

app.get('/api', (req,res) => {
res.status(200).json({
    name:'Fintech API',
    description: 'A simple fintech API built with Node.js, Express, and PostgreSQL',
    versions: {
        v1: {
            status: 'active',
            url: '/api/v1',
            deprecated: false,
            sunsetDate: null
        }
    }
})
})

app.use('/health', healthRoutes);
// app.get('/health', (req,res) => {
//   res.status(200).json({
//     status: 'healthy',
//     timestamp: new Date().toISOString(),
//     version: 'v1'
//   });
// });

// app.use('/api/auth', authRoutes)
// app.use('/api/wallet',walletRoutes)
// app.use('/api/transactions', transactionRoute)
// app.use('/api/profile', profileRoutes)

app.use('/api/v1', v1Router)

app.use('/metrics', metricsRoutes)
// Error handler
app.use(notFound)

app.use(errorHandler)

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await emailWorker.close();
    process.exit(0);
})

export default app;