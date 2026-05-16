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
import { sesssionMiddleware } from './config/session.js';
import v1Router from './routes/v1/index.js';
import './workers/index.js'
import { emailWorker } from './workers/index.js';

const app = express();

app.use(helmet())

app.use(cors(corsOption))

app.use(generalLimiter)

app.use(express.json());

// cookieParser() reads the Cookie header from incoming requests
// and populates req.cookies so you can do req.cookies.refreshToken
app.use(cookieParser())

app.use(sesssionMiddleware);

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
app.get('/health', (req,res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1'
  });
});

// app.use('/api/auth', authRoutes)
// app.use('/api/wallet',walletRoutes)
// app.use('/api/transactions', transactionRoute)
// app.use('/api/profile', profileRoutes)

app.use('/api/v1', v1Router)
// Error handler
app.use(notFound)

app.use(errorHandler)

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await emailWorker.close();
    process.exit(0);
})

export default app;