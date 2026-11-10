import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { registerBodySchema, loginBodySchema } from "../schemas/auth.schema.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerBodySchema }),
  authController.register
);

authRouter.post(
  "/login",
  loginRateLimiter,
  validateRequest({ body: loginBodySchema }),
  authController.login
);

