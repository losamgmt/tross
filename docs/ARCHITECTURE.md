# Architecture

**Philosophy:** Simple, secure, testable. Every decision optimizes for maintainability.

## Core Principles

### KISS (Keep It Simple, Stupid)
- Single Responsibility Principle everywhere
- No premature optimization
- Explicit over clever
- Delete code > Add code

### Security-First
- Defense in depth: Auth0 + RBAC + RLS + validation
- Zero trust architecture
- Fail closed, never open
- Audit everything

### Test-Driven Quality
- Comprehensive coverage across all layers
- Unit → Integration → E2E pyramid (properly shaped)
- Fast feedback loops
- Tests as executable documentation

---

## System Architecture

### Stack
- **Frontend:** Flutter (web + mobile)
- **Backend:** Node.js + Express + PostgreSQL
- **Auth:** Auth0 OAuth2/OIDC
- **Storage:** S3-compatible (Supabase Storage)
- **Testing:** Jest + Flutter Test + Playwright
- **Infrastructure:** Docker Compose

### Data Flow
```
Client (Flutter)
  ↓ HTTP/JSON
API (Express) → Auth Middleware → RBAC → RLS
  ↓ SQL                              ↓ S3
Database (PostgreSQL)        Object Storage
```

---

## Key Architectural Decisions

### 1. Provider Pattern (State Management)
**Decision:** Use Provider for global state, StatefulWidget for local UI state.

**Why:**
- Native to Flutter ecosystem
- Minimal boilerplate
- Excellent DevTools integration
- Scales from simple to complex

**Trade-offs:**
- ❌ Less opinionated than BLoC
- ✅ Lower learning curve
- ✅ Faster development velocity

---

### 2. Atomic Design System
**Decision:** Atoms → Molecules → Organisms → Templates → Pages

**Why:**
- Reusability by default
- Clear component hierarchy
- Easy to test in isolation
- Design system emerges naturally

**Trade-offs:**
- ❌ More files initially
- ✅ Less duplication long-term
- ✅ Enforces composition

---

### 3. Auth0 for Authentication
**Decision:** Delegate auth to Auth0, not build in-house.

**Why:**
- Security is their core competency
- OAuth2/OIDC compliance out-of-box
- MFA, social login, passwordless ready
- Reduces attack surface

**Trade-offs:**
- ❌ Vendor dependency
- ✅ Professional security
- ✅ Focus on business logic

**Dev Mode:** File-based dev users (`backend/config/test-users.js`) for fast local development.

---

### 4. Triple-Tier Security
**Decision:** Three layers of protection.

**Layers:**
1. **Auth0** - Identity verification
2. **RBAC** - Role-based permissions
3. **RLS** - Row-level security (data isolation)

**Why:**
- Defense in depth
- Each layer catches different attack vectors
- Graceful degradation

**Example:**
```javascript
// Layer 1: Auth0 verifies JWT
authenticateToken(req, res, next)

// Layer 2: RBAC checks permission
requirePermission('customers:read')

// Layer 3: RLS filters by customer_id
WHERE customer_id = req.user.customer_id
```

---

### 5. Entity Contract v2.0
**Decision:** Standardized schema across all entities.

**TIER 1 - Universal Fields:**
```sql
id SERIAL PRIMARY KEY
[identity_field] VARCHAR(X) UNIQUE NOT NULL
is_active BOOLEAN DEFAULT true NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
```

**TIER 2 - Lifecycle State (Optional):**
```sql
status VARCHAR(50) DEFAULT 'active'
  CHECK (status IN ([entity_specific_values]))
```

**Field Separation:**
- `is_active` = Does record exist? (soft delete)
- `status` = What lifecycle stage? (pending, active, suspended, etc.)

**Why:**
- Consistent patterns reduce cognitive load
- Soft deletes prevent data loss
- Status enables workflow modeling

---

### 6. Strategy Pattern for Auth
**Decision:** Pluggable auth strategies (Auth0Strategy, DevelopmentStrategy).

**Why:**
- Single interface: `authenticate(credentials)`
- Easy to swap strategies (dev ↔ prod)
- Testable in isolation

**Implementation:**
```javascript
// backend/services/auth/index.js
const strategy = AppConfig.devAuthEnabled 
  ? new DevelopmentStrategy() 
  : new Auth0Strategy();

const user = await strategy.authenticate(credentials);
```

---

### 7. Schema-Driven UI
**Decision:** Backend schema introspection drives frontend forms.

**Why:**
- Single source of truth (schema.sql)
- Validation rules shared (backend ↔ frontend)
- Changes propagate automatically

**Implementation:**
- `GET /api/schema/:entity` returns field metadata
- Flutter uses metadata to build dynamic forms
- Validation rules embedded in metadata

---

### 8. Comprehensive Testing Strategy
**Decision:** Unit → Integration → E2E pyramid with high coverage.

**Coverage:**
- Extensive test coverage across unit, integration, and E2E
- Unit: Fast, isolated logic tests
- Integration: API + DB tests
- E2E: Critical user flows (Playwright)

**Why:**
- Confidence to refactor
- Regression prevention
- Documentation via tests

**Performance:**
- Unit tests: <5s timeout
- Integration tests: <10s timeout
- Full suite: <70s (parallelized)

---

## Locked Patterns

**Status:** 🔒 **LOCKED** - Do not modify without review

These patterns are frozen and battle-tested:

1. ✅ Entity Contract v2.0 (TIER 1 + TIER 2)
2. ✅ Field separation (`is_active` vs `status`)
3. ✅ Triple-tier security (Auth0 + RBAC + RLS)
4. ✅ Strategy Pattern for auth
5. ✅ Provider Pattern for state
6. ✅ Atomic Design System
7. ✅ Schema-driven UI
8. ✅ Testing pyramid
9. ✅ Generic file storage (entity_type + entity_id pattern)

**To modify a locked pattern:**
1. Open GitHub issue with rationale
2. Discuss alternatives and trade-offs
3. Update ADR with superseding decision
4. Update this document

---

## Evolution Guidelines

### Adding New Entities
1. Follow Entity Contract v2.0
2. Add TIER 1 fields (mandatory)
3. Add TIER 2 `status` if lifecycle needed
4. Create migration (see `backend/migrations/README.md`)
5. Update `schema.sql`
6. Add tests (model + API)

### Adding New Features
1. Write tests first (TDD)
2. Implement smallest possible change
3. Refactor for clarity
4. Update docs if architecture changes

### Refactoring
1. Tests must pass before and after
2. One pattern at a time
3. Commit frequently
4. Document breaking changes

---

## Anti-Patterns (Avoid)

❌ **Mixing concerns** - Keep models, routes, services separate  
❌ **Premature optimization** - Profile before optimizing  
❌ **Clever code** - Explicit > Clever  
❌ **Copy-paste** - Extract to shared function  
❌ **Skipping tests** - Tests are not optional  
❌ **Hardcoding config** - Use environment variables  
❌ **Ignoring errors** - Handle or log, never swallow  

---

## Further Reading

- [Database Architecture](architecture/DATABASE_ARCHITECTURE.md) - Schema design details
- [Entity Lifecycle](architecture/ENTITY_LIFECYCLE.md) - Status field patterns
- [Validation Architecture](architecture/VALIDATION_ARCHITECTURE.md) - Multi-tier validation
- [Testing Guide](TESTING.md) - Test philosophy and patterns
- [Security Guide](SECURITY.md) - Security implementation details
