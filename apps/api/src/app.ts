import express from "express";
import cors from "cors";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint (root level)
app.use("/health", healthRouter);

// API v1 routes
app.use("/api/v1", apiRouter);

// 404 Fallback for unhandled routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);
