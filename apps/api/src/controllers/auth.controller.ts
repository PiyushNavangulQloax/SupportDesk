import type { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "../services/auth.service.js";
import { successResponse } from "../utils/response.js";

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      res.status(200).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();

