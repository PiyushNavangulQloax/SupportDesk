import { app } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./config/database.js";
import { disconnectRedis } from "./config/redis.js";
import { logger } from "./config/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    `[SupportDesk API] Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`
  );
  logger.info(
    `[SupportDesk API] Health check available at http://localhost:${env.PORT}/health`
  );
});

async function gracefulShutdown(signal: string) {
  logger.info(`\n[SupportDesk API] Received ${signal}. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "[SupportDesk API] Error closing HTTP server");
      process.exit(1);
    }

    try {
      await Promise.allSettled([
        disconnectDatabase(),
        disconnectRedis(),
      ]);
      logger.info("[SupportDesk API] Database and Redis connections closed safely.");
      process.exit(0);
    } catch (shutdownErr) {
      logger.error({ err: shutdownErr }, "[SupportDesk API] Error during shutdown cleanup");
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("[SupportDesk API] Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { server };
