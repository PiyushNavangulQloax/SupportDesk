import express from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { healthRouter } from "./routes/health.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

// Global Security & Perimeter Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint (root level)
app.use("/health", healthRouter);

// Interactive API Documentation (root level)
app.use("/docs", docsRouter);

// API v1 routes
app.use("/api/v1", apiRouter);

// 404 Fallback for unhandled routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);
