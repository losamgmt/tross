# Frontend Dockerfile - Flutter Web Production Build
# Multi-stage build for optimized static web serving
# 
# Platform-agnostic: Works with any container platform
# Supports: AWS ECS, GCP Cloud Run, Fly.io, self-hosted Kubernetes
# Note: Vercel auto-builds Flutter web - doesn't need this Dockerfile
#       Railway can use this OR Nixpacks (both work)
#
# BUILD CONTEXT: Must be run from repo root with: 
#   docker build -t tross-frontend -f frontend/Dockerfile .
#
# Or from frontend/ directory (context = .):
#   docker build -t tross-frontend .

# Stage 1: Flutter build stage
# Using official Cirrus Labs Flutter image (community standard)
# Use 'stable' tag to get latest stable Flutter matching pubspec requirements
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app

# Copy pubspec files first for better layer caching
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Copy source code
COPY . ./

# Build for web production
# --no-tree-shake-icons: Keep all Material Icons (we reference them by string name)
# Note: --web-renderer deprecated in Flutter 3.22+, CanvasKit is now default
RUN flutter build web --release --no-tree-shake-icons

# Stage 2: Nginx serving stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Flutter web app
COPY --from=builder /app/build/web /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 && \
    chown -R frontend:frontend /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]