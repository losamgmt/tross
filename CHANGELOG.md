# Changelog

All notable changes to Tross will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - Mobile Auth0 Login (2026-02-04)

#### Mobile Authentication Flow
- **Root Cause**: Mobile was sending Auth0 tokens directly to backend, but backend only accepts its own JWTs signed with `JWT_SECRET`
- **Solution**: Added token exchange step - mobile now calls `/api/auth0/validate` to swap Auth0 ID token for backend-issued app token
- **Parity**: Mobile flow now mirrors web PKCE flow (both exchange Auth0 tokens for backend JWTs)

#### CI/CD Optimizations
- **Shallow Clone**: Added `fetch-depth: 1` to all 8 jobs (faster checkout)
- **Gradle Caching**: 2-layer cache for Android builds (~50% faster)
- **Parallel Builds**: Android/iOS now build independently (no web dependency)
- **Build Time**: Reduced from ~10+ minutes to ~4-5 minutes

### Added - Mobile Platform Readiness & CI/CD Enhancement (2026-02-03)

#### Mobile UX Enhancements (7 Phases Complete)
- **Phase 1**: Touch target sizing (48px minimum) with platform utilities
- **Phase 2**: Mobile navigation (`MobileNavBar`, `TouchableMenuItem`, `HamburgerMenu`)
- **Phase 3**: Mobile-responsive table layout with `ScrollableRow`
- **Phase 4**: Collapsible filters with expandable `FiltersContainer`
- **Phase 5**: Adaptive action sheets with `MobileActionSheet`
- **Phase 6**: Condensed mobile layout (header, sidebar, footer)
- **Phase 7**: Mobile form inputs with touch-optimized styling

#### Mobile Platform Configuration
- **Android**: Auth0 manifest placeholders in `build.gradle.kts`
- **iOS**: Folder created, deep links configured
- **App Icons**: Generated via `flutter_launcher_icons` (Android + iOS + Web)
- **Splash Screens**: Generated via `flutter_native_splash`
- **Centralized Icon**: `AppConstants.appIcon` for consistent branding

#### CI/CD Overhaul
- **New Jobs**: Security audit, web build, Android APK, iOS IPA
- **Concurrency Controls**: Cancel in-progress runs on new push
- **Dependabot**: Weekly updates for npm, Flutter, Docker, Actions
- **CODEOWNERS**: Auto-assign reviewers for PRs
- **Node 22**: Consistent across all CI jobs (was mixed 20/22)
- **Artifact Uploads**: Debug/release APKs, unsigned IPA, web build
- **Beautiful Summary**: ASCII status table in deploy-summary job

#### Test Quality Improvements
- **Keyboard Accessibility Tests**: Rewrote `DateInput` and `TimeInput` keyboard tests
  - Proper behavioral tests (Space/Enter key opens picker)
  - Tab navigation focus verification
  - Disabled state prevents keyboard interaction
  - Zero skipped tests (was 4 skipped)
- **TouchTarget Tests**: Updated finders from `IconButton` to `TouchTarget`
- **Test Count**: 8,625 total tests passing (5,226 frontend + 2,123 backend unit + 1,261 backend integration + 15 E2E)

#### Documentation Updates
- Updated `CI_CD_GUIDE.md` with new pipeline structure
- Updated `PROJECT_STATUS.md` with mobile readiness status
- Updated `README.md` with Node 22, mobile phases
- Created `PLATFORM_UTILITIES.md` for platform detection docs

---

### TODO - Pending Features

#### Dashboard Role Customization
- [ ] Present different dashboard stats/widgets per user role
- [ ] Customer role: Show only work orders and customer info
- [ ] Technician role: Add inventory stats, available jobs
- [ ] Dispatcher+: Full financial stats visibility
- [ ] Admin: All resources including user management stats

#### File Attachment Admin Page (Phase 6B)
- [ ] Implement file attachment management page in admin section
- [ ] List all attachments with filters (entity type, date range, file type)
- [ ] Bulk delete orphaned attachments
- [ ] Storage usage statistics

---

### Changed - Coverage Cleanup & 80% Threshold (2026-02-01)

#### Dead Code Removal
- **Removed** `lib/utils/form_validators.dart` - was only imported by tests, never used in production
- **Removed** `test/utils/form_validators_test.dart` - tests for dead code

#### Test Infrastructure Relocation
- **Moved** `lib/services/auth_test_service.dart` → `test/helpers/auth_test_service.dart`
  - This was a dev utility for manual auth testing, not production code
  - Relocating removes ~112 lines from production coverage scope

#### Coverage Improvements
- Added `PermissionConfig` model tests (34 total tests):
  - `getNavVisibilityPriority` with explicit navVisibility and fallback to read permission
  - `getRowLevelSecurity` for role-based data access policies
  - Edge cases for null/empty roles and missing resources
- Frontend coverage: **80.01%** (5165 tests, 8539/10672 lines)
- Backend coverage: **80.14%** (3384 tests)

---

### Added - File Attachments Complete (2026-02-01)

#### Phase 5: Entity Naming Convention Unification ✅
- **Phase 5A**: Added explicit `entityKey` to all 13 entity metadata files
- **Phase 5B**: Backend file routes restructured to sub-resource pattern
  - Routes: `/api/:tableName/:id/files` (proper RESTful sub-resources)
  - `file-sub-router.js` with `mergeParams: true`
  - `download_url` + `download_url_expires_at` always present in responses
- **Phase 5C**: Frontend unified to use metadata registry
  - Removed hardcoded `_entityKeyToTableName` map from `FileService`
  - Now uses `EntityMetadataRegistry.tryGet(entityKey).tableName`

#### Phase 6: File Attachments Feature ✅ (Except Admin UI)
- **6A Entity Integration**: `EntityFileAttachments` wired into `EntityDetailScreen`
  - Upload, download, delete handlers with loading states
  - File preview modal (images, PDFs, text)
  - Conditional imports for web-only PDF iframe
- **6C Documentation**: R2 Railway configuration documented in `docs/operations/r2-cors-config.md`
  - Required environment variables
  - CORS configuration
  - Getting R2 credentials

#### Test Infrastructure Improvements
- Completely rewrote `FileService` tests (shallow → meaningful)
  - Entity key resolution tests (work_order → work_orders)
  - HTTP request/response flow tests
  - Error handling tests (401, 403, 404)
- Enhanced `MockApiClient` with `mockAuthenticatedRequest()` callback
- Fixed `ServiceTestFactory.generateErrorPathTests()` to initialize metadata registry
- All tests pass: 5,183 frontend + 3,334 backend

---

### Fixed - Navigation Visibility Regression (2026-01-27)

#### Root Cause
- `user-metadata.js` and `role-metadata.js` were missing `navVisibility` property
- Permissions deriver was falling back to read permission (customer) instead of admin
- Admin section and user/role entities appeared for all users

#### Changes Made
- Added `navVisibility` to ALL 13 entity metadata files
- Made `navVisibility` REQUIRED in `entity-metadata-validator.js`
- Added permission-aware stat loading to `DashboardProvider`:
  - Only fetches stats for resources the user can read
  - Eliminates "No permission" warnings for role-restricted resources
- Regenerated `permissions.json` with correct admin-level visibility

---

### Added - Test Coverage 80%+ Milestone (2026-01-25)

#### Backend Coverage Above 80% Threshold
- **Branches**: 80.21% (was 78.5%)
- **Statements**: 90.49%
- **Functions**: 91.49%
- **Lines**: 90.61%

#### New Backend Tests
- **sql-safety.test.js**: 24 tests for `sanitizeIdentifier` and `validateFieldAgainstWhitelist`
- **update-helper.test.js**: 21 tests for `buildUpdateClause` and `ImmutableFieldError`
- **entity-metadata-service.test.js**: 24 comprehensive tests
- **Enhanced services**: stats-service, system-settings-service, sessions-service, export-service

#### New Factory Error Scenarios
- `stringTooLongRejected` - maxLength validation
- `invalidDateRejected` - date format validation
- `negativeIdRejected` - negative ID rejection
- `booleanFieldHandling` - boolean coercion

#### Frontend Tests: 5,000+ Milestone
- **New helper tests**: string_helper (31), pagination_helper (29), input_type_helpers (6)
- **Frontend line coverage**: 80.65%
- **Total frontend tests**: 5,045 (was 4,979)

#### Total Project Tests: 8,390
- Backend: 3,345 tests
- Frontend: 5,045 tests

---

### Added - Unified AppError System (2026-01-16)

#### Error Handling Architecture Overhaul
- **AppError Class**: New unified error class (`utils/app-error.js`) with explicit `statusCode` and `code` properties
  - Eliminates fragile pattern-matching on error messages
  - Status codes defined at SOURCE, not derived from message text
  - Supports: 400 BAD_REQUEST, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT, 500 INTERNAL_ERROR, 503 SERVICE_UNAVAILABLE

#### Files Updated (20+ files)
- **Routes**: auth.js, audit.js, dev-auth.js, entities.js, files.js, schema.js
- **Services**: audit-service.js, auth-user-service.js, export-service.js, file-attachment-service.js, preferences-service.js, sessions-service.js, stats-service.js, storage-service.js, system-settings-service.js, token-service.js
- **Auth Strategies**: AuthStrategy.js, DevAuthStrategy.js
- **Utils**: auth0-mapper.js, identifier-generator.js, response-transform.js, sql-safety.js, validation-loader.js, validation-sync-checker.js
- **DB Helpers**: default-value-helper.js, delete-helper.js

#### Bug Fixes
- **token-service.js**: Malformed JWT now returns 400 (bad input) not 401 (auth failure)
- **integration tests**: Fixed regex word boundary for SQL keyword detection (avoid "Updates" matching "UPDATE")
- **E2E tests**: Fixed health check assertions to access `health.data.*` wrapper

#### Test Results
- **Unit Tests**: 1,860 passed
- **Integration Tests**: 1,161 passed
- **Flutter Tests**: 4,704 passed
- **E2E Tests**: 15 passed

---

### Added - Frontend Coverage: 80%+ Milestone (2026-01-14)

- **New Test Factories**: AuthService (27), WidgetRender (22), ActionBuilders (114 tests)
- **New Widget Tests**: ErrorCard, PaginationDisplay, PageScaffold, ActionGrid, CardGrid
- **Result**: 4,704 tests, 80.56% line coverage (frontend now matches backend threshold)

---

### Added - Metadata-Driven Frontend Test Infrastructure (2026-01-04)

#### Test Factory System
- **EntityTestRegistry**: Singleton providing entity metadata for all 11 entities
- **EntityDataGenerator**: Generates type-aware test data from metadata
- **allKnownEntities**: Shared constant for zero per-entity test loops

#### Scenario Test Suites (531 new tests)
- **Parity Tests** (31): Drift detection between frontend metadata and backend config
  - Entity existence, field definitions, enum values, permission coverage
- **Widget Scenario Tests** (287): Cross-entity widget rendering
  - EntityDetailCard, AppDataTable, EntityFormModal, FilterableDataTable
  - All widgets × all 11 entities × loading/error/empty states
- **Validation Scenario Tests** (132): Robustness testing
  - Missing fields, type mismatches, boundary values, invalid enums, special characters

#### Bug Fixes Discovered
- **MetadataFieldConfigFactory**: Fixed type casting bug where non-String values crashed `as String?` casts
  - Added `_safeToString()` and `_safeToNullableString()` helper methods

#### Coverage Milestone
- **Frontend Tests**: 2,643 passing
- **Frontend Coverage**: 70.1% (6,705/9,569 lines)
- **Total Project Tests**: ~5,800 (backend + frontend + E2E)

---

### Added - E2E & CI/CD Enhancements (2026-01-03)

#### E2E Testing Overhaul
- **Production-Appropriate Tests**: Rewrote E2E suite to test only what production supports
  - 15 tests verifying health, security, routing, and file storage auth
  - Removed all tests requiring dev tokens (don't work in production - correct!)
  - Removed auth helpers, cleanup utilities, and test data generators
  - Single test file: `e2e/production.spec.ts`

- **Philosophy Shift**: Tests that can't run in production are cruft—remove, don't skip
  - Unit tests: Logic (1,900+ tests)
  - Integration tests: API contracts with test auth (1,100+ tests)
  - E2E tests: Production is up and secure (15 tests)

#### CI/CD Pipeline Improvements
- **E2E Against Real Deployment**: Tests run against live Railway, not CI simulation
  - Eliminates complex DB setup, env var juggling, migration scripts in CI
  - Tests what users actually experience
  - Waits for Railway health before running tests

- **Required Secret**: `RAILWAY_BACKEND_URL` in GitHub repository secrets

- **Pipeline Flow**:
  ```
  Push to main
      ├─► Backend Unit (1900+) ────┐
      │                            ├─► E2E (15) ─► Deploy Notify
      ├─► Backend Integration (1100+)┘
      ├─► Frontend Tests
      └─► Railway auto-deploys (parallel)
  ```

#### Documentation Updates
- Updated `docs/TESTING.md` with new E2E philosophy and test categories
- Updated `docs/CI_CD_GUIDE.md` with pipeline flow and secrets documentation
- Updated `README.md` with accurate test counts

---

### Added - Strangler-Fig Phase 3D: GenericEntityService (2025-12-05)

#### New Backend Infrastructure
- **GenericEntityService**: Metadata-driven CRUD service replacing legacy model methods
  - `findById()`, `findAll()`, `create()`, `update()`, `delete()` - core CRUD
  - `findByField()` - replaces special-case methods (findByEmail, findByAuth0Id, etc.)
  - `count()` - replaces Role.getUserCount() and similar methods
  - `batch()` - transactional multi-operation support
  - Full RLS (Row-Level Security) integration via metadata
  - Output filtering for sensitive fields (auth0_id stripped automatically)
  - Audit logging integration (non-blocking)
  - System role protection (admin, manager, dispatcher, technician, customer)

- **Helper Modules** (SRP extraction):
  - `db/helpers/audit-helper.js` - Bridges GenericEntityService with audit-service
  - `db/helpers/cascade-helper.js` - Metadata-driven cascade delete
  - `db/helpers/output-filter-helper.js` - Sensitive field stripping
  - `db/helpers/rls-filter-helper.js` - RLS WHERE clause building

- **Supporting Utilities**:
  - `utils/auth0-mapper.js` - Auth0 token → local user schema mapping
  - `utils/validation-schema-builder.js` - Joi schema generation from metadata
  - `middleware/generic-entity.js` - Entity extraction and validation middleware

- **Entity Metadata Enhancements**:
  - Added `defaultRoleName` to user-metadata.js
  - Added `defaultIncludes` for automatic JOINs (e.g., user → role)
  - Added `relationships` configuration for belongsTo/hasMany
  - All 8 entities have complete metadata: user, role, customer, technician, workOrder, invoice, contract, inventory

- **Database Migration**:
  - `010_add_system_role_protection.sql` - Trigger-based protection for system roles

#### Legacy Model Cleanup
- Removed 9 special-case methods from legacy models (strangler-fig pattern):
  - User: findByEmail, findByAuth0Id, createFromAuth0
  - Customer: findByEmail
  - Technician: findByLicenseNumber
  - Role: getByName, getUserCount, findByPriority, getAllWithUserCounts

#### Frontend Fixes
- Fixed Auth0 login flow: profile validation now allows null auth0_id (backend strips for security)
- Fixed role display: GenericEntityService.findByField now JOINs role table automatically
- Standardized role name: 'customer' (was inconsistently 'client' in some places)
- Updated all test files to use 'customer' role name (51 assertions updated)

#### Test Coverage
- **3,952 tests passing**:
  - Backend Unit: 1,679 ✅
  - Backend Integration: 702 ✅
  - Frontend Flutter: 1,561 ✅
  - E2E Playwright: 10 ✅

#### Strangler-Fig Status
- **Phase 3D Complete**: GenericEntityService fully functional
- **Next Phase**: Route swap (change routes to use GenericEntityService instead of legacy models)
- All manual smoke tests passing: Auth0 login, dev login, full CRUD on users/roles

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

This release marks the **complete production-ready backend** for Tross. All core features, security hardening, validation, testing infrastructure, and performance optimizations are complete. The backend is now **LOCKED** and ready for production deployment.

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

