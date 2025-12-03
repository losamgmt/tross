# Deployment Guide

## Overview

TrossApp uses GitHub Actions for automated CI/CD with Docker containerization.

## Prerequisites

1. **GitHub Secrets**: Configure required secrets in repository settings
2. **Docker Hub**: Account for image storage
3. **Production Environment**: Server/cloud provider for deployment

## Workflow

```
Development → Pull Request → Code Review → Merge to Main → Auto Deploy
```

## Manual Deployment

If needed, deploy manually using Docker Compose:

```bash
# 1. Clone repository
git clone <your-repo>
cd TrossApp

# 2. Set environment variables
cp .env.example .env.prod
# Edit .env.prod with production values

# 3. Deploy with Docker Compose
npm run deploy:prod
```

## Environment Configuration

### Required Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trossapp_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
NODE_ENV=production

# Optional
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

## Monitoring & Health Checks

- **Backend Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **Service Status**: Docker Compose healthchecks

## Rollback Strategy

```bash
# Rollback to previous image
docker-compose down
docker pull <previous-tag>
docker-compose up -d
```

## Troubleshooting

1. **Build Failures**: Check GitHub Actions logs
2. **Database Issues**: Verify connection strings and credentials
3. **Container Issues**: Check Docker logs: `docker-compose logs`

## Security Notes

- All secrets managed via GitHub Secrets
- Non-root containers for security
- Rate limiting and security headers enabled
- Database access restricted to application network
