# Deployment

Production deployment guide using Docker and environment configuration.

---

## Deployment Philosophy

**Principles:**

- **Infrastructure as Code** - Docker Compose for reproducibility
- **Zero-downtime** - Rolling updates with health checks
- **Security-first** - Secrets management, least privilege
- **Observable** - Logging, monitoring, health checks
- **Reversible** - Easy rollback strategy

---

## Prerequisites

**Required:**

- Docker 20+ with Compose V2
- Production server (Linux recommended)
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

**Recommended:**

- GitHub Actions for CI/CD
- Docker Hub or private registry
- PostgreSQL managed service (AWS RDS, etc.)

---

## Environment Configuration

### Platform-Agnostic Database Configuration

**Tross uses `backend/config/deployment-adapter.js` for platform-agnostic deployment.**

The adapter automatically detects your deployment platform and configures the database connection appropriately. It supports two configuration formats:

#### Option 1: DATABASE_URL (Recommended for Railway, Heroku, Render)

```bash
DATABASE_URL=postgresql://user:password@db-host:5432/tross_prod
```

Most cloud platforms (Railway, Heroku, Render) provide a single `DATABASE_URL` environment variable. The adapter automatically uses this if present.

#### Option 2: Individual Variables (AWS, Google Cloud, Local)

> **Source of truth:** See [`backend/config/deployment-adapter.js`](../backend/config/deployment-adapter.js) for current defaults.

```bash
DB_HOST=your-db-host.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=tross_prod
DB_USER=your_db_user
DB_PASSWORD=your_db_password
# Pool values default to constants.js values if not set
DB_POOL_MIN=<your_min>
DB_POOL_MAX=<your_max>
```

If `DATABASE_URL` is not set, the adapter falls back to individual environment variables. This is useful for AWS RDS, Google Cloud SQL, or local development.

**The adapter automatically chooses the right format—you don't need to change any code.**

### Production Environment Variables

Create `.env.production`:

> **Note:** Default values come from source files. See [`config/ports.js`](../config/ports.js) and [`backend/config/deployment-adapter.js`](../backend/config/deployment-adapter.js).

```bash
# Node.js
NODE_ENV=production
# PORT defaults to value in config/ports.js if not set

# Database - Choose ONE format:
# Format 1: Single URL (Railway, Heroku, Render)
DATABASE_URL=postgresql://user:password@db-host:5432/tross_prod

# Format 2: Individual vars (AWS, Google Cloud, or if DATABASE_URL not available)
# DB_HOST=your-db-host
# DB_PORT=5432
# DB_NAME=tross_prod
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password

# Database Pool Configuration (optional, see deployment-adapter.js for defaults)
# DB_POOL_MAX=<your_value>
# DB_POOL_MIN=<your_value>

# Security (CRITICAL - Generate strong secrets)
JWT_SECRET=your-super-secure-64-character-minimum-secret-here-with-mixed-case-numbers-special
SESSION_SECRET=another-super-secure-64-character-secret-for-sessions

# Auth0 (Production credentials)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-production-client-id
AUTH0_CLIENT_SECRET=your-production-client-secret
AUTH0_CALLBACK_URL=https://your-domain.com/api/auth0/callback

# CORS
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# Rate Limiting (see deployment-adapter.js for defaults)
# RATE_LIMIT_WINDOW_MS=<your_value>
# RATE_LIMIT_MAX=<your_value>

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Secret Generation

**Generate strong secrets:**

```bash
# JWT_SECRET (64+ characters)
openssl rand -base64 48

# SESSION_SECRET
openssl rand -base64 48
```

**Validation:**

- Minimum 64 characters
- Mixed case, numbers, special characters
- Never commit to git
- Rotate every 90 days

---

## Railway Deployment (Current Platform)

Tross is deployed on Railway. The platform auto-detects the Node.js backend and deploys from Git.

### Railway Configuration

**Environment Variables (set in Railway dashboard):**

- `DATABASE_URL` - Provided by Railway PostgreSQL plugin
- `NODE_ENV=production`
- `JWT_SECRET` - Your secure secret
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` - Auth0 credentials
- `ALLOWED_ORIGINS` - Your frontend domain

**railway.json** handles build configuration. See [`railway.json`](../railway.json).

### Deployment Process

1. Push to `main` branch
2. Railway auto-deploys via GitHub integration
3. Health checks verify deployment: `https://tross-api-production.up.railway.app/api/health`

---

## Docker Deployment (Alternative)

For self-hosted deployments, use Docker Compose.

### Example Production Docker Compose

> **Note:** Create a `docker-compose.prod.yml` based on this template if self-hosting.

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped
```

### Deployment Commands

**Initial deployment:**

```bash
# 1. Clone repository
git clone https://github.com/yourusername/tross.git
cd tross

# 2. Set environment variables
cp .env.example .env.production
nano .env.production  # Edit with production values

# 3. Pull images
docker-compose -f docker-compose.prod.yml pull

# 4. Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify health
curl http://localhost:3001/api/health
```

**Update deployment:**

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart services (zero-downtime with health checks)
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost:3001/api/health
```

---

## CI/CD with GitHub Actions

### Automated Deployment Workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run backend tests
        run: |
          cd backend
          npm install
          npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker images
        run: |
          docker build -t tross/backend:latest ./backend
          docker build -t tross/frontend:latest ./frontend
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push tross/backend:latest
          docker push tross/frontend:latest

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SERVER }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/tross
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
```

### Required GitHub Secrets

Configure in repository Settings → Secrets:

```
DOCKER_USERNAME - Docker Hub username
DOCKER_PASSWORD - Docker Hub password/token
PROD_SERVER - Production server IP/domain
PROD_USER - SSH username
SSH_PRIVATE_KEY - SSH private key for deployment
```

---

## Database Migrations

### Production Migration Strategy

**Before deployment:**

1. Backup database
2. Test migrations on staging
3. Plan rollback strategy

**Migration commands:**

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Rollback last migration
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate:rollback

# Check migration status
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate:status
```

**Best practices:**

- Always write `down()` migrations (rollback)
- Test migrations on staging first
- Never edit applied migrations (create new ones)
- Backup before running migrations

---

## Monitoring & Health Checks

### Health Endpoints

**Application health:**

```bash
curl http://localhost:3001/api/health

{
  "status": "healthy",
  "timestamp": "2025-11-19T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Database health:**

```bash
curl http://localhost:3001/api/health/db

{
  "status": "connected",
  "responseTime": 5
}
```

### Docker Health Checks

Built into `docker-compose.prod.yml`:

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Log Monitoring

**Application logs:**

```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Filter by service
docker-compose -f docker-compose.prod.yml logs backend
```

**Log rotation:** Configured in docker-compose (10MB max, 3 files)

---

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

**Certbot setup:**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates saved to: /etc/letsencrypt/live/your-domain.com/
```

**Auto-renewal:**

```bash
# Add to crontab
0 0 * * * certbot renew --quiet
```

### Nginx SSL Configuration

**File:** `nginx.conf`

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Rollback Strategy

### Rollback to Previous Version

**Quick rollback:**

```bash
# Tag current version
docker tag tross/backend:latest tross/backend:v1.2.3

# Pull previous version
docker pull tross/backend:v1.2.2

# Tag as latest
docker tag tross/backend:v1.2.2 tross/backend:latest

# Restart
docker-compose -f docker-compose.prod.yml up -d

# Rollback migrations if needed
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate:rollback
```

---

## Security Checklist

**Before deployment:**

- [ ] Strong JWT_SECRET (64+ chars, mixed case/numbers/special)
- [ ] DATABASE_URL doesn't use localhost
- [ ] Auth0 production credentials configured
- [ ] CORS restricted to production domain
- [ ] SSL/TLS certificate valid
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] No secrets in git repository
- [ ] Docker containers run as non-root
- [ ] Firewall configured (only 80/443 open)
- [ ] Database backups automated
- [ ] Log aggregation configured

---

## Backup & Recovery

### Database Backups

**Automated backup script:**

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="tross_prod"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Schedule with cron:**

```bash
0 2 * * * /opt/tross/scripts/backup-db.sh
```

### Restore from Backup

```bash
# Restore database
gunzip -c /backups/backup_20251119_020000.sql.gz | psql $DATABASE_URL
```

---

## Troubleshooting

### Service Won't Start

**Check logs:**

```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Common issues:**

- Missing environment variables → Check `.env.production`
- Database connection failed → Verify `DATABASE_URL`
- Port already in use → Check what's using port 3001

### High Memory Usage

**Check container stats:**

```bash
docker stats
```

**Optimize:**

- Reduce `DB_POOL_MAX` if too many connections
- Increase server resources
- Enable query caching

### Slow API Responses

**Check database:**

```bash
# View slow queries
docker-compose -f docker-compose.prod.yml logs backend | grep "Slow query"
```

**Optimize:**

- Add database indexes
- Review N+1 query patterns
- Enable query result caching

---

## Production Checklist

**Infrastructure:**

- [ ] Server provisioned (2GB+ RAM recommended)
- [ ] Docker installed and running
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Firewall configured

**Configuration:**

- [ ] `.env.production` created with all variables
- [ ] Secrets generated and secured
- [ ] Auth0 production app configured
- [ ] Database created and migrations run

**Deployment:**

- [ ] Docker images built and pushed
- [ ] Services started with docker-compose
- [ ] Health checks passing
- [ ] SSL working (https://)
- [ ] Monitoring configured

**Post-Deployment:**

- [ ] Test authentication (dev + Auth0)
- [ ] Test CRUD operations
- [ ] Verify logs are writing
- [ ] Confirm backups running
- [ ] Monitor for errors

---

## Further Reading

- [Architecture](ARCHITECTURE.md) - System design overview
- [Security](SECURITY.md) - Security hardening details
- [Development](DEVELOPMENT.md) - Local development setup
