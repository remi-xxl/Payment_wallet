import { Router } from "express";
import authRoutes from '../../modules/auth/auth.routes.js'
import walletRoutes from '../../modules/wallet/wallet.routes.js'
import transactionRoutes from '../../modules/transaction/transaction.routes.js'
import { version } from "react";


const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/wallet', walletRoutes);
v1Router.use('/transactions', transactionRoutes);


v1Router.get('/', (req,res) => {
    res.status(200).json({
        version: 'v1',
        status: 'active',
        deprecated: false,

        sunsetDate: null,

        endpoints: {
            auth: {
                register: 'POST /api/v1/auth/register',
                login:'POST /api/v1/auth/login',
                logout: 'POST /api.v1/auth/logout',
                refresh: 'POST /api/v1/auth/refresh'
            },
            wallet: {
                 balance: 'GET  /api/v1/wallet/me',
                 fund: 'POST /api/v1/wallet/fund',
            },
            transactions: {
                 transfer: 'POST /api/v1/transactions/transfer',
                 history:  'GET  /api/v1/transactions/history',
            },
            profile: {
                 me: 'GET   /api/v1/profile/me',
        changePassword: 'PATCH /api/v1/profile/change-password',
            }
        }
    })
});

export default v1Router;