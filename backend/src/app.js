import express from 'express'
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.route.js'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import walletRoutes from './modules/wallet/wallet.routes.js' 
import transactionRoute from './modules/transaction/transaction.route.js'
import profileRoutes from './modules/profile/profile.routes.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import  {generalLimiter, corsOption} from './config/security.js'
import helmet from 'helmet';
import { sesssionMiddleware } from './config/session.js';


const app = express();
// ── Security middlewares ──────────────────────────────────────
// helmet() sets secure HTTP headers. Call it first before anything else.
// It automatically sets headers like:
//   X-Content-Type-Options: nosniff    ← prevents MIME sniffing attacks
//   X-Frame-Options: DENY              ← prevents clickjacking
//   Strict-Transport-Security          ← forces HTTPS

app.use(helmet())

app.use(cors(corsOption))

app.use(generalLimiter)

app.use(express.json());

// cookieParser() reads the Cookie header from incoming requests
// and populates req.cookies so you can do req.cookies.refreshToken
app.use(cookieParser())

app.use(sesssionMiddleware);

app.get('/health', (req,res) => {
    res.status(200).json({ message: "Server is running"})
});

app.use('/api/auth', authRoutes)
app.use('/api/wallet',walletRoutes)
app.use('/api/transactions', transactionRoute)
app.use('/api/profile', profileRoutes)
// Error handler
app.use(notFound)

app.use(errorHandler)

export default app;