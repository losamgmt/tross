# 🔐 TrossApp Authentication & Authorization Guide

**Complete guide to TrossApp's dual authentication system and role-based access control**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Development Auth](#development-auth)
4. [Auth0 Production Auth](#auth0-production-auth)
5. [JWT Token Standard](#jwt-token-standard)
6. [Authorization (RBAC)](#authorization-rbac)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

TrossApp implements a **dual authentication system** supporting both local development auth and production Auth0 OAuth2/OIDC.

### Key Features

✅ **Dual Auth** - Dev and Auth0 work side-by-side independently  
✅ **RFC 7519 Compliant** - Standardized JWT tokens  
✅ **Strategy Pattern** - Clean separation of concerns  
✅ **Role-Based Access Control** - Five user roles (admin, manager, dispatcher, technician, client)  
✅ **Audit Logging** - All auth events logged for security  
✅ **Session Management** - Multi-device support with refresh tokens

### Authentication Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ DEVELOPMENT AUTH (/api/dev/*)                              │
│ ┌─────────────┐                                             │
│ │ Test Users  │ → DevAuthStrategy → JWT Token → API Access │
│ └─────────────┘    (Local config)   (HS256)                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION AUTH (/api/auth0/*)                             │
│ ┌──────────┐                                                │
│ │ Auth0 UI │ → OAuth2/PKCE → Auth0Strategy → JWT + Refresh │
│ └──────────┘    (Google)     (RS256 → HS256)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROTECTED ROUTES (/api/*)                                   │
│ JWT Token → authenticateToken → req.user → RBAC → Response │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### Strategy Pattern Implementation

We use the **Strategy Pattern** for authentication methods:

```
AuthStrategy (Base Class)
├── DevAuthStrategy (Development)
└── Auth0Strategy (Production)
```

**Benefits:**

- Route-specific strategy instantiation (no factory needed)
- Both auth methods work simultaneously
- Easy to add new auth providers
- Clean separation of concerns

### File Structure

```
backend/
├── services/
│   └── auth/
│       ├── AuthStrategy.js          # Base class (71 lines)
│       ├── DevAuthStrategy.js       # Dev auth (172 lines)
│       └── Auth0Strategy.js         # Auth0 OAuth (352 lines)
│
├── routes/
│   ├── dev-auth.js                  # Development endpoints
│   ├── auth0.js                     # Auth0 OAuth endpoints
│   └── auth.js                      # Session management
│
├── middleware/
│   └── auth.js                      # JWT validation & RBAC
│
└── services/
    └── token-service.js             # JWT generation & refresh
```

---

## 🔧 Development Auth

### Overview

Local authentication for rapid development and testing. Uses pre-configured test users with instant token generation.

### Configuration

```javascript
// backend/config/test-users.js
const testUsers = [
  {
    id: 99,
    email: "admin@test.com",
    role: "admin",
    first_name: "Admin",
    last_name: "User",
  },
  {
    id: 100,
    email: "tech@test.com",
    role: "technician",
    first_name: "Tech",
    last_name: "User",
  },
];
```

### Endpoints

**Get Technician Token:**

```bash
GET /api/dev/token

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 100,
    "email": "tech@test.com",
    "role": "technician"
  }
}
```

**Get Admin Token:**

```bash
GET /api/dev/admin-token

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 99,
    "email": "admin@test.com",
    "role": "admin"
  }
}
```

**Check Dev Auth Status:**

```bash
GET /api/dev/status

Response:
{
  "dev_auth_enabled": true,
  "provider": "development",
  "message": "Dev auth always available"
}
```

### Usage in Frontend

```dart
// Flutter example
final response = await http.get(
  Uri.parse('http://localhost:3001/api/dev/admin-token')
);

final data = json.decode(response.body);
final token = data['token'];

// Use token for API requests
final apiResponse = await http.get(
  Uri.parse('http://localhost:3001/api/users'),
  headers: {'Authorization': 'Bearer $token'}
);
```

### Security Notes

⚠️ **Development Only** - Never use in production  
⚠️ **No Password** - Instant token generation  
⚠️ **Test Data** - Uses fake user IDs (99, 100)  
⚠️ **No Rate Limiting** - Unlimited requests

---

## 🔐 Auth0 Production Auth

### Overview

Production-grade authentication using Auth0 OAuth2/OIDC with Google social login and PKCE flow.

### Configuration

```env
# backend/.env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_AUDIENCE=https://api.trossapp.dev
API_URL=https://api.trossapp.dev
```

### OAuth2 PKCE Flow

```
1. Frontend generates code_verifier & code_challenge
   ↓
2. Redirect to Auth0 with code_challenge
   ↓
3. User authenticates (Google OAuth)
   ↓
4. Auth0 redirects back with authorization code
   ↓
5. Frontend exchanges code + code_verifier for tokens
   ↓
6. Backend validates Auth0 ID token (RS256)
   ↓
7. Backend creates/updates user in database
   ↓
8. Backend generates app JWT token (HS256)
   ↓
9. Frontend receives appToken + refreshToken
```

### Endpoints

**Exchange Authorization Code:**

```bash
POST /api/auth0/callback
Content-Type: application/json

{
  "code": "authorization_code_from_auth0",
  "code_verifier": "pkce_code_verifier"
}

Response:
{
  "success": true,
  "data": {
    "appToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": 8,
      "email": "user@gmail.com",
      "role": "client",
      "provider": "auth0"
    }
  }
}
```

**Validate Token:**

```bash
POST /api/auth0/validate
Content-Type: application/json
Authorization: Bearer {token}

Response:
{
  "success": true,
  "valid": true,
  "user": { ... }
}
```

**Refresh Token:**

```bash
POST /api/auth0/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "data": {
    "appToken": "new_token...",
    "expiresIn": 3600
  }
}
```

**Logout:**

```bash
GET /api/auth0/logout

Response: Redirects to Auth0 logout URL
```

### User Database Persistence

When a user authenticates via Auth0, the backend:

1. Validates the Auth0 ID token (RS256)
2. Checks if user exists (by `auth0_id`)
3. **Creates new user** if first login:
   ```sql
   INSERT INTO users (auth0_id, email, first_name, last_name, role_id)
   VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'client'))
   ```
4. **Updates existing user** if returning:
   ```sql
   UPDATE users SET last_login = NOW() WHERE auth0_id = $1
   ```
5. Generates app JWT token with user data
6. Logs authentication event to audit log

---

## 🎫 JWT Token Standard

### Token Structure (RFC 7519 Compliant)

All tokens use standardized claims across both auth methods:

```json
{
  // REGISTERED CLAIMS (RFC 7519)
  "iss": "https://api.trossapp.dev",
  "sub": "auth0|106216621173067609100",
  "aud": "https://api.trossapp.dev",
  "exp": 1760513403,
  "iat": 1760477403,

  // PRIVATE CLAIMS (Application)
  "email": "user@example.com",
  "role": "admin",
  "provider": "auth0",
  "userId": 8
}
```

### Claim Definitions

| Claim      | Type   | Description                        |
| ---------- | ------ | ---------------------------------- |
| `iss`      | string | Issuer (API URL)                   |
| `sub`      | string | Subject (unique user identifier)   |
| `aud`      | string | Audience (API URL)                 |
| `exp`      | number | Expiration timestamp (Unix)        |
| `iat`      | number | Issued at timestamp (Unix)         |
| `email`    | string | User email address                 |
| `role`     | string | User role (admin, manager, etc.)   |
| `provider` | string | Auth provider (development, auth0) |
| `userId`   | number | Database user ID                   |

### Token Algorithms

- **Development Auth:** HS256 (symmetric signing)
- **Auth0 ID Tokens:** RS256 (asymmetric signing)
- **App JWT Tokens:** HS256 (symmetric signing)

### Token Lifetimes

```javascript
// Access Token (Short-lived)
expiresIn: "1h"; // 3600 seconds

// Refresh Token (Long-lived)
expiresIn: "7d"; // 604800 seconds
```

---

## 🛡️ Authorization (RBAC)

### Role Hierarchy

```
admin       → Full system access
  ↓
manager     → Multi-location management
  ↓
dispatcher  → Job assignment, scheduling
  ↓
technician  → Field work, job completion
  ↓
client      → View own jobs, request service
```

### Database Schema

```sql
-- One role per user (many-to-one)
users.role_id → roles.id (FK)

-- Role table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_protected BOOLEAN DEFAULT false
);

-- Protected roles (cannot be deleted)
INSERT INTO roles (name, is_protected) VALUES
  ('admin', true),
  ('manager', true),
  ('dispatcher', true),
  ('technician', true),
  ('client', true);
```

### Middleware Functions

```javascript
// Single role requirement
requireAdmin; // Only admin
requireManager; // Only manager
requireDispatcher; // Only dispatcher
requireTechnician; // Only technician

// Multiple role options
requireAnyRole("admin", "manager"); // Admin OR manager
requireAllRoles("admin"); // Must have admin

// Hierarchical permissions
requireMinRole("manager"); // Manager, admin (higher roles)
```

### Usage Examples

```javascript
// Admin-only endpoint
router.delete(
  "/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    // Only admins can reach here
    // req.dbUser.id available for audit logging
  },
);

// Multi-role endpoint
router.get(
  "/jobs",
  authenticateToken,
  requireAnyRole("admin", "manager", "dispatcher"),
  async (req, res) => {
    // Admins, managers, or dispatchers can access
  },
);

// Custom permission logic
router.put("/users/:id", authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.id);

  // Users can update themselves, admins can update anyone
  if (req.dbUser.id !== targetUserId && req.dbUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Insufficient permissions",
    });
  }

  // Proceed with update...
});
```

### Request Context

After `authenticateToken` middleware, you have access to:

```javascript
// JWT decoded token
req.user = {
  sub: "auth0|123456",
  email: "user@example.com",
  role: "admin",
  userId: 42,
};

// Full database user object
req.dbUser = {
  id: 42,
  auth0_id: "auth0|123456",
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
  role: "admin",
  role_id: 1,
  is_active: true,
  created_at: "2025-10-17T...",
  last_login: "2025-10-17T...",
};
```

---

## 🔒 Security Best Practices

### Token Security

✅ **Store tokens securely**

- Never in localStorage (XSS vulnerable)
- Use httpOnly cookies or secure storage
- Flutter: Use `flutter_secure_storage`

✅ **Validate on every request**

- All protected routes use `authenticateToken`
- Verify signature and expiration
- Check user still exists and is active

✅ **Rotate refresh tokens**

- Generate new refresh token on each use
- Invalidate old refresh token
- Detect token theft via reuse

### Password Security

✅ **Bcrypt hashing** (if implementing password auth)

```javascript
const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);
```

✅ **Strong password requirements**

- Minimum 8 characters
- Mix of uppercase, lowercase, numbers
- Special characters recommended

### Rate Limiting

```javascript
// Apply to auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts",
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/auth0", authLimiter, auth0Routes);
```

### Audit Logging

All authentication events are logged:

```javascript
await auditService.logLogin(
  req.dbUser.id,
  getClientIp(req),
  getUserAgent(req),
  { provider: "auth0" },
);

await auditService.logLogout(
  req.dbUser.id,
  getClientIp(req),
  getUserAgent(req),
);
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5000",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

---

## 🔧 Troubleshooting

### "Invalid token" errors

**Cause:** Token expired, invalid signature, or malformed

**Solution:**

```javascript
// Check token in JWT debugger: https://jwt.io
// Verify JWT_SECRET matches between generation and validation
// Ensure token hasn't expired (check exp claim)
```

### "User not found" errors

**Cause:** Token valid but user doesn't exist in database

**Solution:**

```javascript
// Check if user was deleted after token issued
// Verify database connection
// Check auth0_id or development user ID exists
```

### Auth0 callback fails

**Cause:** Invalid code_verifier, expired code, or misconfigured Auth0

**Solution:**

```javascript
// Verify Auth0 application settings:
// - Allowed Callback URLs
// - Allowed Logout URLs
// - Token Endpoint Authentication Method: None (for PKCE)

// Check code_verifier matches code_challenge
// Ensure authorization code used within 10 minutes
```

### CORS errors in browser

**Cause:** Frontend origin not allowed

**Solution:**

```env
# backend/.env
FRONTEND_URL=http://localhost:5000

# Restart backend after changing
```

### Development auth not working

**Cause:** Backend not running or wrong URL

**Solution:**

```bash
# Verify backend is running
curl http://localhost:3001/api/dev/status

# Check for port conflicts
npm run health
```

---

## 📚 Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [RFC 7519 - JWT Standard](https://datatracker.ietf.org/doc/html/rfc7519)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [TrossApp Auth0 Setup Guide](AUTH0_SETUP.md)

---

**TrossApp Authentication Guide**
