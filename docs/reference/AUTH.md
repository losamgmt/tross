# Authentication

Dual authentication system: dev mode for rapid development, Auth0 for production.

---

## Authentication Philosophy

**Why Dual Auth:**

- **Development speed** - No Auth0 setup needed for local dev
- **Production security** - Industry-standard OAuth2/OIDC
- **Strategy pattern** - Both modes coexist cleanly

**Design decision:** Never compromise security for convenience. Dev mode is isolated, production is bulletproof.

---

## Architecture

### Strategy Pattern

```
AuthStrategy (Base)
├── DevelopmentStrategy → File-based test users
└── Auth0Strategy → OAuth2/OIDC
```

**Why Strategy Pattern:**

- Both auth methods work simultaneously
- Easy to add new providers (SAML, LDAP, etc.)
- Clean separation of concerns
- No conditional auth logic scattered across codebase

---

## Development Authentication

### Purpose

Fast local development without Auth0 configuration.

### How It Works

1. Pre-configured test users in `backend/config/test-users.js`
2. Request dev token via `GET /api/dev/token?role=admin`
3. Instant JWT generation (no external API calls)
4. Full RBAC permissions for testing

### Test Users

```javascript
// backend/config/test-users.js
admin@dev.local      // Admin (full access)
manager@dev.local    // Manager (team management)
dispatcher@dev.local // Dispatcher (work order assignment)
tech@dev.local       // Technician (own work orders)
customer@dev.local   // Customer (own data only)
```

### Login Flow

```bash
GET /api/dev/token?role=admin

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "email": "admin@tross.dev",
      "role": "admin"
    },
    "provider": "development",
    "expires_in": 86400
  }
}
```

**Security:** Dev tokens are REJECTED in production (`AppConfig.devAuthEnabled` check).

---

## Production Authentication (Auth0)

### Purpose

Industry-standard OAuth2/OIDC for production security.

### Why Auth0

- **Security expertise** - Auth is their core business
- **OAuth2/OIDC compliant** - Industry standards
- **MFA ready** - Two-factor authentication
- **Social login** - Google, GitHub, etc.
- **Reduces attack surface** - We don't store passwords

### Authentication Flow

```
User → Auth0 Login UI → OAuth2 Authorization Code Flow
  ↓
Auth0 validates credentials (password, social, MFA)
  ↓
Redirect to /api/auth0/callback with code
  ↓
Backend exchanges code for Auth0 token (RS256)
  ↓
Backend creates internal JWT (HS256) + stores user
  ↓
Return token to frontend
```

### Token Exchange (RS256 → HS256)

**Why two tokens?**

- **Auth0 token (RS256):** Verifies identity, short-lived
- **Internal JWT (HS256):** App authorization, our control

**Process:**

1. Verify Auth0 token signature (JWKS)
2. Extract user info (email, auth0_id)
3. Create/update user in our database
4. Generate internal JWT with our roles
5. Return internal JWT to client

### Mobile Auth Flow (iOS/Android)

Mobile uses the Auth0 Flutter SDK with a token exchange step:

```
User → Auth0 SDK (native browser) → Google/social login
  ↓
Auth0 returns id_token + access_token to app
  ↓
App calls POST /api/auth0/validate with id_token
  ↓
Backend verifies Auth0 token, creates/finds user
  ↓
Backend returns app_token (HS256 JWT)
  ↓
App uses app_token for all API calls
```

**Key difference from web:**

- Web uses PKCE with authorization code flow
- Mobile uses Auth0 SDK which handles PKCE internally
- Both exchange Auth0 tokens for backend app_token via `/api/auth0/validate`

**Configuration:**

- Android: `android/app/build.gradle` with `manifestPlaceholders`
- iOS: `ios/Runner/Info.plist` with `CFBundleURLSchemes`
- Both use scheme: `com.tross.auth0`

**Code:**

```javascript
// backend/services/auth/Auth0Strategy.js
const auth0Token = verifyAuth0Token(code); // RS256 verification
const user = await User.findOrCreate(auth0Token.email);
const internalJwt = generateToken(user); // HS256 with our roles
return { token: internalJwt, user };
```

---

## Authorization (RBAC)

### Role Hierarchy

Roles are a **database entity** with a `priority` field that defines the hierarchy:

```
Admin (priority=5)       Full system access
  ↓
Manager (priority=4)     Team management, reports
  ↓
Dispatcher (priority=3)  Work order assignment
  ↓
Technician (priority=2)  Own work orders
  ↓
Customer (priority=1)    Own data only
```

> **SSOT:** The `roles` table in the database is the single source of truth for role definitions.
> The `priority` column determines hierarchy — higher priority = more permissions.
> See `backend/schema.sql` for the roles table definition.

**Hierarchy rule:** Higher priority roles inherit lower priority permissions.

### Permission Format

```
resource:action

Examples:
users:read        // View users
customers:create  // Create customers
work_orders:update // Update work orders
```

### Permission Check

```javascript
// backend/middleware/auth.js
function requirePermission(permission) {
  return (req, res, next) => {
    const [resource, action] = permission.split(':');

    if (!hasPermission(req.user.role, resource, action)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
router.post('/api/customers',
  authenticateToken,           // Layer 1: Verify identity
  requirePermission('customers:create'), // Layer 2: Check permission
  async (req, res) => { ... }
);
```

### Permission Matrix

See `config/permissions.json` for complete matrix.

**Example:**

```json
{
  "admin": {
    "users": ["create", "read", "update", "delete"],
    "customers": ["create", "read", "update", "delete"]
  },
  "technician": {
    "work_orders": ["read", "update"],
    "customers": ["read"]
  }
}
```

---

## JWT Token Standard

### Token Structure (RFC 7519)

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 123,
    "email": "user@example.com",
    "role": "admin",
    "iat": 1700000000,
    "exp": 1700003600
  },
  "signature": "..."
}
```

### Token Lifecycle

- **Access Token:** 15 minutes lifetime
- **Refresh Token:** 7 days lifetime
- **Refresh endpoint:** `/api/auth/refresh`
- **Proactive refresh:** Frontend refreshes 5 minutes before expiry

### Proactive Token Refresh

The frontend proactively refreshes tokens before expiration to prevent abrupt logouts:

**Components:**

- `TokenRefreshManager` - Schedules refresh 5 minutes before expiry
- `WidgetsBindingObserver` - Checks token on app resume from background
- `TokenManager` - Stores token expiry timestamp

**Flow:**

1. On login/refresh, `AuthTokenService` parses JWT `exp` claim
2. Expiry stored in secure storage via `TokenManager`
3. `TokenRefreshManager` schedules Timer for 5 minutes before expiry
4. On app resume, checks if token needs refresh
5. On refresh success, reschedules next refresh
6. On refresh failure, triggers logout

**Fallback:** If proactive refresh fails, the reactive 401 interceptor in `ApiClient` attempts refresh.

### Token Refresh

```bash
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",  // New 1-hour token
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."  // New 7-day token
}
```

---

## Session Management

### Multi-Device Support

Users can be logged in on multiple devices simultaneously.

### Session Endpoints

```bash
GET /api/auth/sessions       # List active sessions
POST /api/auth/logout        # Logout current device
POST /api/auth/logout-all    # Logout all devices
```

### Session Storage

Sessions tracked in `refresh_tokens` table:

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
```

---

## Audit Logging

All authentication events logged to `audit_logs` table:

**Logged Events:**

- `auth.login.success` / `auth.login.failure`
- `auth.logout`
- `auth.token.refresh`
- `auth.permission.denied`

**Example:**

```javascript
await auditService.logEvent(
  "auth.login.success",
  {
    email: user.email,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  },
  user.id,
);
```

---

## Setup Guide

### Development Mode (No Setup)

Works out of the box. Just start the backend:

```bash
cd backend
npm run dev
```

### Production Mode (Auth0)

**1. Create Auth0 Application**

- Go to [auth0.com](https://auth0.com)
- Create new "Regular Web Application"
- Note: Domain, Client ID, Client Secret

**2. Configure URLs (supports Vercel previews)**

```
Allowed Callback URLs:
http://localhost:8080/callback
https://trossapp.vercel.app/callback
https://*-zarika-ambers-projects.vercel.app/callback

Allowed Logout URLs:
http://localhost:8080
https://trossapp.vercel.app
https://*-zarika-ambers-projects.vercel.app

Allowed Web Origins:
http://localhost:8080
https://trossapp.vercel.app
https://*-zarika-ambers-projects.vercel.app

Allowed Origins (CORS):
http://localhost:8080
https://trossapp.vercel.app
https://*-zarika-ambers-projects.vercel.app
```

**3. Configure Branding (Optional)**
Go to Branding → Universal Login → Settings:

- **Logo**: Upload your app logo (200x200px recommended)
- **Favicon**: Upload favicon to fix browser tab icon (32x32px .ico or .png)
- **Primary Color**: Set to match your app's theme
- **Background**: Customize login page background

**4. Set Environment Variables**

```bash
# backend/.env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_CALLBACK_URL=http://localhost:3001/api/auth0/callback
```

**4. Restart Backend**

```bash
cd backend
npm run dev
```

Auth0 authentication now enabled alongside dev mode.

---

## Security Best Practices

### Token Security

- ✅ Store tokens in httpOnly cookies (XSS protection)
- ✅ Use secure flag in production (HTTPS only)
- ✅ Short access token lifetime (1 hour)
- ❌ Never store tokens in localStorage (XSS vulnerable)

### Password Requirements (if using database auth)

- Minimum 8 characters
- Mixed case, numbers, special characters
- Bcrypt hashing (cost factor 12)

### Rate Limiting

```javascript
// 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, try again later",
});

app.use("/api/auth/login", loginLimiter);
```

---

## Troubleshooting

### "Invalid token" errors

- Check token expiration (decode at jwt.io)
- Verify JWT_SECRET matches across environments
- Ensure token format: `Bearer <token>`

### Auth0 callback fails

- Verify callback URL matches Auth0 settings
- Check AUTH0\_\* environment variables
- Ensure Auth0 application is enabled

### Dev mode not working

- Check `NODE_ENV=development`
- Verify dev routes are registered at `/api/dev/*`
- Test with: `curl "http://localhost:3001/api/dev/token?role=admin"`

### Permission denied (403)

- Check user role in JWT payload
- Verify permission exists in `config/permissions.json`
- Ensure RBAC middleware is applied to route

---

## Further Reading

- [Security Guide](SECURITY.md) - Triple-tier security details
- [Architecture](ARCHITECTURE.md) - Strategy pattern explanation
- [API Documentation](API.md) - All auth endpoints
