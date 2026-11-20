#!/bin/sh
set -e

# ==============================================================================
# SupportDesk API — Container Entrypoint Script
# ==============================================================================

echo "[SupportDesk API Entrypoint] Initializing container runtime..."

# Auto-apply Prisma migrations if AUTO_MIGRATE is true and DATABASE_URL is set
if [ "$AUTO_MIGRATE" = "true" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
  if [ -n "$DATABASE_URL" ]; then
    echo "[SupportDesk API Entrypoint] Applying Prisma database migrations..."
    npx prisma migrate deploy || {
      echo "[SupportDesk API Entrypoint] Warning: Migration failed. Check database readiness."
      exit 1
    }
    echo "[SupportDesk API Entrypoint] Database migrations applied successfully."
  else
    echo "[SupportDesk API Entrypoint] DATABASE_URL not set; skipping migrations."
  fi
fi

# Execute main process command passed to container
echo "[SupportDesk API Entrypoint] Starting process: $@"
exec "$@"
