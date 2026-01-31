# TrossApp Project Status (SSOT)

**Last Updated:** January 30, 2026  
**Test Status:** ✅ 5,145 tests passing

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Current State](#3-current-state)
4. [Technical Debt & Issues](#4-technical-debt--issues)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Key Decisions](#6-key-decisions)
7. [Quick Reference](#7-quick-reference)

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
| `/admin/system/logs/:tab` | _AdminLogsScreen | AdaptiveShell | TabbedPage |
| `/admin/system/files` | _AdminFilesScreen | AdaptiveShell | TabbedContainer |
| `/admin/:entity` | _AdminEntityScreen | AdaptiveShell | TabbedContainer |

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

### 3.2 In Progress 🔄

- [ ] File attachments admin (4-tab UI scaffolded, content TBD)
- [ ] Widget architecture unification (audit complete, implementation pending)
- [ ] Proactive token refresh (audit complete, implementation pending)

### 3.3 Test Coverage

| Suite | Count | Status |
|-------|-------|--------|
| Frontend Unit | ~5,000 | ✅ Passing |
| Frontend Widget | ~100 | ✅ Passing |
| Backend Unit | ~30 | ✅ Passing |
| Backend Integration | ~15 | ✅ Passing |
| **Total** | **5,145** | ✅ Passing |

---

## 4. Technical Debt & Issues

### 4.1 Dead Code (DELETE)

| File | Location | Reason |
|------|----------|--------|
| `dashboard_page.dart` | `templates/` | 0 production usages |
| `master_detail_layout.dart` | `templates/` | 0 production usages |

### 4.2 Unused Components (EVALUATE)

| File | Location | Status |
|------|----------|--------|
| `action_grid.dart` | `organisms/layout/` | Tests only, no production use |
| `card_grid.dart` | `organisms/layout/` | Tests only, no production use |

### 4.3 Duplication (UNIFY)

| Issue | Components | Resolution |
|-------|------------|------------|
| Tab components | `TabbedPage` + `TabbedContainer` | Create unified `TabbedContent(syncWithUrl: bool)` |

### 4.4 Inconsistency (STANDARDIZE)

| Issue | Affected | Resolution |
|-------|----------|------------|
| Scroll handling | `DashboardContent`, `AdminHomeContent`, `SettingsContent` | Migrate to `ScrollableContent` molecule |

---

## 5. Implementation Roadmap

### Phase 1: Delete Dead Code (Low Risk)
- [ ] Delete `dashboard_page.dart`
- [ ] Delete `master_detail_layout.dart`
- [ ] Update `templates.dart` barrel
- [ ] Run tests

### Phase 2: Evaluate Unused Organisms
- [ ] Decide: Delete or keep `ActionGrid`
- [ ] Decide: Delete or keep `CardGrid`
- [ ] Execute decision
- [ ] Run tests

### Phase 3: Unify Tab Components
- [ ] Create `TabbedContent` organism with `syncWithUrl: bool`
- [ ] Migrate `_AdminLogsScreen` → `TabbedContent(syncWithUrl: true)`
- [ ] Migrate `_AdminFilesScreen` → `TabbedContent(syncWithUrl: false)`
- [ ] Migrate `_AdminEntityScreen` → `TabbedContent(syncWithUrl: false)`
- [ ] Delete `TabbedPage` and `TabbedContainer`
- [ ] Run tests

### Phase 4: Standardize Scrolling
- [ ] Migrate `DashboardContent` → use `ScrollableContent`
- [ ] Migrate `AdminHomeContent` → use `ScrollableContent`
- [ ] Migrate `SettingsContent` → use `ScrollableContent`
- [ ] Run tests

### Phase 5: Proactive Token Refresh (UX-Critical)
- [ ] Store `expiresAt` in TokenManager
- [ ] Add `getTokenExpiry()` JWT parser to AuthTokenService
- [ ] Create `TokenRefreshManager` with WidgetsBindingObserver
- [ ] Integrate with AuthService (store expiry after login/refresh)
- [ ] Initialize in app bootstrap
- [ ] Run tests

### Phase 6: File Attachments Feature
- [ ] Implement Files tab (browse, search, download)
- [ ] Implement Storage tab (R2 statistics)
- [ ] Implement Maintenance tab (orphan detection, cleanup)
- [ ] Implement Settings tab (R2 configuration)

---

## 6. Key Decisions

### 6.1 Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Thin shell pattern | Keeps screens <50 lines, delegates to templates + organisms |
| Metadata-driven entities | Single codebase handles any entity type |
| URL-synced vs local tabs | Bookmarkable tabs (logs) vs transient tabs (admin entity) |
| Auth0 for auth | No custom password management, enterprise-ready |

### 6.2 Component Decisions

| Decision | Rationale |
|----------|-----------|
| `AdaptiveShell` for authenticated | Consistent sidebar/appbar across all auth'd pages |
| `CenteredLayout` for unauthenticated | Simple centered layout for login/error pages |
| `ScrollableContent` molecule | Standardized scroll wrapper for content |

---

## 7. Quick Reference

### 7.1 Production Components (KEEP)

| Layer | Component | Usages |
|-------|-----------|--------|
| Template | `AdaptiveShell` | 10 |
| Template | `CenteredLayout` | 1 |
| Organism | `TabbedContainer` | 2 |
| Organism | `DashboardContent` | 1 |
| Organism | `AdminHomeContent` | 1 |
| Organism | `SettingsContent` | 1 |
| Organism | `LoginContent` | 1 |
| Organism | `DbHealthDashboard` | 1 |
| Organism | `FilterableDataTable` | 1 |
| Molecule | `ScrollableContent` | 2 |

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
| [WIDGET_ARCHITECTURE_AUDIT.md](architecture/WIDGET_ARCHITECTURE_AUDIT.md) | Detailed component audit |
| [AUTH_TOKEN_REFRESH_PLAN.md](architecture/AUTH_TOKEN_REFRESH_PLAN.md) | Proactive token refresh implementation |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture overview |
| [API.md](API.md) | Backend API documentation |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Developer setup guide |

---

*This document is the Single Source of Truth for TrossApp project status.*
