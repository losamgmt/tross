# TrossApp Project Status (SSOT)

**Last Updated:** January 31, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Current State](#3-current-state)
4. [Technical Debt & Issues](#4-technical-debt--issues)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Key Decisions](#6-key-decisions)
7. [Quick Reference](#7-quick-reference)
8. [Session Log](#8-session-log)

---

## 1. Project Overview

### 1.1 What is TrossApp?

TrossApp is a metadata-driven, role-based business application with:
- **Backend:** Node.js/Express API with PostgreSQL (Neon)
- **Frontend:** Flutter web application
- **Auth:** Auth0 integration
- **Storage:** Cloudflare R2 for file attachments

### 1.2 Core Principles

| Principle | Description |
|-----------|-------------|
| **GENERIC** | Components work for any entity type |
| **COMPOSED** | Atomic design: atoms → molecules → organisms → templates |
| **SRP-LITERAL** | Each component has exactly one responsibility |
| **CONTEXT-AGNOSTIC** | Components don't know their usage context |
| **METADATA-DRIVEN** | Behavior configured via JSON, not code |
| **ROUTE-CONTROLLED** | URL determines what's displayed |

### 1.3 Key Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Flutter 3.x, Dart, go_router |
| Backend | Node.js, Express, PostgreSQL |
| Auth | Auth0 |
| Storage | Cloudflare R2 |
| Deployment | Railway (backend), Vercel (frontend) |

---

## 2. Architecture Summary

### 2.1 Frontend Widget Hierarchy

```
lib/widgets/
├── atoms/           # Single-purpose primitives (buttons, text, icons)
├── molecules/       # Composed atoms (form fields, cards, menus)
├── organisms/       # Complex UI sections (tables, forms, dashboards)
└── templates/       # Page-level shells (AdaptiveShell, CenteredLayout)
```

### 2.2 Screen Pattern (Thin Shell)

```
Screen (<50 lines)
  └── Template (AdaptiveShell or CenteredLayout)
        └── Content Organism (DashboardContent, SettingsContent, etc.)
```

### 2.3 Route Structure

| Route | Screen | Template | Body |
|-------|--------|----------|------|
| `/login` | LoginScreen | CenteredLayout | LoginContent |
| `/home` | HomeScreen | AdaptiveShell | DashboardContent |
| `/settings` | SettingsScreen | AdaptiveShell | SettingsContent |
| `/:entity` | EntityScreen | AdaptiveShell | FilterableDataTable |
| `/:entity/:id` | EntityDetailScreen | AdaptiveShell | ScrollableContent |
| `/admin` | AdminScreen | AdaptiveShell | AdminHomeContent |
| `/admin/system/health` | _AdminHealthScreen | AdaptiveShell | DbHealthDashboard |
| `/admin/system/logs/:tab` | _AdminLogsScreen | AdaptiveShell | TabbedContent |
| `/admin/system/files` | _AdminFilesScreen | AdaptiveShell | TabbedContent |
| `/admin/:entity` | _AdminEntityScreen | AdaptiveShell | TabbedContent |

---

## 3. Current State

### 3.1 What's Working ✅

- [x] Full authentication flow (Auth0 + dev login)
- [x] Role-based access control (viewer, user, manager, admin)
- [x] Generic entity CRUD (metadata-driven)
- [x] Dashboard with role-based entity charts
- [x] Admin system health monitoring
- [x] Admin audit logs (data + auth events)
- [x] Settings screen (profile + preferences)
- [x] Saved table views (column visibility, density)
- [x] Widget architecture unification (TabbedContent, ScrollableContent standardization)
- [x] Proactive token refresh (TokenRefreshManager with app lifecycle awareness)

### 3.2 In Progress 🔄

- [ ] File attachments feature
  - Infrastructure complete (backend, DB, frontend services)
  - Need: Wire `EntityFileAttachments` into entity detail screen
  - Need: Implement admin Files tab content
  - Need: Configure R2 in production

### 3.3 Test Coverage

Run `npm test` to execute all tests. Test suites:
- **Frontend Unit** - Widget and service tests
- **Frontend Widget** - Integration widget tests
- **Backend Unit** - Service and utility tests
- **Backend Integration** - API endpoint tests

---

## 4. Technical Debt & Issues

### 4.1 Dead Code - ✅ DELETED

| File | Location | Status |
|------|----------|--------|
| `dashboard_page.dart` | `templates/` | ✅ Deleted |
| `master_detail_layout.dart` | `templates/` | ✅ Deleted |
| `action_grid.dart` | `organisms/layout/` | ✅ Deleted |
| `card_grid.dart` | `organisms/layout/` | ✅ Deleted |

### 4.2 Duplication - ✅ UNIFIED

| Issue | Resolution | Status |
|-------|------------|--------|
| Tab components (`TabbedPage` + `TabbedContainer`) | Unified to `TabbedContent(syncWithUrl: bool)` | ✅ Complete |

### 4.3 Inconsistency - ✅ STANDARDIZED

| Issue | Resolution | Status |
|-------|------------|--------|
| Scroll handling in content organisms | All migrated to `ScrollableContent` molecule | ✅ Complete |

---

## 5. Implementation Roadmap

### Phase 1: Delete Dead Code ✅ COMPLETE
- [x] Delete `dashboard_page.dart`
- [x] Delete `master_detail_layout.dart`
- [x] Delete `action_grid.dart`
- [x] Delete `card_grid.dart`
- [x] Update barrel exports
- [x] Run tests (5,154 pass)

### Phase 2: Unify Tab Components ✅ COMPLETE
- [x] Create `TabbedContent` organism with `syncWithUrl: bool`
- [x] Migrate `_AdminLogsScreen` → `TabbedContent(syncWithUrl: true)`
- [x] Migrate `_AdminFilesScreen` → `TabbedContent(syncWithUrl: false)`
- [x] Migrate `_AdminEntityScreen` → `TabbedContent(syncWithUrl: false)`
- [x] Delete `TabbedPage` and `TabbedContainer`
- [x] Unify tests into `tabbed_content_test.dart`
- [x] Run tests (5,154 pass)

### Phase 3: Standardize Scrolling ✅ COMPLETE
- [x] Migrate `DashboardContent` → use `ScrollableContent`
- [x] Migrate `AdminHomeContent` → use `ScrollableContent`
- [x] Migrate `SettingsContent` → use `ScrollableContent`
- [x] Run tests (5,154 pass)

### Phase 4: Proactive Token Refresh ✅ COMPLETE
- [x] Store `expiresAt` in TokenManager
- [x] Add `getTokenExpiry()` JWT parser to AuthTokenService
- [x] Create `TokenRefreshManager` with WidgetsBindingObserver
- [x] Integrate with AuthService (store expiry after login/refresh)
- [x] Initialize in app bootstrap
- [x] Run tests (5,154 pass)

### Phase 5: Entity Naming Convention Unification 🔄

**Status:** Phase 5A ✅ + Phase 5C ✅ | Phase 5B ⏳ Pending

**Problem Discovered (Jan 31, 2026):**
- File attachment upload failed: `POST /api/files/work_order/1` → 404
- Root cause: `FileAttachmentService.entityExists()` received entity key (`work_order`) but queried it as table name (table is `work_orders`)
- Deeper issue: Inconsistent naming across codebase with hardcoded mappings

**Design Decision: Explicit Metadata-Driven Naming**

All entity naming is EXPLICIT in metadata. No derivation. No pattern matching. No hardcoded maps.

| Property | Example | Purpose |
|----------|---------|---------|
| `entityKey` | `work_order` | Internal key, FK columns, code references |
| `tableName` | `work_orders` | Database table AND API URL path |
| `rlsResource` | `work_orders` | Permission checks (usually = tableName) |
| `displayName` | `Work Order` | UI singular label |
| `displayNamePlural` | `Work Orders` | UI plural label |

**RESTful File Routes (Sub-Resource Pattern):**
```
POST   /api/work_orders/123/files      ← Upload file to entity
GET    /api/work_orders/123/files      ← List entity's files
GET    /api/work_orders/123/files/42   ← Get specific file
DELETE /api/work_orders/123/files/42   ← Delete file
```

**Implementation Tasks:**

#### Phase 5A: Entity Naming Unification ✅ COMPLETE
- [x] Add explicit `entityKey` to all 13 backend metadata files
- [x] Update sync script to include `entityKey` in frontend JSON
- [x] Add `entityKey` property to frontend `EntityMetadata` Dart model
- [x] Sync frontend metadata (13 entities with entityKey)
- [x] Update `config/models/index.js` to use explicit `entityKey` (no derivation)
- [x] Add metadata validation (fail-fast on missing `entityKey`)
- [x] Fix `FileAttachmentService.entityExists()` to lookup `tableName` from metadata

#### Phase 5B: Backend Route Restructuring
- [ ] Restructure file routes to `/api/:tableName/:id/files` (sub-resource pattern)
- [ ] Remove `ENTITY_URL_MAP` and `normalizeEntityName()` entirely
- [ ] Update route-loader to mount at `metadata.tableName`
- [ ] Update all tests

#### Phase 5C: Frontend Unification ✅ COMPLETE
- [x] Update sync script to include `entityKey`
- [x] Add `entityKey` to frontend `EntityMetadata` Dart model
- [x] Remove `_entityEndpoint()` hardcoded map in `http_api_client.dart`
- [x] Use `EntityMetadataRegistry.tryGet(entityKey).tableName` for API paths
- [ ] Update `FileService` to use new sub-resource URL pattern (Phase 5B dependency)
- [ ] Update all tests (Phase 5B dependency)

---

### Phase 6: File Attachments Feature

**Infrastructure Status (Audit: Jan 31, 2026):**

| Layer | Component | Status |
|-------|-----------|--------|
| Database | `file_attachments` table (polymorphic) | ✅ Complete |
| Backend | `StorageService` (R2 S3-compatible) | ✅ Complete |
| Backend | `FileAttachmentService` (DB CRUD) | ✅ Complete |
| Backend | `/api/files/*` routes | ⏳ Needs restructure (Phase 5B) |
| Backend | Unit + integration tests | ⏳ Needs update (Phase 5B) |
| Frontend | `FileAttachment` model | ✅ Complete |
| Frontend | `FileService` (Provider registered) | ⏳ Needs update (Phase 5C) |
| Frontend | `EntityFileAttachments` molecule | ✅ Complete |
| Frontend | Admin Files 4-tab scaffold | ✅ Complete |

**Implementation Tasks:**

#### Phase 6A: Entity File Attachments (User-Facing)
- [ ] Add `file_picker` package for file selection
- [ ] Wire `EntityFileAttachments` into `EntityDetailScreen`
- [ ] Add file state management (list, loading, uploading)
- [ ] Implement upload/download/delete handlers
- [ ] Add tests for integration

#### Phase 6B: Admin Files Tab Content
- [ ] Implement Files tab (paginated table, filters, search)
- [ ] Implement Storage tab (R2 bucket statistics)
- [ ] Implement Maintenance tab (orphan detection, cleanup)
- [ ] Implement Settings tab (R2 configuration display)

#### Phase 6C: Production R2 Configuration
- [ ] Set `STORAGE_*` env vars in Railway
- [ ] Verify end-to-end upload/download
- [ ] Test signed URL expiration

---

## 6. Key Decisions

### 6.1 Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Thin shell pattern | Keeps screens <50 lines, delegates to templates + organisms |
| Metadata-driven entities | Single codebase handles any entity type |
| URL-synced vs local tabs | Bookmarkable tabs (logs) vs transient tabs (admin entity) |
| Auth0 for auth | No custom password management, enterprise-ready |
| **Explicit entity naming** | `entityKey`, `tableName`, `rlsResource` explicit in metadata—zero derivation |
| **RESTful file sub-resources** | Files at `/api/:tableName/:id/files`—proper REST, consistent URLs |
| **Zero backward compatibility** | One convention only—no shims, no ambiguity, no cruft |

### 6.2 Component Decisions

| Decision | Rationale |
|----------|-----------|
| `AdaptiveShell` for authenticated | Consistent sidebar/appbar across all auth'd pages |
| `CenteredLayout` for unauthenticated | Simple centered layout for login/error pages |
| `ScrollableContent` molecule | Standardized scroll wrapper for content |

### 6.3 Entity Naming Convention

| Property | Format | Example | Used For |
|----------|--------|---------|----------|
| `entityKey` | snake_case, singular | `work_order` | Code refs, FK columns |
| `tableName` | snake_case, plural | `work_orders` | DB table, API URLs |
| `rlsResource` | snake_case | `work_orders` | Permission checks |
| `displayName` | Title Case | `Work Order` | UI singular |
| `displayNamePlural` | Title Case | `Work Orders` | UI plural, nav |

**URL Pattern:** All APIs use `tableName` → `/api/work_orders/123/files`

---

## 7. Quick Reference

### 7.1 Production Components (KEEP)

| Layer | Component | Usages |
|-------|-----------|--------|
| Template | `AdaptiveShell` | 10 |
| Template | `CenteredLayout` | 1 |
| Organism | `TabbedContent` | 3 |
| Organism | `DashboardContent` | 1 |
| Organism | `AdminHomeContent` | 1 |
| Organism | `SettingsContent` | 1 |
| Organism | `LoginContent` | 1 |
| Organism | `DbHealthDashboard` | 1 |
| Organism | `FilterableDataTable` | 1 |
| Molecule | `ScrollableContent` | 5 |

### 7.2 File Locations

| Category | Path |
|----------|------|
| Screens | `lib/screens/` |
| Templates | `lib/widgets/templates/` |
| Organisms | `lib/widgets/organisms/` |
| Molecules | `lib/widgets/molecules/` |
| Atoms | `lib/widgets/atoms/` |
| Routing | `lib/core/routing/` |
| Config | `lib/config/` |
| Services | `lib/services/` |

### 7.3 Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System architecture overview |
| [AUTH.md](reference/AUTH.md) | Authentication & token refresh |
| [ADMIN_FRONTEND_ARCHITECTURE.md](features/ADMIN_FRONTEND_ARCHITECTURE.md) | Admin frontend design |
| [API.md](reference/API.md) | Backend API documentation |
| [DEVELOPMENT.md](getting-started/DEVELOPMENT.md) | Developer setup guide |

---

## 8. Session Log

### Jan 31, 2026 (Evening) - Entity Naming Unification

**Completed:**
- ✅ Phase 5A: Added explicit `entityKey` to all 13 backend metadata files
- ✅ Phase 5A: Updated `config/models/index.js` to use explicit entityKey (no derivation)
- ✅ Phase 5A: Added fail-fast validation for missing `entityKey`
- ✅ Phase 5A: Fixed `FileAttachmentService.entityExists()` to lookup `tableName` from metadata
- ✅ Phase 5A: Updated sync script + frontend Dart model for `entityKey`
- ✅ Phase 5C: Replaced `_entityEndpoint()` hardcoded map with `EntityMetadataRegistry.tryGet()`
- ✅ All tests pass: 5,154 Flutter + 67 backend

**Next Session (Phase 5B):**
1. Restructure file routes to `/api/:tableName/:id/files` (sub-resource pattern)
2. Remove `ENTITY_URL_MAP` and `normalizeEntityName()` from backend
3. Update `FileService` on frontend to use new URL pattern
4. Update all related tests

**Key Files Modified This Session:**
- Backend: 13 `*-metadata.js` files, `config/models/index.js`, `entity-metadata-validator.js`, `file-attachment-service.js`
- Frontend: `entity_metadata.dart`, `http_api_client.dart`
- Config: `sync-entity-metadata.js`

---

*This document is the Single Source of Truth for TrossApp project status.*
