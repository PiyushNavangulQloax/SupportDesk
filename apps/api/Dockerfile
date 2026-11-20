# ==============================================================================
# SupportDesk API — Multi-Stage Production Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies & Compilation
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Dummy placeholder for prisma generate during build time (does not connect to db)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Install system utilities needed for native compilation and Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Install dependencies using lockfile
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --legacy-peer-deps

# Copy TypeScript source code and build config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript into JavaScript (dist/)
RUN npm run build

# Prune development dependencies and ensure prisma CLI is available for runtime migrations
RUN npm prune --omit=dev --legacy-peer-deps && npm install prisma@7.10.1 tsx@^4.23.15 --save-prod=false --package-lock=false --legacy-peer-deps

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=5000

# Install runtime dependencies (OpenSSL for Prisma query engine, curl for healthcheck)
RUN apk add --no-cache openssl curl libc6-compat

# Security: Create non-root system user and group
RUN addgroup -g 1001 -S nodejs && adduser -S supportdesk -u 1001 -G nodejs

# Copy compiled artifacts, production dependencies, and prisma definitions
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure script is executable and permissions are granted to non-root user
RUN chmod +x ./docker-entrypoint.sh && chown -R supportdesk:nodejs /app

USER supportdesk

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
