# Security

Defense-in-depth security architecture.

---

## Security Philosophy

**Zero Trust:** Verify everything, trust nothing.  
**Defense in Depth:** Multiple independent layers.  
**Fail Closed:** Security failures deny access, never grant.  
**Audit Everything:** All security events logged.

---

## Triple-Tier Security

### Overview

Every request passes through three independent security layers:

```
Client Request
  ↓
TIER 1: Auth0 (Identity Verification)
  ↓
TIER 2: RBAC (Role-Based Permissions)
  ↓
TIER 3: RLS (Row-Level Security)
  ↓
Database Query
```

### Tier 1: Authentication (Auth0)

**Purpose:** Verify user identity

**Implementation:**

- Auth0 OAuth2/OIDC for production
- JWT token validation (RS256 → HS256)
- Dev mode uses file-based test users

**Code:**

```javascript
// backend/middleware/auth.js
async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.userId);

  if (!req.user || !req.user.is_active) {
    return res.status(401).json({ error: "Invalid or inactive user" });
  }

  next();
}
```

#### Development User Protection (Read-Only Mode)

**Purpose:** Prevent accidental data modification in development mode

Development users (file-based test users) are fundamentally incapable of modifying
data. This is a defense-in-depth security measure implemented at the middleware level.

**Why?**

- Dev users are not authenticated through Auth0
- Dev user IDs are `null` in the database layer
- Allowing writes could corrupt shared development databases
- Creates clear separation between "viewing" and "modifying" data

**Implementation:**

```javascript
// backend/middleware/auth.js - Global write protection for dev users
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// After setting req.dbUser for dev users:
if (MUTATING_METHODS.includes(req.method)) {
  logger.security("DEV_WRITE_BLOCKED", {
    method: req.method,
    path: req.path,
    devUser: req.devUser.name,
  });
  return ResponseFormatter.forbidden(
    res,
    "Development users have read-only access. Sign in with Auth0 to modify data.",
  );
}
```

**Behavior:**

- `GET` requests: ✅ Allowed (read-only access via role permissions)
- `POST/PUT/PATCH/DELETE` requests: ❌ Blocked with 403 Forbidden
- Admin UI can view all data but cannot modify it
- Error message clearly explains the limitation

**Security Events:**
All blocked write attempts are logged with event type `DEV_WRITE_BLOCKED`.

---

### Tier 2: RBAC (Role-Based Access Control)

**Purpose:** Verify permission for action

**Roles:** (Hierarchical)

1. Admin (level 5) - Full access
2. Manager (level 4) - Team management
3. Dispatcher (level 3) - Work order assignment
4. Technician (level 2) - Own work orders
5. Client (level 1) - Own data only

**Permission Matrix:** See `config/permissions.json`

**Code:**

```javascript
// backend/middleware/auth.js
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const [resource, action] = permission.split(':');

    if (!hasPermission(userRole, resource, action)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage in routes
router.get('/api/customers',
  authenticateToken,
  requirePermission('customers:read'),
  async (req, res) => { ... }
);
```

---

### Tier 3: RLS (Row-Level Security)

**Purpose:** Filter data by ownership

**Implementation:**

- SQL queries add ownership filters via RLS policies
- Technicians see only assigned work orders (`assigned_work_orders_only`)
- Customers see only own data (`own_record_only`, `own_work_orders_only`)
- Admins bypass RLS via `all_records` policy

**Architecture:**

```javascript
// RLS policies defined in backend/config/models/*-metadata.js
rlsPolicy: {
  customer: 'own_work_orders_only',    // Filter by customer_id
  technician: 'assigned_work_orders_only', // Filter by assigned_technician_id
  dispatcher: 'all_records',            // No filtering
  manager: 'all_records',
  admin: 'all_records',
},

// RLS filter applied by db/helpers/rls-filter-helper.js
// Middleware: middleware/row-level-security.js
```

---

## Security Hardening

### Input Validation

**All inputs validated at multiple layers:**

1. **Frontend** - Type checking, format validation
2. **API Schema** - JSON Schema validation
3. **Database** - CHECK constraints, foreign keys

**Example:**

```javascript
// backend/validators/customer-validator.js
const customerSchema = {
  email: { type: 'string', format: 'email', maxLength: 255 },
  name: { type: 'string', minLength: 1, maxLength: 255 },
  phone: { type: 'string', pattern: '^\\+?[0-9]{10,15}$' }
};

// Validation middleware
router.post('/api/customers',
  authenticateToken,
  requirePermission('customers:create'),
  validateSchema(customerSchema),
  async (req, res) => { ... }
);
```

---

### SQL Injection Prevention

**Never concatenate user input into SQL queries.**

**✅ Good (Parameterized):**

```javascript
const result = await db.query("SELECT * FROM customers WHERE email = $1", [
  req.body.email,
]);
```

**❌ Bad (SQL Injection Vulnerable):**

```javascript
const result = await db.query(
  `SELECT * FROM customers WHERE email = '${req.body.email}'`,
);
```

**All queries use parameterized statements** (`$1`, `$2`, etc.)

---

### XSS Prevention

**Framework-level protection:**

- **Frontend:** Flutter automatically escapes strings
- **Backend:** Express doesn't render HTML (JSON API only)
- **Headers:** `helmet` middleware sets security headers

```javascript
// backend/server.js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: "deny" },
  }),
);
```

---

### CORS Configuration

**Restrict cross-origin requests:**

```javascript
// backend/server.js
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

---

### Rate Limiting

**Prevent brute force attacks:**

```javascript
// backend/middleware/rate-limit.js
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);
```

---

### Secret Management

**Never hardcode secrets.**

**Configuration:**

```bash
# .env (NOT committed to git)
JWT_SECRET=your-very-long-random-secret-at-least-64-characters
DATABASE_URL=postgresql://user:password@localhost:5432/tross
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

**Validation:**

```javascript
// backend/utils/env-validator.js
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
    throw new Error("JWT_SECRET must be at least 64 characters in production");
  }

  if (process.env.DATABASE_URL.includes("localhost")) {
    throw new Error("Production database cannot use localhost");
  }
}
```

---

## Audit Logging

**All security events logged:**

- Login attempts (success/failure)
- Permission denials
- CRUD operations
- Database changes

**Implementation:**

```javascript
// backend/services/audit-service.js
async function logEvent(eventType, details, userId = null) {
  await db.query(
    `INSERT INTO audit_logs (event_type, details, user_id) 
     VALUES ($1, $2, $3)`,
    [eventType, JSON.stringify(details), userId],
  );
}

// Usage
await auditService.logEvent(
  "user.login.success",
  {
    email: user.email,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  },
  user.id,
);
```

---

## Security Checklist

**Before Deployment:**

- [ ] All secrets in environment variables (not code)
- [ ] JWT_SECRET is 64+ characters with mixed case/numbers/special
- [ ] DATABASE_URL doesn't use localhost
- [ ] Auth0 production credentials configured
- [ ] CORS restricted to production frontend URL
- [ ] Rate limiting enabled
- [ ] Helmet security headers configured
- [ ] All SQL queries parameterized
- [ ] Input validation on all endpoints
- [ ] RBAC permission checks in place
- [ ] RLS implemented for multi-tenant data
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] No console.log in production code

---

## Incident Response

**If security breach suspected:**

1. **Contain:** Revoke all JWT tokens (rotate JWT_SECRET)
2. **Investigate:** Check audit logs for unauthorized access
3. **Notify:** Inform affected users
4. **Fix:** Patch vulnerability
5. **Monitor:** Watch for continued attacks

---

## Security Resources

- **Auth0 Setup:** [AUTH.md](AUTH.md)
- **Environment Variables:** `backend/ENVIRONMENT_VARIABLES.md`
- **Permission Matrix:** `config/permissions.json`
- **Database Security:** [ARCHITECTURE.md](ARCHITECTURE.md#triple-tier-security)

---

## Security Updates

**Stay current on security patches:**

```bash
# Check for vulnerabilities
cd backend
npm audit

# Auto-fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

**Review:** Security patches should be applied within 24 hours of disclosure.
