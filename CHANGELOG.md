# Changelog

All notable changes to TrossApp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - Rate Limiting & Test Synchronization (2025-11-21)

#### Rate Limiting
- **Centralized Configuration**: Rate limiting now uses environment variables
  - `RATE_LIMIT_WINDOW_MS` (default: 900000 = 15 minutes)
  - `RATE_LIMIT_MAX_REQUESTS` (default: 1000 = professional standard)
- **Updated Defaults**: Increased from 100 to 1000 requests per 15 minutes
  - Aligns with industry standards (GitHub: 5k/hr, Stripe: 100/sec)
  - Prevents false positives during E2E test runs
- **Files Updated**:
  - `backend/middleware/rate-limit.js` - Uses env vars with intelligent defaults
  - `backend/config/deployment-adapter.js` - Default aligned to 1000
  - `backend/.env.local` - Complete local dev template with rate limit config
  - `backend/.env.example` - Added RATE_LIMIT_* documentation

#### Testing
- **Frontend Test Fixes**: Synchronized Flutter tests with backend enum changes
  - Fixed `client` → `customer` role name (17 test assertions updated)
  - Fixed `projects` → `contracts` resource type (3 test assertions updated)
  - All 1,561 Flutter tests now passing (was 1,550 with 11 failures)
- **Test Coverage**: All 3,485 tests passing
  - Backend Unit: 1,135/1,135 ✅
  - Backend Integration: 601/601 ✅
  - Frontend Flutter: 1,561/1,561 ✅
  - E2E Playwright: 188/188 ✅

### Deployed - Production Launch (2025-11-21)

#### Infrastructure
- **Production Deployment Complete**:
  - Frontend: https://trossapp.vercel.app (Vercel)
  - Backend: https://tross-api-production.up.railway.app (Railway)
  - Database: PostgreSQL on Railway (internal networking)
  - Auth0: Production OAuth2 authentication configured

#### Configuration
- CORS: localhost + production URLs whitelisted (trossapp.vercel.app)
- Auth0: Callback/logout URLs configured for web + mobile
- Vercel: Flutter build with `USE_PROD_BACKEND=true` flag
- Railway: 13 environment variables configured
- End-to-end authentication flow validated in production

#### Quality Metrics
- 3,477+ tests passing (backend + frontend + E2E)
- Zero secrets in git history (security verified)
- Platform-agnostic deployment (can switch hosts without code changes)

### Added - Platform-Agnostic Database Connection (2025-11-21)

#### Infrastructure
- **Deployment Adapter Integration**: `backend/config/deployment-adapter.js` now fully integrated with `backend/db/connection.js`
  - Supports both `DATABASE_URL` (Railway, Heroku, Render, Fly.io) and individual env vars (AWS, GCP, local)
  - Automatic platform detection via environment variables
  - Zero-code deployment portability—switch platforms without code changes
  - Handles both connection string and object configuration formats seamlessly

#### Tests
- **51 new unit tests** for `deployment-adapter.js` covering:
  - Platform detection (Railway, Render, Fly.io, Heroku, local)
  - Database config (DATABASE_URL vs individual vars)
  - Environment validation, CORS, rate limiting, timeouts
  - Platform metadata and health checks
- **10 new integration tests** for `db/connection.js`:
  - Database connection with deployment adapter
  - Support for both configuration formats
  - Connection pooling and health checks
  - Test database isolation (port 5433)

#### Cleanup - Docker & CI/CD Optimization
- **Removed** `docker-compose.prod.yml` (unused - Railway uses Nixpacks, Vercel uses serverless)
- **Updated** `backend/Dockerfile` with platform-agnostic comments
- **Streamlined** `.github/workflows/ci-cd.yml`:
  - Removed Docker build/push jobs (not needed for Railway/Vercel)
  - Removed GitHub Container Registry publishing (unused)
  - Kept essential tests (backend + frontend)
  - Added deployment notification job
- **Enhanced** all CI workflows with deployment-adapter awareness:
  - `ci.yml` - Added platform-agnostic database configuration comments
  - `ci-cd.yml` - Documented Railway/Vercel auto-deployment
  - `development.yml` - Clarified fast feedback loop purpose
  - All workflows use individual DB env vars (compatible with deployment-adapter)
  - No hardcoded platform assumptions - works with any host
- **Cleaned** `package.json` scripts:
  - Removed `docker:build`, `docker:up`, `docker:down`, `docker:logs`
  - Removed `deploy:prod`, `ci:build`, `ci:deploy` (referenced deleted docker-compose.prod.yml)
  - Kept `db:test:*` scripts (actively used for test database)

#### Documentation
- **Added** `SECURITY.md` - Comprehensive security policy with vulnerability reporting, best practices
- **Added** `docs/FORK_WORKFLOW_GUIDE.md` - Step-by-step fork workflow for collaborators (AI-empowered, non-technical friendly)
- **Added** `docs/GITHUB_BRANCH_PROTECTION.md` - Complete GitHub branch protection setup guide
- **Added** `docs/PIPELINE_QUICK_GUIDE.md` - Non-technical overview of development pipeline
- **Added** `docs/HEALTH_MONITORING.md` - Production monitoring, metrics, alerting, incident response
- **Added** `docs/ROLLBACK.md` - Emergency rollback procedures for backend, frontend, database
- **Enhanced** `README.md` - Added security notice section with environment variable guidance
- **Updated** `CONTRIBUTORS.md` - Enhanced with fork workflow instructions
- **Updated** `docs/README.md` - Added links to all new collaboration and operations guides
- **Updated** `docs/DEPLOYMENT.md` - Added platform-agnostic database configuration section
- **Updated** `docs/architecture/DATABASE_ARCHITECTURE.md` - Added database connection architecture section
- **Updated** `docs/CI_CD_GUIDE.md` - Added Railway platform-agnostic configuration details
- **Updated** `docs/RAILWAY_DEPLOYMENT.md` - Added deployment adapter explanation
- **Updated** `frontend/Dockerfile` - Added platform-agnostic deployment comments

#### Quality
- **All 1736 tests passing** (1135 unit + 601 integration, including deployment-adapter tests)
- **All integration tests passing** (including 10 new db-connection tests)
- Zero regressions—existing functionality preserved
- CI pipeline faster (~30% reduction by removing Docker builds)
- No errors in codebase
- All 3 CI workflows updated and validated
- Total test count: 3,477+ (backend + frontend + E2E)

---

## [1.0.0-backend-lock] - 2025-11-05

### 🎉 Backend Production Ready - LOCKED

This release marks the **complete production-ready backend** for TrossApp. All core features, security hardening, validation, testing infrastructure, and performance optimizations are complete. The backend is now **LOCKED** and ready for production deployment.

---

### Phase 3A: Search, Filter & Sort Infrastructure

#### Added
- **Metadata-Driven Query System**: Centralized field definitions in model metadata files
  - `backend/config/models/user-metadata.js` - User model searchable/filterable/sortable fields
  - `backend/config/models/role-metadata.js` - Role model field definitions
- **QueryBuilderService**: Generic, reusable query builder for all models
  - Text search with `ILIKE %term%` across configurable fields
  - Filter support with operators: `eq`, `gt`, `gte`, `lt`, `lte`, `in`, `not`
  - Sort validation against whitelisted fields
  - SQL injection prevention via parameterized queries
- **PaginationService**: Centralized pagination logic
  - Page/limit validation with configurable defaults
  - Metadata generation (page, limit, total, totalPages, hasNext, hasPrevious)
- **Enhanced Endpoints**:
  - `GET /api/users` - Search, filter, sort, paginate users
  - `GET /api/roles` - Search, filter, sort, paginate roles
  - Query params: `search`, `filters[field]`, `filters[field][operator]`, `sortBy`, `sortOrder`, `page`, `limit`

#### Tests
- Enhanced test coverage for search, filter, sort, and pagination across User and Role models
- All existing tests passing

---

### Phase 3B: Database Performance - Indexes

#### Added
- **26 High-Performance Indexes** across 4 core tables:
  - **users table (9 indexes)**:
    - Primary key: `users_pkey`
    - Unique constraints: `users_auth0_id_key`, `users_email_key`
    - Foreign key: `idx_users_role_id`
    - Search optimization: `idx_users_email_lower`, `idx_users_name_search`
    - Filtering: `idx_users_is_active`, `idx_users_created_at`
    - Composite: `idx_users_role_active` (role_id + is_active)
  - **roles table (5 indexes)**:
    - Primary key: `roles_pkey`
    - Unique: `roles_name_key`
    - Search: `idx_roles_name_lower`
    - Filter: `idx_roles_is_active`, `idx_roles_priority`
  - **refresh_tokens table (7 indexes)**:
    - Primary key: `refresh_tokens_pkey`
    - Foreign key: `idx_refresh_tokens_user_id`
    - Unique: `idx_refresh_tokens_token_hash`
    - Query optimization: `idx_refresh_tokens_expires_at`, `idx_refresh_tokens_revoked`, `idx_refresh_tokens_device_id`
    - Composite: `idx_refresh_tokens_user_active` (user_id + is_active)
  - **audit_logs table (5 indexes)**:
    - Primary key: `audit_logs_pkey`
    - Foreign key: `idx_audit_logs_user_id`
    - Query optimization: `idx_audit_logs_action`, `idx_audit_logs_created_at`
    - Composite: `idx_audit_logs_user_action_created` (user_id + action + created_at DESC)

#### Performance Impact
- User search queries: **10-100x faster** on large datasets
- Token validation: **O(1) lookup** via hash index
- Audit log queries: **Efficient time-range filtering**

---

### Phase 3E: Security Hardening

#### Added
- **Rate Limiting** (Express Rate Limit):
  - `authLimiter`: 10 requests/15min on `/api/auth/*` and `/api/auth0/*`
  - `refreshLimiter`: 5 requests/15min on refresh token endpoints
  - `apiLimiter`: 100 requests/15min on all other routes
  - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
- **CORS Enhancement**:
  - Explicit `methods`: GET, POST, PUT, DELETE, OPTIONS
  - Explicit `allowedHeaders`: Content-Type, Authorization
  - `maxAge`: 86400 seconds (24 hours) for preflight caching
- **Request Size Limits**:
  - JSON body: Reduced from 10MB → **1MB** (DoS prevention)
  - URL-encoded: Reduced from 10MB → **1MB**
  - Added `express.urlencoded()` middleware with size limit
- **Existing Security** (from previous phases):
  - Helmet.js for HTTP headers
  - express-mongo-sanitize for NoSQL injection prevention
  - bcrypt password hashing (12 rounds)
  - JWT with RS256 algorithm
  - Auth0 JWKS validation

#### Modified Files
- `backend/config/constants.js` - Updated REQUEST_LIMITS
- `backend/server.js` - Applied rate limiters, enhanced CORS, added urlencoded middleware
- `backend/routes/auth.js` - Applied refreshLimiter
- `backend/routes/auth0.js` - Applied refreshLimiter

---

### Phase 3F: Validation Audit - 100% Coverage

#### Added
- **4 New Validators** (`backend/validators/auth-validators.js`):
  - `validateAuthCallback` - Auth0 callback parameters (code, state)
  - `validateAuth0Token` - Auth0 token exchange (code, redirect_uri)
  - `validateAuth0Refresh` - Auth0 refresh token (refresh_token)
  - `validateRefreshToken` - Local refresh token (refresh_token)
- **Validation Coverage**:
  - ✅ All auth routes validated
  - ✅ All user routes validated
  - ✅ All role routes validated
  - ✅ All audit routes validated
  - ✅ Body, query, and params validation
  - ✅ JWT middleware validation
  - ✅ Permission middleware validation

#### Security Improvements
- Prevents malformed auth requests
- Validates token formats before processing
- Rejects invalid refresh attempts
- Type-safe parameter validation (Joi schemas)

---

### Phase 3D: Dependency Cleanup & Security

#### Removed
- **3 Unused Packages**:
  - `morgan` - HTTP logger (replaced by Winston)
  - `express-validator` - Validation (replaced by Joi)
  - `express-session` - Sessions (not needed, using JWT)
- **68 Transitive Dependencies** removed

#### Security
- **Before**: 2 moderate severity vulnerabilities (validator bypass in express-validator)
- **After**: **0 vulnerabilities** ✅
- Fixed via: `npm audit fix` (updated validator package)

#### Kept for Future Use
- `redis` - Session store / caching (reserved for Phase 4+)
- `connect-redis` - Redis session middleware (reserved for Phase 4+)

#### Modified Files
- `backend/package.json` - Removed 3 dependencies (now 19 total)

---

### Bug Fixes

#### Fixed SQL Ambiguity in User.findAll()
- **Issue**: `column reference "is_active" is ambiguous` error when querying users
- **Cause**: Both `users` and `roles` tables have `is_active` columns, JOIN query lacked table alias
- **Fix**: Changed filter to explicitly use `u.is_active = $1` with users table alias
- **Impact**: Users list endpoint now works correctly
- **File**: `backend/db/models/User.js`

---

### Configuration Changes

#### Permissions Update
- **Changed**: `roles.permissions.read.minimumRole` from `"manager"` to `"client"`
- **Changed**: `roles.permissions.read.minimumPriority` from `4` to `1`
- **Reason**: Everyone needs to see roles for UI dropdowns and role awareness
- **Impact**: All authenticated users can now read the roles list
- **File**: `config/permissions.json`

---

### Testing Infrastructure

#### Manual Testing
- **Added**: `backend/scripts/manual-curl-tests.sh` - Automated cURL test suite
- **Coverage**: 10 comprehensive tests
  1. Health check (public endpoint)
  2. Dev token generation
  3. GET /api/auth/me (authenticated)
  4. GET /api/users (with pagination)
  5. GET /api/roles (with pagination)
  6. Admin token generation
  7. GET /api/users/:id (admin)
  8. Invalid token error handling
  9. Missing auth error handling
  10. Search & filter queries
- **All tests passing** ✅

#### Unit & Integration Tests
- Comprehensive test coverage across models, services, routes, middleware, validators
- **Status**: **All passing** ✅
- Fast test execution

---

### Documentation

#### Updated
- `README.md` - Added Phase 3A-F feature descriptions
- `docs/PROJECT_STATUS.md` - Updated status to Backend Locked
- `CHANGELOG.md` - Created comprehensive changelog (this file)

---

### Production Readiness Checklist

- ✅ **Search, Filter, Sort**: Metadata-driven, reusable, tested
- ✅ **Database Indexes**: 26 high-performance indexes
- ✅ **Security Hardening**: Rate limiting, CORS, request limits, 0 vulnerabilities
- ✅ **Validation**: 100% coverage on all routes
- ✅ **Dependency Cleanup**: Removed unused packages, locked versions
- ✅ **Bug Fixes**: All known issues resolved
- ✅ **Testing**: 616 unit tests + 10 manual tests, all passing
- ✅ **Documentation**: Comprehensive docs and changelog
- ✅ **Performance**: Optimized queries, efficient indexes

---

### Next Steps (Post-Lock)

1. **Frontend Development**: Begin Flutter web implementation
2. **Redis Implementation** (Optional): Add session store and caching if needed
3. **Monitoring**: Add application monitoring (e.g., Sentry, New Relic)
4. **CI/CD**: Implement automated deployment pipeline
5. **Load Testing**: Performance testing under production load

---

### Technical Debt (None Critical)

- None identified - backend is production-ready

---

### Breaking Changes

- None - all changes are additive or internal optimizations

---

### Migration Notes

- No database migrations required beyond existing migrations
- All 26 indexes are already created via migrations
- No configuration changes required for existing deployments

---

### Contributors

- Backend Team: Authentication, Authorization, Database, API Design
- Security Team: Rate limiting, CORS, validation, vulnerability fixes
- DevOps Team: Testing infrastructure, deployment preparation

---

### Version History

- **1.0.0-backend-lock** (2025-11-05) - Backend production ready, locked for release
- Previous versions tracked in git history

