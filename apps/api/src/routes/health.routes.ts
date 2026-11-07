import { Router } from "express";
import { successResponse } from "../utils/response.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json(
    successResponse({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});
