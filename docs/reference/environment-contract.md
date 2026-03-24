# Environment Contract

> **Single Source of Truth**: [`backend/config/app-mode.js`](../../backend/config/app-mode.js)

This document describes the unified environment system that governs all runtime behavior across the Tross application.

## Three-Mode Architecture

The application operates in exactly **one of three modes** at any time:

| Mode | NODE_ENV | When Active | Primary Use |
|------|----------|-------------|-------------|
| `TEST` | `test` | Automated testing | CI/CD, local test runs |
| `LOCAL_DEV` | `development` | Local development | Daily development |
| `PRODUCTION` | `production` | Deployed | Railway, Vercel |

### Mode Detection Logic

```javascript
function getAppMode() {
  // 1. NODE_ENV=test → TEST
  if (process.env.NODE_ENV === 'test') return AppMode.TEST;
  
  // 2. NODE_ENV=production OR RAILWAY_ENVIRONMENT → PRODUCTION
  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
    return AppMode.PRODUCTION;
  }
  
  // 3. Otherwise → LOCAL_DEV
  return AppMode.LOCAL_DEV;
}
```

## Feature Flags (Derived from Mode)

All feature flags are **derived from the mode**. There are no independent environment variables that control features.

| Flag | TEST | LOCAL_DEV | PRODUCTION |
|------|------|-----------|------------|
| `devAuthEnabled()` | ✓ | ✓ | ✗ |
| `useInMemoryUsers()` | ✗ | opt-in¹ | ✗ |
| `verboseLogging()` | ✓ | ✓ | ✗ |
| `swaggerEnabled()` | ✗ | ✓ | ✗ |

¹ Requires explicit `MOCK_USERS=true` in LOCAL_DEV mode

### Feature Flag Descriptions

#### `devAuthEnabled()`
Controls whether development authentication tokens are accepted.
- **TRUE**: Test tokens created by `createTestUser()` are valid
- **FALSE**: Returns 403 FORBIDDEN for any dev token (production security)

#### `useInMemoryUsers()`
Controls whether in-memory TEST_USERS are used instead of database.
- **Explicit opt-in**: Requires `MOCK_USERS=true` in LOCAL_DEV
- **Use case**: Local testing without Docker/database running
- **Note**: Integration tests always use real database

#### `verboseLogging()`
Controls logging verbosity level.
- **TRUE**: Debug-level logs, full stack traces
- **FALSE**: Info-level, structured JSON (production)

#### `swaggerEnabled()`
Controls Swagger API documentation endpoint.
- **TRUE**: `/api-docs` route available
- **FALSE**: Route disabled (security in production)

## Database Configuration by Mode

| Mode | Database | Host | Port |
|------|----------|------|------|
| `TEST` | `tross_test` | localhost | 5433 |
| `LOCAL_DEV` | `tross_dev` | localhost | 5432 |
| `PRODUCTION` | — | `DATABASE_URL` | — |

```javascript
const config = getDatabaseConfigForMode();
// Returns appropriate database config for current mode
```

## JWT Secret Management

| Mode | JWT Secret Source |
|------|-------------------|
| `TEST` | `TEST_JWT_SECRET` constant |
| `LOCAL_DEV` | `JWT_SECRET` env var |
| `PRODUCTION` | `JWT_SECRET` env var (required) |

The `TEST_JWT_SECRET` constant is defined in `app-mode.js` and is intentionally obvious:
```javascript
const TEST_JWT_SECRET = 'test-only-jwt-secret-do-not-use-in-production';
```

## Environment Variables Reference

### Required Variables

| Variable | Required In | Description |
|----------|-------------|-------------|
| `NODE_ENV` | All | Must be `test`, `development`, or `production` |
| `JWT_SECRET` | PRODUCTION | JWT signing secret (must be cryptographically strong) |
| `DATABASE_URL` | PRODUCTION | PostgreSQL connection string |

### Optional Variables

| Variable | Mode | Effect |
|----------|------|--------|
| `MOCK_USERS` | LOCAL_DEV | Set to `true` to use in-memory users |
| `RAILWAY_ENVIRONMENT` | — | Auto-detected; forces PRODUCTION mode |

### Removed Variables (Legacy)

These variables were removed in the environment cleanup:
- `AUTH_MODE` — Now derived from mode, not set independently
- `USE_TEST_AUTH` — Replaced by `MOCK_USERS` for clarity

## Usage Examples

### Importing the Module

```javascript
// New code: Import from app-mode.js
const { 
  AppMode,
  getAppMode,
  isTestMode,
  isLocalDev,
  isProduction,
  devAuthEnabled,
  useInMemoryUsers,
  TEST_JWT_SECRET,
} = require('./config/app-mode');

// Legacy code: environment.js re-exports for backwards compatibility
const { isTest, isDevelopment } = require('./config/environment');
```

### Conditional Logic

```javascript
// ✓ GOOD: Use derived flags
if (devAuthEnabled()) {
  // Accept dev tokens
}

// ✗ AVOID: Direct env var checks
if (process.env.NODE_ENV === 'development') {
  // Scattered, inconsistent
}
```

### Database Access

```javascript
const { getDatabaseConfigForMode } = require('./config/app-mode');
const config = getDatabaseConfigForMode();
const pool = new Pool(config);
```

## Architecture Decisions

### Why Three Modes?

- **TEST**: Isolated, repeatable, fast (tmpfs database)
- **LOCAL_DEV**: Full stack for realistic development
- **PRODUCTION**: Security-hardened, no dev features

### Why Derived Flags?

Derived flags prevent configuration drift:
- No way to accidentally enable dev auth in production
- Single enum change cascades to all features
- Easier to audit security posture

### Why Explicit Opt-In for Mock Users?

`useInMemoryUsers()` requires explicit `MOCK_USERS=true` because:
- Prevents accidental data loss (expecting real DB)
- Makes it obvious when running in degraded mode
- Fails secure: defaults to real database

## Troubleshooting

### Tests Fail with Auth Errors

1. Check `NODE_ENV=test` is set
2. Verify `TEST_JWT_SECRET` is being used (not production secret)
3. Confirm `devAuthEnabled()` returns `true` in test context

### Local Dev Can't Find Users

1. Check if Docker is running (`docker ps`)
2. Or set `MOCK_USERS=true` to use in-memory users
3. Verify database is seeded with test users

### Production Rejects Dev Tokens

**This is correct behavior.** Production mode (`NODE_ENV=production`) disables dev authentication for security. Use Auth0 tokens in production.

## Related Documentation

- [App Config](./app-config.md) — Central configuration service
- [Authentication Architecture](../architecture/authentication.md)
- [Getting Started](../getting-started/README.md)
