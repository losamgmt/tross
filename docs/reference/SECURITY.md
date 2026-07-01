# Security

Defense-in-depth security architecture.

---

## Security Philosophy

**Zero Trust:** Verify everything, trust nothing.  
**Defense in Depth:** Multiple independent layers.  
**Fail Closed:** Security failures deny access, never grant.  
**Record Everything:** Significant security and data-change events are durably logged.

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

**Behavior:** The authentication middleware extracts the bearer token, verifies its signature using the centrally-managed signing secret, loads the corresponding user, and fails closed — rejecting any request with a missing or invalid token, or an inactive user.

#### Development User Protection (Read-Only Mode)

**Purpose:** Prevent accidental data modification in development mode

Development users (file-based test users) are fundamentally incapable of modifying
data. This is a defense-in-depth security measure implemented at the middleware level.

**Why?**

- Dev users are not authenticated through Auth0
- Dev user IDs are `null` in the database layer
- Allowing writes could corrupt shared development databases
- Creates clear separation between "viewing" and "modifying" data

**Implementation:** A global middleware guard blocks all mutating HTTP methods (write verbs) for dev users — returning 403 Forbidden and emitting a `DEV_WRITE_BLOCKED` security event — while read requests pass through under normal role permissions.

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

**Roles:** A hierarchy of roles (e.g. Admin, Manager, Dispatcher, Technician, Client) ordered by privilege. The authoritative set of roles and their ordering is defined in the role metadata (the SSOT) and loaded at startup.

**Permission Matrix:** Derived from metadata — the generated permissions configuration is the SSOT.

**Pattern:** Route handlers are guarded by a permission middleware that checks the authenticated user's role against the `resource:action` required by the route, denying with 403 when no grant exists. Grants are composed from the role hierarchy, not hand-coded per route.

---

### Tier 3: RLS (Row-Level Security)

**Purpose:** Filter data by ownership, so each role sees only the rows it is entitled to.

**Model:** Row-level access is **grant-based and deny-by-default** — a role sees a row only when an explicit rule grants access; with no matching grant, access is denied. The rules are **declared in entity metadata** (the SSOT) and compiled into query filters, so there is no hand-written per-query filtering.

**Access scopes** a rule can grant:

- **Direct** — the row references the user's own profile or identity.
- **Junction** — access flows through a join table relating the user to the row.
- **Parent-derived** — a child row inherits access from its parent entity (see Sub-Entity Security).
- **Multi-hop** — access traverses a bounded chain of relationships.

The concrete rule shape, operators, and traversal limits live in the RLS engine and are governed by the row-level-security ADR. This document deliberately does not transcribe rule structures, so it cannot drift from the engine.

---

### Sub-Entity Security (Parent-Derived Access)

**Purpose:** Secure child resources that belong to parent entities

**Pattern:** Sub-entities inherit access control from their parent entity.

**Examples:**
- `/work_orders/:id/files` - Files belong to work orders
- `/customers/:id/contacts` - Contacts belong to customers
- `/invoices/:id/line_items` - Line items belong to invoices

#### Architecture

Sub-entities use a different security pattern than top-level entities:

```
Request: GET /work_orders/42/files
           ↓
1. Authenticate (Tier 1)
           ↓
2. Check permission on PARENT entity (work_orders:read)
           ↓
3. Verify parent exists (work_order 42 must exist)
           ↓
4. Parent's RLS applies (user must be able to read work_order 42)
           ↓
Return child records
```

#### Metadata Configuration

A sub-entity declares — in its metadata — that its access is **parent-derived** rather than defining its own row rules. This is a declarative marker; enforcement happens in middleware.

#### Middleware Enforcement

Sub-entity routes check permission against the **parent** entity's resource (not the sub-entity), denying when the parent grant is absent.

**Key Insight:** The sub-entity has no separate RLS resource of its own. Access is derived entirely from the parent entity's permissions.

#### Why This Pattern?

1. **Simplicity** - No explosion of `files:read_on_work_orders` permissions
2. **Consistency** - If you can read a work order, you can read its files
3. **Security** - Parent's RLS still applies (customer can't read another customer's work order files)
4. **Maintainability** - Adding a new sub-entity doesn't require updating permissions.json

#### Adding a Sub-Entity

Conceptually: declare the sub-entity as parent-derived in metadata, opt it out of the generic router (so it gets custom routes), and mount it with the sub-entity middleware helpers so parent-permission checks apply. The concrete configuration keys and helpers live in code.

---

## Security Hardening

### Input Validation

**All inputs validated at multiple layers:**

1. **Frontend** - Type checking, format validation
2. **API Schema** - JSON Schema validation
3. **Database** - CHECK constraints, foreign keys

Validation is schema-driven: each entity's field rules are declared in metadata and enforced as middleware on write routes, rejecting malformed input before it reaches the database. The schemas derive from the metadata SSOT, not hand-maintained per route.

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
- **Headers:** `helmet` middleware sets security headers (CSP, no-sniff, frame-deny, and related protections); the exact header policy is configured in the server setup.

---

### CORS Configuration

Cross-origin requests are restricted to the configured frontend origin, with credentialed requests and an explicit method/header allow-list. The origin is environment-configured and must be set in every environment.

> **Note:** See [Environment Variables](ENVIRONMENT_VARIABLES.md).

---

### Rate Limiting

API requests are rate-limited to mitigate brute-force and abuse. Limits apply per time window and are configured centrally (the limiter configuration is the SSOT for exact thresholds).

---

### Secret Management

**Never hardcode secrets.** Secrets are supplied via environment configuration and read through a centralized config layer — never inlined in code or documentation.

#### Fail-Fast Pattern

**Problem:** Module-level fallbacks (defaulting a missing secret to a hard-coded value) can silently run with an insecure default, defeating startup validation.

**Solution:** Critical secrets are read through a fail-fast accessor that throws immediately if the secret is missing in dev or production, while still allowing tests to run without explicit configuration. Validation happens at the point of use, so there are no silent fallbacks. The same fail-fast philosophy applies on the frontend, where release builds refuse to start on missing critical configuration rather than falling back to defaults.

#### Required Configuration

The deployment supplies — via environment, never committed — the JWT signing secret, the database connection URL, and the Auth0 tenant credentials. A startup **environment validator** enforces production requirements (a signing secret of sufficient minimum strength, and a non-local database URL) and fails fast when they are not met. The validator is the source of truth for these requirements; this document deliberately does not restate specific values.

---

## Event Recording

The platform maintains a **durable record of significant events** for accountability and investigation. Two distinct scopes share this capability:

- **Security/auth events** — authentication attempts, permission denials, and other security-relevant actions.
- **Data-change history (the "audit" trail)** — who changed which record, including the before/after of the change.

Both are recorded centrally and distinguished by the kind of event; each entry captures the actor, the action, the affected resource, and contextual metadata. The concrete schema lives in the database and migrations (the SSOT) and is intentionally not transcribed here.

> Universal by default: data changes are recorded as a secure-by-default accountability substrate, not gated per-entity.

---

## Security Checklist

**Before Deployment:**

- [ ] All secrets in environment variables (not code)
- [ ] JWT signing secret meets the enforced minimum strength
- [ ] Database URL is non-local (production)
- [ ] Auth0 production credentials configured
- [ ] CORS restricted to production frontend URL
- [ ] Rate limiting enabled
- [ ] Helmet security headers configured
- [ ] All SQL queries parameterized
- [ ] Input validation on all endpoints
- [ ] RBAC permission checks in place
- [ ] RLS enforced for row-level ownership
- [ ] Event recording enabled
- [ ] Error messages don't leak sensitive info
- [ ] No console.log in production code

---

## Incident Response

**If security breach suspected:**

1. **Contain:** Revoke all sessions by rotating the JWT signing secret
2. **Investigate:** Check the event record for unauthorized access
3. **Notify:** Inform affected users
4. **Fix:** Patch vulnerability
5. **Monitor:** Watch for continued attacks

---

## Security Resources

- **Auth0 Setup:** [AUTH.md](AUTH.md)
- **Environment Variables:** [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
- **Permission Matrix:** the generated permissions configuration (SSOT)
- **Database Security:** [ARCHITECTURE.md](../architecture/ARCHITECTURE.md#triple-tier-security)

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

### Known Transitive Vulnerabilities

Some transitive dependencies carry low-severity advisories that are **accepted and tracked** rather than force-overridden — typically when the upstream package pins the version deliberately, our usage does not reach the advisory's conditions, and forcing a different version risks subtle breakage. `npm audit` is the source of truth for current advisory status.

**Policy:** review advisories on each `npm audit`; override only when an advisory is actually reachable from our usage; otherwise record the acceptance rationale at the point of decision and re-evaluate when the upstream updates.

---

### Pinned Dependencies

Some dependencies are intentionally pinned to older major versions due to compatibility requirements (e.g., ESM vs CommonJS). Run `npm outdated` to see current pinning status.

**When evaluating upgrades:**
1. Check if the dependency has breaking changes (ESM-only, API changes)
2. Verify compatibility with our module system (currently CommonJS)
3. Test thoroughly before upgrading major versions

> **Note:** Run `npm outdated` to see which dependencies are pinned and why. Check package.json comments for rationale.
