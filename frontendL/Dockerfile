# Frontend Dockerfile - Flutter Web Production Build
# Multi-stage build for optimized static web serving

# Stage 1: Flutter build stage
FROM flutter:3.16.0 AS builder

WORKDIR /app

# Copy Flutter project files
COPY frontend/pubspec.yaml frontend/pubspec.lock ./
RUN flutter pub get

# Copy source code
COPY frontend/ ./

# Build for web production
RUN flutter build web --release --web-renderer canvaskit

# Stage 2: Nginx serving stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

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