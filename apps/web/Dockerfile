# ==============================================================================
# SupportDesk Web — Multi-Stage Production Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Single Page Application (SPA)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /workspace

# Copy dependency manifests for web
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/

WORKDIR /workspace/apps/web
RUN npm ci --legacy-peer-deps

# Create root and api node_modules symlinks so shared schemas resolve web dependencies
WORKDIR /workspace
RUN ln -s /workspace/apps/web/node_modules /workspace/node_modules && \
    mkdir -p /workspace/apps/api && \
    ln -s /workspace/apps/web/node_modules /workspace/apps/api/node_modules

# Copy shared schemas from API and full Web source tree
COPY apps/api/src/schemas ./apps/api/src/schemas
COPY apps/web ./apps/web

# Build static bundle
WORKDIR /workspace/apps/web
ARG VITE_API_BASE_URL=http://localhost:5000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx boilerplate
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA artifacts from builder stage
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and security headers
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Configure runtime permissions for non-root nginx worker
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
