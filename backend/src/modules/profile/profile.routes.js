import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as profileController from "./profile.controller.js";
import { validate } from '../../middlewares/validate.js';
import { changePasswordSchema } from "./profile.schema.js";


const router = Router();

router.use(authenticate);

router.get('/me', profileController.getMyProfile);
router.patch(
  '/change-password',
  validate(changePasswordSchema),
  profileController.changePassword,
);

export default router;
