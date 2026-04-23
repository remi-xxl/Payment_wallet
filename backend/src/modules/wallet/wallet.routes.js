import Router from 'express';
import * as walletController from './wallet.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';


const router = Router();



router.use(authenticate);

router.get('/me', walletController.getWallet);


export default router;