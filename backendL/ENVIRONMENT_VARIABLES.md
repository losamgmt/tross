# Environment Variables Documentation

Complete guide to all environment variables used in TrossApp Backend.

---

## 🔴 REQUIRED Variables (Production)

These **MUST** be set in production or the server will refuse to start:

### Database
- `DB_HOST` - PostgreSQL server hostname
  - Example: `localhost`, `db.example.com`
  - Production: Use private network address
  
- `DB_PORT` - PostgreSQL server port
  - Default: `5432`
  - Test environment: `5433`
  
- `DB_NAME` - Database name
  - Development: `trossapp_dev`
  - Production: `trossapp_prod`
  - Test: `trossapp_test`
  
- `DB_USER` - Database username
  - Example: `trossapp_user`
  - Production: Use least-privilege user
  
- `DB_PASSWORD` - Database password
  - **CRITICAL**: Must be 12+ characters in production
  - **DO NOT** use default `tross123`
  - Use strong, randomly generated password

### Authentication
- `JWT_SECRET` - Secret key for signing JWT tokens
  - **CRITICAL**: Must be 32+ characters in production
  - **DO NOT** use default `dev-secret-key`
  - Generate: `openssl rand -base64 32`
  - Used for: Token signing and verification

---

## 🟡 REQUIRED (If Using Auth0)

Only needed when `AUTH_MODE=auth0`:

- `AUTH0_DOMAIN` - Auth0 tenant domain
  - Example: `your-tenant.auth0.com`
  - Get from: Auth0 Dashboard → Applications
  
- `AUTH0_CLIENT_ID` - Auth0 regular application client ID
  - Get from: Auth0 Dashboard → Applications → Your App
  - Used for: User authentication flows
  
- `AUTH0_CLIENT_SECRET` - Auth0 application client secret
  - Get from: Auth0 Dashboard → Applications → Your App → Settings
  - Keep secure: Never commit to git
  
- `AUTH0_AUDIENCE` - Auth0 API identifier
  - Example: `https://api.trossapp.com`
  - Get from: Auth0 Dashboard → APIs → Your API
  - Used for: Token validation

- `AUTH0_MANAGEMENT_CLIENT_ID` - Machine-to-Machine app client ID
  - Get from: Auth0 Dashboard → Applications → Machine to Machine Apps
  - Used for: Admin operations (assign roles, etc.)
  
- `AUTH0_MANAGEMENT_CLIENT_SECRET` - M2M app client secret
  - Get from: M2M app settings
  - Requires: Auth0 Management API permissions

---

## 🟢 OPTIONAL Variables (Have Defaults)

### Server Configuration
- `PORT` - HTTP server port
  - Default: `3001`
  - Production: Usually `3000` or `80`/`443` behind proxy
  
- `NODE_ENV` - Environment mode
  - Values: `development`, `production`, `test`
  - Default: `development`
  - Affects: Logging, error messages, CORS

### Authentication Mode
- `AUTH_MODE` - Authentication provider
  - Values: `auth0`, `development`
  - Default: `development`
  - Development: Uses test-users.js (no database)
  - Production: **MUST** be `auth0`

- `USE_TEST_AUTH` - Enable development auth endpoints
  - Values: `true`, `false`
  - Default: `false`
  - Enables: `/api/dev/*` endpoints
  - **WARNING**: Never enable in production

### JWT Configuration
- `JWT_EXPIRE` - JWT token expiration time
  - Default: `24h`
  - Examples: `1h`, `30m`, `7d`
  - Production: Consider shorter for security (1-2h)

### API Configuration
- `API_URL` - Public API URL
  - Default: `http://localhost:3001`
  - Production: `https://api.trossapp.com`
  - Used for: JWT issuer claim, CORS

- `FRONTEND_URL` - Frontend application URL
  - Default: `http://localhost:8080`
  - Production: `https://app.trossapp.com`
  - Used for: CORS, Auth0 callbacks

- `CORS_ORIGIN` - Allowed CORS origins
  - Default: `*` (development only)
  - Production: Specific domains only
  - Example: `https://app.trossapp.com,https://admin.trossapp.com`

### Logging
- `LOG_LEVEL` - Winston logging level
  - Values: `error`, `warn`, `info`, `debug`
  - Default: `info`
  - Production: `warn` or `error`
  - Development: `debug`

### File Uploads
- `MAX_FILE_SIZE` - Maximum upload size
  - Default: `10mb`
  - Format: Size with unit (mb, gb, kb)
  
- `UPLOAD_PATH` - Upload directory
  - Default: `./uploads`
  - Production: Use cloud storage (S3, etc.)

---

## 🔵 TEST-ONLY Variables

Used by automated tests:

- `TEST_DB_HOST` - Test database host
  - Default: `localhost`
  
- `TEST_DB_PORT` - Test database port
  - Default: `5433` (separate from main)
  
- `TEST_DB_NAME` - Test database name
  - Default: `trossapp_test`
  
- `TEST_DB_USER` - Test database user
  - Default: `trossapp_test_user`
  
- `TEST_DB_PASSWORD` - Test database password
  - Default: `test123`

---

## 🔒 Security Best Practices

### Production Checklist
- [ ] Change `JWT_SECRET` to 32+ character random string
- [ ] Change `DB_PASSWORD` to strong password (12+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `AUTH_MODE=auth0` (no development auth!)
- [ ] Set `USE_TEST_AUTH=false`
- [ ] Use HTTPS URLs in `API_URL` and `FRONTEND_URL`
- [ ] Set specific domains in `CORS_ORIGIN` (no wildcards)
- [ ] Set `LOG_LEVEL=warn` or `error`

### Never Commit
- Real database passwords
- JWT secrets
- Auth0 client secrets
- API keys
- Any production credentials

### Generate Secrets
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 24

# Generate API key
openssl rand -hex 32
```

---

## 📋 Environment-Specific Examples

### Development (.env)
```bash
NODE_ENV=development
PORT=3001
DB_NAME=trossapp_dev
DB_PASSWORD=tross123
JWT_SECRET=dev-secret-key
AUTH_MODE=development
USE_TEST_AUTH=true
LOG_LEVEL=debug
```

### Production (.env.production)
```bash
NODE_ENV=production
PORT=3001
DB_HOST=internal-db.vpc.example.com
DB_NAME=trossapp_prod
DB_PASSWORD=<strong-random-password>
JWT_SECRET=<32-char-random-secret>
AUTH_MODE=auth0
USE_TEST_AUTH=false
LOG_LEVEL=warn
API_URL=https://api.trossapp.com
FRONTEND_URL=https://app.trossapp.com
CORS_ORIGIN=https://app.trossapp.com
AUTH0_DOMAIN=trossapp.auth0.com
AUTH0_CLIENT_ID=<auth0-client-id>
AUTH0_CLIENT_SECRET=<auth0-secret>
AUTH0_AUDIENCE=https://api.trossapp.com
```

### Test (set in CI/CD)
```bash
NODE_ENV=test
DB_NAME=trossapp_test
DB_PORT=5433
JWT_SECRET=test-secret-key
```

---

## 🔧 Validation

The server validates critical variables on startup:

**In Production:**
- Checks for missing required variables
- Validates JWT_SECRET strength (32+ chars)
- Validates DB_PASSWORD strength (12+ chars)
- Validates Auth0 configuration (if enabled)
- **Exits with error** if validation fails

**In Development:**
- Uses defaults for most variables
- Allows weak secrets (for convenience)
- Logs warnings for missing optionals

---

## 📖 Related Documentation

- [.env.example](/.env.example) - Template with all variables
- [.env.auth0.template](/.env.auth0.template) - Auth0-specific template
- [AUTH0_SETUP.md](/docs/AUTH0_SETUP.md) - Auth0 integration guide
- [DEPLOYMENT.md](/docs/DEPLOYMENT.md) - Production deployment guide
