# Environment Variables Reference

Complete reference for all environment variables used in Tross.

## Quick Start

Copy `.env.example` to `.env` and configure required variables:

```bash
cp backend/.env.example backend/.env
```

## Required Variables

> **Source of truth:** Default values are defined in [`backend/config/deployment-adapter.js`](../backend/config/deployment-adapter.js) and [`backend/config/constants.js`](../backend/config/constants.js). Refer to those files for current defaults.

### Database Configuration

| Variable       | Description                    | Example                                               | Required         |
| -------------- | ------------------------------ | ----------------------------------------------------- | ---------------- |
| `DATABASE_URL` | Full PostgreSQL connection URL | `postgresql://user:pass@host:5432/db?sslmode=require` | Yes (production) |
| `DB_HOST`      | Database host (fallback)       | `localhost`                                           | No               |
| `DB_PORT`      | Database port (fallback)       | `5432`                                                | No               |
| `DB_NAME`      | Database name (fallback)       | `tross`                                               | No               |
| `DB_USER`      | Database user (fallback)       | `postgres`                                            | No               |
| `DB_PASSWORD`  | Database password (fallback)   | `secret`                                              | No               |
| `DB_POOL_MIN`  | Minimum pool connections       | See `deployment-adapter.js`                           | No               |
| `DB_POOL_MAX`  | Maximum pool connections       | See `deployment-adapter.js`                           | No               |

> **Note**: `DATABASE_URL` takes precedence over individual DB\_\* variables.

### Authentication

| Variable          | Description            | Example                     | Required             |
| ----------------- | ---------------------- | --------------------------- | -------------------- |
| `JWT_SECRET`      | Secret for JWT signing | 32+ character random string | Yes (production)     |
| `AUTH0_DOMAIN`    | Auth0 tenant domain    | `yourapp.auth0.com`         | Yes (if using Auth0) |
| `AUTH0_AUDIENCE`  | Auth0 API identifier   | `https://api.yourapp.com`   | Yes (if using Auth0) |
| `AUTH0_CLIENT_ID` | Auth0 client ID        | (from Auth0 dashboard)      | Yes (if using Auth0) |

> **Default (development)**: `JWT_SECRET` defaults to `'dev-secret-key'` - never use in production!

### Server Configuration

| Variable       | Description             | Default               | Required |
| -------------- | ----------------------- | --------------------- | -------- |
| `NODE_ENV`     | Environment mode        | `development`         | No       |
| `PORT`         | Server port             | See `config/ports.js` | No       |
| `BACKEND_PORT` | Alternative port config | See `config/ports.js` | No       |

### CORS & Security

| Variable          | Description                    | Default                 | Required |
| ----------------- | ------------------------------ | ----------------------- | -------- |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins   | `http://localhost:3000` | No       |
| `FRONTEND_URL`    | Primary frontend URL           | `http://localhost:3000` | No       |
| `CDN_DOMAIN`      | CDN for CSP img-src            | (empty)                 | No       |
| `API_DOMAIN`      | API domain for CSP connect-src | (empty)                 | No       |

### Rate Limiting

> **Defaults:** See `OPTIONAL_ENV_VARS` in [`backend/config/deployment-adapter.js`](../backend/config/deployment-adapter.js)

| Variable                  | Description             | Default    | Required |
| ------------------------- | ----------------------- | ---------- | -------- |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window (ms)  | See source | No       |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | See source | No       |
| `REQUEST_TIMEOUT_MS`      | Request timeout (ms)    | See source | No       |

### Logging

| Variable     | Description   | Default                        | Required |
| ------------ | ------------- | ------------------------------ | -------- |
| `LOG_LEVEL`  | Log verbosity | `debug` (dev) / `info` (prod)  | No       |
| `LOG_FORMAT` | Log format    | `json` (prod) / `pretty` (dev) | No       |

## Platform-Specific Variables

### Railway

| Variable                | Description            | Set By  |
| ----------------------- | ---------------------- | ------- |
| `RAILWAY_ENVIRONMENT`   | Deployment environment | Railway |
| `RAILWAY_REGION`        | Deployment region      | Railway |
| `RAILWAY_DEPLOYMENT_ID` | Current deployment ID  | Railway |

### Render

| Variable            | Description             | Set By |
| ------------------- | ----------------------- | ------ |
| `RENDER`            | Set to `true` on Render | Render |
| `RENDER_GIT_COMMIT` | Git commit SHA          | Render |

### Fly.io

| Variable       | Description       | Set By |
| -------------- | ----------------- | ------ |
| `FLY_APP_NAME` | Application name  | Fly.io |
| `FLY_REGION`   | Deployment region | Fly.io |

### Heroku

| Variable             | Description     | Set By |
| -------------------- | --------------- | ------ |
| `DYNO`               | Dyno identifier | Heroku |
| `HEROKU_SLUG_COMMIT` | Git commit SHA  | Heroku |

## Development vs Production

### Development Defaults

> **Note:** These are illustrative examples. Actual defaults are defined in source files.
> See [`backend/config/deployment-adapter.js`](../backend/config/deployment-adapter.js) for current values.

```env
NODE_ENV=development
JWT_SECRET=dev-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tross_dev
DB_USER=postgres
DB_PASSWORD=postgres
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Production Requirements

| Check | Requirement                                        |
| ----- | -------------------------------------------------- |
| ✅    | `JWT_SECRET` is a secure random string (32+ chars) |
| ✅    | `DATABASE_URL` uses SSL (`?sslmode=require`)       |
| ✅    | `NODE_ENV=production` is set                       |
| ✅    | `ALLOWED_ORIGINS` contains only your domains       |
| ✅    | Auth0 variables are configured (if using Auth0)    |

## Example Configurations

### Local Development

```env
NODE_ENV=development
PORT=3001

# Database (local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tross_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Auth (development mode - no Auth0 needed)
JWT_SECRET=dev-secret-key-for-local-only

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Docker Compose

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@db:5432/tross
JWT_SECRET=dev-secret-key
```

### Railway Production

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=${{shared.JWT_SECRET}}
AUTH0_DOMAIN=yourapp.auth0.com
AUTH0_AUDIENCE=https://api.yourapp.com
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

## Security Notes

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate `JWT_SECRET`** periodically in production
3. **Use strong secrets** - Minimum 32 characters, random
4. **Restrict `ALLOWED_ORIGINS`** - Only include your actual domains
5. **Enable SSL** - Always use `sslmode=require` for production databases

## Troubleshooting

### "JWT_SECRET not set" warning

Set `JWT_SECRET` in your environment. For development, any value works.

### Database connection failed

1. Check `DATABASE_URL` or individual `DB_*` variables
2. Ensure PostgreSQL is running
3. Verify network access (especially in Docker)

### CORS errors

Add your frontend URL to `ALLOWED_ORIGINS` (comma-separated, no spaces).

### Auth0 errors

1. Verify `AUTH0_DOMAIN` matches your Auth0 tenant
2. Check `AUTH0_AUDIENCE` matches your API identifier
3. Ensure Auth0 application is configured correctly
