import { Router } from "express";
import * as healthController from './health.controller.js';
import { authenticate } from "../../middlewares/auth.middleware.js";


const router = Router();


router.get('/live', healthController.liveness);

router.get('/ready', healthController.readiness);

router.get('/database', authenticate, healthController.databaseStats);

export default router;