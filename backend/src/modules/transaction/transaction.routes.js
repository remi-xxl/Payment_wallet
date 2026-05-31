import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as transactionController from './transaction.controller.js';
import { paginationSchema, transferSchema } from './transaction.schema.js';
import { validate } from '../../middlewares/validate.js';
import { transferLimiter } from '../../config/security.js';
import { idempotency } from '../../middlewares/idempotency.middleware.js';

const router = Router()


router.use(authenticate);

router.post('/transfer', transferLimiter,validate(transferSchema),idempotency,transactionController.transfer)
router.get('/history', validate(paginationSchema, 'query'), transactionController.getTransactionHistory)


export default router;