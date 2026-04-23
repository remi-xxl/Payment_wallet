import { Router } from "express";
import * as authController from "./auth.controller.js";
import { registerSchema, loginSchema} from "./auth.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authLimiter } from "../../config/security.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register,
);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);

export default router;
