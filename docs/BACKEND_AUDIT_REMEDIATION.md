# Backend Audit Remediation Plan

> **Created:** January 15, 2026  
> **Updated:** January 16, 2026  
> **Status:** Phases 1-3 Complete, Phase 4 in progress (67% overall)

---

## Historical Context

This document tracked issues identified during the initial backend audit. The audit identified ~120 issues across security, architecture, and code quality categories.

**Phases 1-3 are complete.** Remaining cleanup (Phase 4-5) is lower priority polish work.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Issue Categories](#issue-categories)
3. [Phase 1: Security Critical](#phase-1-security-critical)
4. [Phase 2: Foundational Architecture](#phase-2-foundational-architecture)
5. [Phase 3: Consistency Patterns](#phase-3-consistency-patterns)
6. [Phase 4: Code Cleanup](#phase-4-code-cleanup)
7. [Phase 5: Polish](#phase-5-polish)
8. [Progress Tracking](#progress-tracking)

---

## Executive Summary

This document tracks all issues identified during the comprehensive backend audit and provides a systematic remediation plan working from the most foundational issues up the dependency chain.

### Issue Severity Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 18 | Security risks, hardcoded credentials, SQL injection |
| 🟠 High | 32 | SRP violations, duplication, inconsistent patterns |
| 🟡 Medium | 45 | Missing integration, stale code, pattern issues |
| 🔵 Low | 25 | Code quality, minor optimizations |

---

## Issue Categories

### Category Overview

| Category | Issues | Primary Files |
|----------|--------|---------------|
| Security | 6 | app-config.js, cascade-helper.js, stats-service.js |
| Hardcoded Values | 15 | constants.js, swagger.js, audit-constants.js |
| SRP Violations | 8 | generic-entity-service.js, authenticateToken |
| Duplication | 18 | error helpers, role definitions, validators |
| Inconsistent Patterns | 25 | DB imports, error handling, exports |
| Missing Integration | 12 | validators, test constants |
| Orphaned Code | 8 | unused validators, stale mocks |
| Code Quality | 28 | inline requires, magic numbers |

---

## Phase 1: Security Critical

> **Priority:** IMMEDIATE  
> **Estimated Effort:** 2-4 hours  

### 1.1 Remove Auth0/JWT Credential Fallbacks

**File:** `backend/config/app-config.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** Hardcoded Auth0 credentials and JWT secrets as fallbacks

**Fix:** Remove ALL fallbacks; require explicit env configuration  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 1.2 SQL Injection Defense in cascade-helper.js

**File:** `backend/db/helpers/cascade-helper.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** Table/column names interpolated without validation

**Fix:** Add identifier sanitization utility  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 1.3 SQL Injection Defense in stats-service.js

**File:** `backend/services/stats-service.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** Field parameter in sum() not validated against whitelist

**Fix:** Validate field against metadata.numericFields  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 1.4 SQL Injection Defense in identifier-generator.js

**File:** `backend/utils/identifier-generator.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** Table/field names interpolated into SQL

**Fix:** Add defense-in-depth sanitization  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 1.5 Fix Swallowed Errors in AuditService

**File:** `backend/services/audit-service.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** Audit log failures silently swallowed

**Fix:** Add fallback mechanism (full event in logs + process.emit for monitoring)  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 1.6 Fix Swallowed Errors in FileAttachmentService

**File:** `backend/services/file-attachment-service.js`  
**Severity:** 🔴 CRITICAL  
**Issue:** entityExists() returns false on DB error

**Fix:** Re-throw DB connection errors; only return false for "not found"  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### Phase 1 Additional Work

**New File Created:** `backend/utils/sql-safety.js`  
**Purpose:** Centralized SQL identifier sanitization utility for defense-in-depth

---

## Phase 2: Foundational Architecture

> **Priority:** HIGH  
> **Estimated Effort:** 1-2 days  
> **Goal:** Establish single sources of truth

### 2.1 Create SQL Identifier Sanitizer Utility

**File:** `backend/utils/sql-safety.js` (NEW)  
**Severity:** 🟠 HIGH  
**Issue:** No centralized SQL identifier validation

**Fix:** Create utility with `sanitizeIdentifier()` function  
**Status:** ✅ COMPLETED (Jan 15, 2026) - Done as part of Phase 1

### 2.2 Single Source of Truth for Role Definitions

**Files:** `constants.js`, `role-metadata.js`, `test-users.js`  
**Severity:** 🟠 HIGH  
**Issue:** USER_ROLES, ROLE_HIERARCHY, ROLE_PRIORITY_TO_NAME duplicated in 3+ places

**Fix:** Created `role-definitions.js` as SSOT; all others derive at runtime  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.3 Derive ENTITY_CATEGORY_MAP from Metadata

**File:** `backend/config/constants.js`  
**Severity:** 🟠 HIGH  
**Issue:** Hardcoded entity category mapping

**Fix:** Created `entity-types.js` and `derived-constants.js`; ENTITY_CATEGORY_MAP now derived from metadata.entityCategory at runtime  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.4 Derive Entity Prefixes from Metadata

**File:** `backend/db/helpers/identifier-generator.js`  
**Severity:** 🟠 HIGH  
**Issue:** ENTITY_PREFIXES and IDENTIFIER_FIELDS hardcoded

**Fix:** Added `identifierPrefix` to COMPUTED entity metadata; identifier-generator now derives config from metadata via derived-constants.js  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.5 Derive Audit Actions from Metadata

**File:** `backend/services/audit-constants.js`  
**Severity:** 🟠 HIGH  
**Issue:** AuditActions, EntityToResourceType, EntityActionMap manually maintained

**Fix:** Generate from metadata entity list via derived-constants.js  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.6 Derive Swagger Paths from Metadata

**File:** `backend/config/swagger.js`  
**Severity:** 🟠 HIGH  
**Issue:** Entity paths hardcoded; schema definitions out of sync

**Fix:** Generate paths and schemas from metadata via derived-constants.js  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.7 Standardize Database Import Pattern

**Files:** All services, middleware  
**Severity:** 🟠 HIGH  
**Issue:** 4 different DB import patterns

**Fix:** Standardize to `const db = require('../db/connection');`  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.8 Create Transaction Helper

**File:** `backend/db/helpers/transaction-helper.js` (NEW)  
**Severity:** 🟠 HIGH  
**Issue:** Inconsistent transaction handling (delete vs batch)

**Fix:** Created `withTransaction()`, `withTransactionSteps()`, `checkAndLock()` helpers  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.9 Add displayField to All Metadata

**Files:** user, customer, technician, work_order metadata  
**Severity:** 🟡 MEDIUM  
**Issue:** Missing displayField breaks UI consistency

**Fix:** Added displayField to all entity metadata via derived-constants.js getDisplayFields()  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 2.10 Standardize Status Enum Patterns

**Files:** user, customer metadata  
**Severity:** 🟡 MEDIUM  
**Issue:** user has "pending_activation", customer has "pending"

**Fix:** Created `status-enums.js` as SSOT with USER_STATUS, WORK_ORDER_STATUS, INVOICE_STATUS, CONTRACT_STATUS, PRIORITY  
**Status:** ✅ COMPLETED (Jan 15, 2026)

---

## Phase 3: Consistency Patterns

> **Priority:** MEDIUM-HIGH  
> **Estimated Effort:** 2-3 days  
> **Goal:** Eliminate duplicate patterns, standardize interfaces

### 3.1 Replace Custom Error Helpers with ResponseFormatter

**Files:** `auth.js`, `generic-entity.js`, `row-level-security.js`  
**Severity:** 🟠 HIGH  
**Issue:** sendAuthError, sendError, sendRLSError duplicate ResponseFormatter

**Fix:** Replaced all custom error helpers with ResponseFormatter methods  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 3.2 Add HTTP_STATUS.TOO_MANY_REQUESTS

**File:** `backend/config/constants.js`  
**Severity:** 🟠 HIGH  
**Issue:** Rate limiter uses hardcoded 429

**Fix:** Added HTTP_STATUS.TOO_MANY_REQUESTS = 429  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.3 Compose genericEnforceRLS with enforceRLS

**File:** `backend/middleware/generic-entity.js`  
**Severity:** 🟠 HIGH  
**Issue:** genericEnforceRLS reimplements enforceRLS

**Fix:** Now imports and delegates to enforceRLS() - no duplication  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.4 Compose genericRequirePermission with requirePermission

**File:** `backend/middleware/generic-entity.js`  
**Severity:** 🟠 HIGH  
**Issue:** genericRequirePermission reimplements requirePermission

**Fix:** Now imports and delegates to requirePermission() - no duplication  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.5 Create Middleware Utils Module

**File:** `backend/middleware/utils.js` (NEW)  
**Severity:** 🟠 HIGH  
**Issue:** No shared helpers (requireDbUser, requireRole, getSecurityContext)

**Fix:** Created utils.js with getClientIp, getUserAgent, getSecurityContext, hasDbUser, hasRole, hasMinimumRole, asyncHandler, createPermissionCheck  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.6 Add Error Codes to ResponseFormatter

**File:** `backend/utils/response-formatter.js`  
**Severity:** 🟠 HIGH  
**Issue:** Missing machine-readable error codes

**Fix:** Added ERROR_CODES constant (16 codes) and `code` field to all error responses  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.7 Standardize on req.validated Pattern

**Files:** All validators  
**Severity:** 🟠 HIGH  
**Issue:** Mix of req.validated, req.validatedBody, req.validated.pagination

**Fix:** Standardized to req.validated with sub-properties (body, pagination, id, etc.)  
**Status:** ✅ COMPLETED (Jan 16, 2026) - Verified no occurrences of req.validatedBody in codebase

### 3.8 Use validateIdParam Consistently

**Files:** `admin.js`, `auth.js`, `files.js`  
**Severity:** 🟠 HIGH  
**Issue:** Manual parseInt + isNaN instead of validateIdParam middleware

**Fix:** All routes now use validateIdParam middleware, access req.validated.id  
**Status:** ✅ COMPLETED (Jan 16, 2026) - Verified no parseInt(req.params.id) in production routes

### 3.9 Use Request Helpers Consistently

**Files:** `auth.js`, `dev-auth.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** Inline IP/User-Agent extraction instead of getClientIp/getUserAgent

**Fix:** All routes import and use getClientIp/getUserAgent from request-helpers  
**Status:** ✅ COMPLETED (Jan 16, 2026) - Verified no inline req.ip or req.headers['x-forwarded...'] in routes

### 3.10 Consolidate AuditService + AdminLogsService

**Files:** `audit-service.js`, `admin-logs-service.js`  
**Severity:** 🟠 HIGH  
**Issue:** Overlapping query/filter logic

**Fix:** Consolidated into AuditService - AdminLogsService deleted
- Moved getDataLogs(), getAuthLogs(), getLogSummary() to AuditService
- Added AUTH_ACTIONS and DATA_ACTIONS static arrays
- Updated admin.js routes to use AuditService directly
**Status:** ✅ COMPLETED

### 3.11 Fix Naive Pluralization in files.js and audit.js

**Files:** `routes/files.js`, `routes/audit.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** `${entityType}s` fails for "inventory"

**Fix:** Now uses metadata.tableName instead of naive inference  
**Status:** ✅ COMPLETED (Jan 15, 2026)

### 3.12 Standardize Module Export Patterns

**Files:** All services  
**Severity:** 🟡 MEDIUM  
**Issue:** Mix of singleton, static class, function exports

**Fix:** Convention established:
- Static class for stateless services (most services)
- Object export for services with multiple utilities (pagination-service, storage-service)
- Consistent pattern: `module.exports = ServiceName;`  
**Status:** ✅ COMPLETED (Jan 16, 2026) - 15/17 services use static class pattern consistently

### 3.13 Standardize Error Handling Strategy

**Files:** All services  
**Severity:** 🟡 MEDIUM  
**Issue:** Inconsistent try-catch, swallow vs rethrow patterns

**Fix:** Implemented unified `AppError` class (`utils/app-error.js`):
- **AppError class** with explicit `statusCode` and `code` properties
- Status codes defined at SOURCE, not derived from message pattern-matching
- Supports: 400 BAD_REQUEST, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT, 500 INTERNAL_ERROR, 503 SERVICE_UNAVAILABLE
- Routes use `asyncHandler` wrapper (catches errors, calls next(error))
- Global error handler checks `error.statusCode` first, pattern-matching is fallback only
- Updated 20+ files across routes, services, utils, and db helpers
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 3.14 Create Rate Limit Handler Factory

**File:** `backend/middleware/rate-limit.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** 4 nearly identical rate limit handlers

**Fix:** Created `createRateLimiter(config)` factory function with:
- Configurable: name, windowMs, max, errorType, errorMessage, retryAfter
- Automatic test/dev bypass (returns no-op middleware when NODE_ENV !== 'production')
- Consistent logging with configurable emoji and log fields
- Uses HTTP_STATUS.TOO_MANY_REQUESTS from constants  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 3.15 Make All Rate Limits Configurable

**File:** `backend/middleware/rate-limit.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** authLimiter, refreshLimiter use hardcoded values

**Fix:** All limits now configurable via environment variables:
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` (default: 1000/15min)
- `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX_REQUESTS` (default: 5/15min)
- `REFRESH_RATE_LIMIT_WINDOW_MS`, `REFRESH_RATE_LIMIT_MAX_REQUESTS` (default: 10/hour)  
**Status:** ✅ COMPLETED (Jan 16, 2026)

---

## Phase 4: Code Cleanup

> **Priority:** MEDIUM  
> **Estimated Effort:** 1-2 days  
> **Goal:** Remove dead code, fix integration gaps

### 4.1 Remove Orphaned Entity Validators

**File:** `backend/validators/body-validators.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** 16 validators (validateUserCreate, etc.) generated but never used

**Fix:** Removed unused entity-specific validators  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 4.2 Remove Unused validateSlugParam

**File:** `backend/validators/url-validators.js`  
**Severity:** 🔵 LOW  
**Issue:** Defined and exported but never imported in routes

**Fix:** Removed from param-validators.js  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 4.3 Move Auth Validators to Metadata

**File:** `backend/validators/auth-validators.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** role_id, auth_code, id_token hardcoded instead of derived

**Fix:** Add to SHARED_FIELD_DEFS in validation-deriver  
**Status:** ⬜ Not Started

### 4.4 Remove FIELD_TO_RULE_MAP Hardcoding

**File:** `backend/utils/validation-schema-builder.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** 40+ field-to-rule mappings hardcoded

**Fix:** Replaced with `SYSTEM_MANAGED_FIELDS` Set; derives from metadata  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 4.5 Consolidate Joi Schema Builders

**Files:** `validation-loader.js`, `preferences-validators.js`, `validation-schema-builder.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** Three different places build Joi schemas

**Fix:** Single buildFieldSchema function for all  
**Status:** ⬜ Not Started

### 4.6 Fix preferences-validators Wrong Import

**File:** `backend/validators/preferences-validators.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** Imports PREFERENCE_SCHEMA from service instead of metadata

**Fix:** Now imports from preferences-metadata.js  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 4.7 Deprecate Legacy validateFilters

**File:** `backend/validators/query-validators.js`  
**Severity:** 🔵 LOW  
**Issue:** Old validateFilters() still exported alongside new validateQuery()

**Fix:** Removed legacy validateFilters function  
**Status:** ✅ COMPLETED (Jan 16, 2026)

### 4.8 Add clearCache() to validation-loader

**File:** `backend/utils/validation-loader.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** Module-level cache with no reset function

**Fix:** Export clearValidationCache()  
**Status:** ⬜ Not Started

### 4.9 Fix env-validator.js Side Effects

**File:** `backend/utils/env-validator.js`  
**Severity:** 🟡 MEDIUM  
**Issue:** Mutates process.env and calls process.exit()

**Fix:** Return defaults; let caller handle exit  
**Status:** ⬜ Not Started

### 4.10 Move Inline Requires to Top

**Files:** `auth.js`, `dev-auth.js`, `preferences.js`, `generic-entity.js`  
**Severity:** 🔵 LOW  
**Issue:** require() inside functions

**Fix:** Move to top of file  
**Status:** ⬜ Not Started

### 4.11 Fix Date Formatting Duplication in Audit Routes

**File:** `backend/routes/audit.js`  
**Severity:** 🔵 LOW  
**Issue:** Same date formatting repeated 3 times

**Fix:** Extract to helper or move to service  
**Status:** ⬜ Not Started

### 4.12 Apply asyncHandler to Non-Entity Routes

**Files:** `admin.js`, `health.js`, `export.js`  
**Severity:** 🔵 LOW  
**Issue:** Manual try-catch instead of asyncHandler pattern

**Fix:** Use createAsyncHandler or similar  
**Status:** ⬜ Not Started

---

## Phase 5: Polish

> **Priority:** LOW  
> **Estimated Effort:** 1 day  
> **Goal:** Final refinements and test infrastructure

### 5.1 Derive Test Table Names from Metadata

**File:** `backend/__tests__/setup/test-db-setup.js`  
**Severity:** 🔵 LOW  
**Issue:** Hardcoded table lists in TRUNCATE and verification

**Fix:** Generate from metadata  
**Status:** ⬜ Not Started

### 5.2 Import Test Constants from Production

**File:** `backend/config/test-constants.js`  
**Severity:** 🔵 LOW  
**Issue:** TEST_ERROR_MESSAGES, TEST_PAGINATION may drift

**Fix:** Import from production constants  
**Status:** ⬜ Not Started

### 5.3 Consolidate User Fixtures

**Files:** `fixtures/users.js`, `fixtures/test-users.js`  
**Severity:** 🔵 LOW  
**Issue:** Two files with slightly different structures

**Fix:** Consolidate into single source  
**Status:** ⬜ Not Started

### 5.4 Derive Validator Names Dynamically

**File:** `backend/__tests__/setup/mocks/validator-mocks.js`  
**Severity:** 🔵 LOW  
**Issue:** Hardcoded validator name list

**Fix:** Generate from metadata + naming convention  
**Status:** ⬜ Not Started

### 5.5 Create Shared Test Setup Module

**Files:** `test-setup.js`, `integration-setup.js`  
**Severity:** 🔵 LOW  
**Issue:** Duplicate setup logic

**Fix:** Extract to shared-setup.js  
**Status:** ⬜ Not Started

### 5.6 Add getISOTimestamp Utility

**File:** `backend/utils/request-helpers.js`  
**Severity:** 🔵 LOW  
**Issue:** `new Date().toISOString()` repeated 14+ times

**Fix:** Add centralized helper  
**Status:** ⬜ Not Started

### 5.7 Rename response-transformer.js

**File:** `backend/utils/response-transformer.js`  
**Severity:** 🔵 LOW  
**Issue:** Similar name to response-formatter.js causes confusion

**Fix:** Rename to field-access-controller.js  
**Status:** ⬜ Not Started

### 5.8 Consolidate request-helpers and request-context

**Files:** `request-helpers.js`, `request-context.js`  
**Severity:** 🔵 LOW  
**Issue:** Overlapping getAuditMetadata and buildAuditContext

**Fix:** Consolidate into single file  
**Status:** ⬜ Not Started

### 5.9 Add Deep Clone Utility

**File:** `backend/utils/` (NEW)  
**Severity:** 🔵 LOW  
**Issue:** No deep clone utility

**Fix:** Add deepClone() using structuredClone or JSON  
**Status:** ⬜ Not Started

### 5.10 Add ISO Date Validation Utility

**File:** `backend/utils/` (NEW)  
**Severity:** 🔵 LOW  
**Issue:** No reusable date validation outside Joi

**Fix:** Add isValidISODate()  
**Status:** ⬜ Not Started

### 5.11 Standardize Pagination Limits

**Files:** Various  
**Severity:** 🔵 LOW  
**Issue:** Magic numbers (50, 100, 200, 500)

**Fix:** Centralize in constants  
**Status:** ⬜ Not Started

### 5.12 Sanitize Health Check Error Messages

**File:** `backend/services/health-service.js`  
**Severity:** 🔵 LOW  
**Issue:** Database error messages exposed in API

**Fix:** Return sanitized message  
**Status:** ⬜ Not Started

---

## Progress Tracking

### Summary

| Phase | Total | Completed | Remaining |
|-------|-------|-----------|-----------|
| Phase 1: Security | 6 | 6 | 0 ✅ |
| Phase 2: Architecture | 10 | 10 | 0 ✅ |
| Phase 3: Consistency | 15 | 15 | 0 ✅ |
| Phase 4: Cleanup | 12 | 6 | 6 |
| Phase 5: Polish | 12 | 0 | 12 |
| **TOTAL** | **55** | **37** | **18** |

### Completion Log

| Date | Task | Notes |
|------|------|-------|
| Jan 15, 2026 | Phase 1 Complete | All 6 security issues resolved + sql-safety.js utility created |
| Jan 15, 2026 | Phase 2 Complete | All 10 foundational architecture tasks |
| Jan 15, 2026 | Phase 3 Partial | 8/15 completed |
| Jan 16, 2026 | Phase 3 Complete | All 15 consistency patterns - asyncHandler, rate limit factory, req.validated, AppError |
| Jan 16, 2026 | Phase 4 Partial | Dead code removal - orphaned validators, legacy functions, FIELD_TO_RULE_MAP |

---

## Appendix: SRP Refactoring (Future)

These larger refactoring tasks are documented but deferred:

### A.1 Split GenericEntityService

**Current:** 1308 lines, 8 public methods  
**Proposed Split:**
- `EntityReadService` (findById, findAll, findByField, count)
- `EntityWriteService` (create, update, delete)
- `EntityBatchService` (batch)

**Status:** 📋 Documented for future

### A.2 Split authenticateToken Middleware

**Current:** 165+ lines, 10 responsibilities  
**Proposed Split:**
- extractToken
- verifyToken
- validateProvider
- blockDevInProduction
- loadUserFromToken
- blockDeactivatedUser

**Status:** 📋 Documented for future

### A.3 Separate extractEntity and validateEntityId

**Current:** One middleware does both  
**Proposed:** Two composable middleware

**Status:** 📋 Documented for future
