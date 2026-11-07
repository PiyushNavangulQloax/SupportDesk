import { app } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./config/database.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `[SupportDesk API] Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`
  );
  console.log(
    `[SupportDesk API] Health check available at http://localhost:${env.PORT}/health`
  );
});

async function gracefulShutdown(signal: string) {
  console.log(`\n[SupportDesk API] Received ${signal}. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error("[SupportDesk API] Error closing HTTP server:", err);
      process.exit(1);
    }

    try {
      await disconnectDatabase();
      console.log("[SupportDesk API] Database connections closed safely.");
      process.exit(0);
    } catch (dbErr) {
      console.error("[SupportDesk API] Error disconnecting database:", dbErr);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error("[SupportDesk API] Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { server };
