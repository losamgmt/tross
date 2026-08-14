# Deployment

How Tross is deployed, and the platform-agnostic design that keeps it portable.

---

## Deployment Model

**Tross runs on a managed platform** — the backend on Railway and the frontend on Vercel, deployed automatically from Git. There is **no self-hosted Docker/SSH/Nginx stack**; TLS, scaling, and the build pipeline are handled by the platform.

**Platform-agnostic by design:** the app reads its configuration from the environment (via `backend/config/deployment-adapter.js`), so it can run on any platform that supplies a database connection and the required secrets. Nothing in the application code is tied to a specific host.

For the actual deployment, CI/CD, health, and rollback procedures, see the operational runbooks:

- **[CI/CD Guide](CI_CD_GUIDE.md)** — the Railway + Vercel pipeline
- **[Health Monitoring](HEALTH_MONITORING.md)**
- **[Rollback](ROLLBACK.md)**
- **[Secrets](SECRETS.md)** — required environment secrets

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

> **Source of truth:** See [`backend/config/deployment-adapter.js`](../../backend/config/deployment-adapter.js) for current defaults.

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

> **Note:** Default values come from source files. See [`config/ports.js`](../../config/ports.js) and [`backend/config/deployment-adapter.js`](../../backend/config/deployment-adapter.js).

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

# Security (CRITICAL - generate strong secrets; minimum strength is enforced at startup)
JWT_SECRET=<a strong random secret>

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
openssl rand -base64 48
```

The startup **environment validator** enforces the minimum strength in production (fail-fast) — the validator is the source of truth. Never commit secrets; rotate them periodically.

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

**railway.json** handles build configuration. See [`railway.json`](../../railway.json).

### Deployment Process

1. Push to `main` branch
2. Railway auto-deploys via GitHub integration
3. Health checks verify deployment: `<your-backend-url>/api/health`

---

## CI/CD

Deployment is automated from Git by the platform (push to `main` → Railway/Vercel build and deploy). The pipeline, required checks, and secrets are documented in the **[CI/CD Guide](CI_CD_GUIDE.md)** and **[Secrets](SECRETS.md)**.

---

## Database Schema & Migrations

Entity tables are DERIVED from metadata into `backend/schema.sql` (see [DATABASE_ARCHITECTURE.md](../architecture/DATABASE_ARCHITECTURE.md)). Deployment initializes the database through a single parameterized tool — `backend/scripts/deploy-db.js` (`npm run db:deploy`) — which supports **two interchangeable strategies, built in from the start:**

| Strategy | What it does | Data | When |
| --- | --- | --- | --- |
| **`rebuild`** (default) | Applies `schema.sql` (which DROPs + recreates all tables) then seeds. Clean slate on every deploy. | **Not preserved** | Pre-launch — chosen for its straightforwardness while the schema is still moving. |
| **`migrate`** | Applies pending forward-only numbered migrations from `backend/migrations/` on top of the existing schema (tracked in `schema_migrations`; idempotent; transactional). A fresh database is bootstrapped to the current schema and baselined, so the command works either way. | **Preserved** | Go-live and beyond, once real data must survive deploys. |

**Selecting the strategy** (first match wins): `--strategy=<rebuild|migrate>` → `DEPLOY_DB_STRATEGY` env → default `rebuild`. The Railway start command is strategy-agnostic (`node scripts/deploy-db.js`), so deploy behavior is switched with an **environment variable — no code change.**

```bash
npm run db:deploy                            # rebuild (default) + demo seed
npm run db:deploy:rebuild                    # explicit clean rebuild
npm run db:deploy:migrate                    # forward migrations (data-preserving)
DEPLOY_DB_SEED=essential npm run db:deploy   # rebuild with the minimal seed
```

### Current mode: rebuild (pre-launch)

`schema.sql` opens with a `DROP TABLE … CASCADE` reset block, so each deploy rebuilds and reseeds — real data is not preserved (login survives because the seed recreates the admin users). This is the intended pre-launch behavior. Seeds: `seeds/demo-data.sql` (full demo dataset — the deploy default) or `seeds/essential-data.sql` (roles + admin + preferences + settings only).

### Switching to data-preserving deploys (go-live)

1. Regenerate a preserve-mode schema (omits the DROP block; tables become `CREATE TABLE IF NOT EXISTS`): `npm run compose:schema -- --no-drop`.
2. Set `DEPLOY_DB_STRATEGY=migrate` in the Railway environment.

Deploys then apply only new numbered migrations and preserve data. Forward-migration tooling:

```bash
npm run db:migrate                        # apply pending migrations
npm run db:migrate:status                 # applied vs pending
node scripts/run-migrations.js --dry-run  # preview without applying
node scripts/run-migrations.js --verify   # checksum-integrity check
```

**Migration authoring:**

- One change per file, named `NNN_description.sql` (3-digit prefix); keep each idempotent (`IF [NOT] EXISTS`).
- Never edit an applied migration — add a new one (checksums detect drift).
- Back up the database before a structural change.

---

## Monitoring & Health Checks

### Health Endpoints

> **Note:** Replace `<BACKEND_PORT>` with your actual port. See `config/ports.js`.

**Application health:**

```bash
curl http://localhost:<BACKEND_PORT>/api/health

{
  "status": "healthy",
  "timestamp": "<ISO-8601-timestamp>",
  "database": "connected"
}
```

**Database health:**

```bash
curl http://localhost:<BACKEND_PORT>/api/health/db

{
  "status": "connected",
  "responseTime": "<ms>"
}
```

### Logs, Health & TLS

On the managed platform, container health, logs, restarts, and TLS certificates are handled by the platform (via its dashboard) — there is no manual Nginx or Let's Encrypt setup. See **[Health Monitoring](HEALTH_MONITORING.md)**.

---

## Rollback

Rollbacks are performed by redeploying a previous build on the platform (with a forward database fix if needed) — see **[Rollback](ROLLBACK.md)**. Database migrations are forward-only.

---

## Security Checklist

**Before deployment:**

- [ ] Strong signing secret (meets the enforced minimum strength)
- [ ] Production (non-local) database URL
- [ ] Auth0 production credentials configured
- [ ] CORS restricted to the production frontend origin
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] No secrets in the git repository
- [ ] Database backups enabled (platform-managed)

---

## Backups

The managed database provides automated backups and point-in-time recovery; configure retention in the platform. For an ad-hoc logical backup or restore, use `pg_dump` / `psql` against the database URL.

---

## Further Reading

- [Architecture](../architecture/ARCHITECTURE.md) - System design overview
- [Security](../reference/SECURITY.md) - Security hardening details
- [Development](../getting-started/DEVELOPMENT.md) - Local development setup
