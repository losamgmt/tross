# Admin Frontend Architecture

> **Last Updated**: January 1, 2026  
> **Purpose**: Complete context for continuing admin frontend development  
> **Status**: Phase 1 Complete, Phases 2-7 Pending

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Backend API Structure](#2-backend-api-structure)
3. [Frontend Architecture Principles](#3-frontend-architecture-principles)
4. [Component Inventory](#4-component-inventory)
5. [Security Implementation](#5-security-implementation)
6. [Development Plan](#6-development-plan)
7. [Configuration Files](#7-configuration-files)
8. [State Management](#8-state-management)
9. [Testing Patterns](#9-testing-patterns)
10. [Open Decisions](#10-open-decisions)
11. [Next Session Checklist](#11-next-session-checklist)

---

## 1. Executive Summary

### What We're Building
A metadata-driven admin frontend with **zero specificity** - generic templates and widgets composed by routes with configuration. No `AdminDashboardScreen`, `AdminLogsScreen`, etc. - just `DashboardPage`, `TabbedPage` templates parameterized at the route level.

### Core Design Principles
- **100% Metadata-Driven**: UI generated from JSON config, no per-entity code
- **Zero Specificity**: Generic widgets, specificity only at route composition
- **Triple-Tier Security**: Router guard → Shell guard → Backend guard
- **Provider-Based State**: Using existing `provider` package with `ChangeNotifier`
- **URL-Driven Navigation**: Tabs use query params for deep-linking
- **Responsive First**: All views adapt to mobile/tablet/desktop
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Screens

### Current Test Status: ✅ ALL PASSING
| Suite | Tests | Status |
|-------|-------|--------|
| Backend Unit | 1619 | ✅ Passing |
| Backend Integration | 742 | ✅ Passing |
| Frontend Flutter | 1950 | ✅ Passing |
| E2E Playwright | 30 | ✅ Passing |

### Phase 1 Status: ✅ COMPLETE
- Router now uses centralized `RouteGuard.checkAccess()` for ALL routes
- `AdaptiveShell` has defense-in-depth guard (second tier)
- All 29 route guard tests passing
- `/admin/*` routes properly protected (was only protecting exact `/admin`)

---

## 2. Backend API Structure

### Base URLs
- **Development**: `http://localhost:3001/api`
- **Production**: `https://tross-api-production.up.railway.app/api`
- **Frontend baseUrl**: Already includes `/api` - endpoints use relative paths

### Business Layer (`/api/...`)
```
/api/auth/me, /refresh, /logout
/api/{entity}/              - CRUD for customers, work_orders, invoices, etc.
/api/preferences/           - User preferences (GET, PUT, POST /reset)
/api/stats/{entity}         - Aggregations
/api/export/{entity}        - CSV exports  
/api/audit/                 - Audit log queries
/api/files/                 - File attachments
/api/health/                - Health checks
/api/schema/                - Schema introspection
/api/dev/                   - Dev-only endpoints
```

### Admin Layer (`/api/admin/...`)
```
/api/admin/system/settings           - GET/PUT system settings
/api/admin/system/maintenance        - GET/PUT maintenance mode
/api/admin/system/sessions           - GET active sessions
/api/admin/system/sessions/:userId/* - Force logout, reactivate
/api/admin/system/logs/data          - CRUD operation logs
/api/admin/system/logs/auth          - Authentication logs
/api/admin/system/config/permissions - View permissions.json
/api/admin/system/config/validation  - View validation-rules.json
/api/admin/{entity}/                 - Entity metadata (RLS, field access)
```

### Entities
`customers`, `work_orders`, `invoices`, `contracts`, `inventory`, `technicians`, `users`, `roles`, `saved_views`

---

## 3. Frontend Architecture Principles

### Layer Model
```
┌─────────────────────────────────────────────────────────┐
│  ROUTES (app_router.dart)                               │
│  - Compose templates with config                        │
│  - Pass metadata to templates                           │
│  - ONLY place specificity lives                         │
├─────────────────────────────────────────────────────────┤
│  TEMPLATES (widgets/templates/)                         │
│  - DashboardPage, TabbedPage, AdaptiveShell             │
│  - Fully parameterized, zero business logic             │
├─────────────────────────────────────────────────────────┤
│  ORGANISMS (widgets/organisms/)                         │
│  - Compose molecules, manage local state                │
│  - AsyncDataProvider, DataTable, ErrorDisplay           │
├─────────────────────────────────────────────────────────┤
│  MOLECULES (widgets/molecules/)                         │
│  - Compose atoms into reusable units                    │
│  - ErrorCard, KeyValueList, Matrix, ButtonGroup         │
├─────────────────────────────────────────────────────────┤
│  ATOMS (widgets/atoms/)                                 │
│  - Smallest building blocks                             │
│  - LoadingIndicator, StatusBadge, IconButton            │
└─────────────────────────────────────────────────────────┘
```

### Route Composition Pattern
```dart
// Routes compose templates with config - NO specific screen classes
GoRoute(
  path: '/admin/logs',
  builder: (_) => TabbedPage(
    tabs: [
      TabConfig(label: 'Data', body: AuditLogTable(type: 'data')),
      TabConfig(label: 'Auth', body: AuditLogTable(type: 'auth')),
    ],
  ),
)
```

### Data Source Abstraction
```dart
// Abstract interface - swap JSON for API when ready
abstract class MetadataProvider {
  Future<Map<String, dynamic>> getEntityMetadata(String entity);
  bool get isEditable;  // false for JSON, true for API
}
```

---

## 4. Component Inventory

### Already Exists ✅

#### Atoms (`widgets/atoms/`)
| Component | Subdirectory | Purpose |
|-----------|--------------|---------|
| `LoadingIndicator` | `indicators/` | Spinner with size variants |
| `StatusBadge` | `display/` | Color-coded status labels |
| Various buttons | `buttons/` | Icon buttons, action buttons |
| Typography | `typography/` | Text styles |
| Inputs | `inputs/` | Form input atoms |

#### Molecules (`widgets/molecules/`)
| Component | Subdirectory | Purpose |
|-----------|--------------|---------|
| `ErrorCard` | `cards/` | Inline error with retry |
| `TitledCard` | `cards/` | Card with title header |
| `DataCell` | `display/` | Table cell display |
| `InlineEditCell` | `display/` | Editable cell |
| `UserInfoHeader` | `display/` | User avatar + name display |
| Button groups | `buttons/` | Grouped action buttons |
| Form widgets | `forms/` | Form field molecules |
| Pagination | `pagination/` | Page controls |

#### Organisms (`widgets/organisms/`)
| Component | Subdirectory | Purpose |
|-----------|--------------|---------|
| `ErrorDisplay` | `feedback/` | Full-page error (404, 403, 500) |
| `DashboardContent` | `dashboards/` | Stats cards grid |
| `EntityDetailCard` | `cards/` | Metadata-driven entity display |
| `EntityFormModal` | `modals/` | CRUD form modal |
| `EntityDataTable` | `tables/` | Metadata-driven data table |
| `NavMenuItem` | `navigation/` | Sidebar/menu item |
| Login widgets | `login/` | Auth0 login flow |
| Guards | `guards/` | Permission gates |

#### Templates (`widgets/templates/`)
| Component | Purpose |
|-----------|---------|
| `AdaptiveShell` | Responsive sidebar/drawer layout with defense-in-depth guard |
| `MasterDetailLayout` | Two-pane responsive layout |

#### Providers (`providers/`)
| Provider | Purpose |
|----------|---------|
| `AuthProvider` | Auth state, user, token, role |
| `AppProvider` | Network/backend health state |
| `DashboardProvider` | Dashboard statistics |
| `PreferencesProvider` | User preferences |

#### Services (`services/`)
| Service | Purpose |
|---------|---------|
| `GenericEntityService` | CRUD for any entity |
| `NavMenuBuilder` | Builds menus from nav-config.json |
| `EntityMetadataRegistry` | Entity metadata access |
| `PermissionServiceDynamic` | Role-based permission checks |
| `NavConfigService` | Navigation configuration loader |
| `ApiClient` | HTTP client with auth |
| `StatsService` | Dashboard statistics API |
| `AuditLogService` | Audit log queries |
| `FileService` | File attachment operations |
| `PreferencesService` | User preferences API |

### Need to Build ❌
| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `DataMatrix` | Molecule | `molecules/display/` | Row×column grid, readonly/editable |
| `KeyValueList` | Molecule | `molecules/display/` | Vertical label:value pairs |
| `TabbedPage` | Template | `templates/` | Tab bar + content, URL-driven |
| `DashboardPage` | Template | `templates/` | Responsive card grid for admin |
| `MetadataProvider` | Interface | `services/metadata/` | Abstract data source |
| `JsonMetadataProvider` | Impl | `services/metadata/` | Loads from JSON assets |
| `EditableFormProvider` | Provider | `providers/` | Dirty state tracking for batch save |
| `SaveDiscardBar` | Molecule | `molecules/forms/` | Appears when form is dirty |

---

## 5. Security Implementation

### Triple-Tier Defense-in-Depth

| Tier | Component | Location | Mechanism |
|------|-----------|----------|-----------|
| **1** | Router Guard | `app_router.dart` | `RouteGuard.checkAccess()` in redirect |
| **2** | Shell Guard | `AdaptiveShell.build()` | Secondary check before rendering |
| **3** | Backend Guard | `/api/admin/*` routes | 403 Forbidden if not admin |

### Phase 1 Changes (COMPLETED)

**File: `app_router.dart`**
- Replaced inline admin check with `RouteGuard.checkAccess()`
- Now protects ALL `/admin/*` routes, not just exact `/admin`
- Import changed: `route_guard.dart` instead of `auth_profile_service.dart`

**File: `adaptive_shell.dart`**  
- Added `RouteGuard.checkAccess()` check at start of `build()`
- If access denied, renders inline error with "Go to Home" button
- Safety net if router guard somehow bypassed

### Key Files
```
frontend/lib/core/routing/
├── app_router.dart      # GoRouter config with redirect logic
├── app_routes.dart      # Route constants + requiresAdmin()
└── route_guard.dart     # RouteGuard.checkAccess() - SINGLE SOURCE OF TRUTH

frontend/lib/services/auth/
└── auth_profile_service.dart  # AuthProfileService.isAdmin(user)
```

### Route Protection Logic
```dart
// In RouteGuard.checkAccess()
if (AppRoutes.requiresAdmin(route)) {  // Uses startsWith('/admin')
  if (!AuthProfileService.isAdmin(user)) {
    return RouteGuardResult.unauthorized();
  }
}
```

---

## 6. Development Plan

### Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Security Foundation | ✅ COMPLETE | Router + Shell guards |
| 2 | Display Primitives | ❌ TODO | DataMatrix, KeyValueList |
| 3 | Data Layer | ❌ TODO | MetadataProvider interface |
| 4 | Page Templates | ❌ TODO | TabbedPage, DashboardPage |
| 5 | State Management | ❌ TODO | EditableFormProvider |
| 6 | Route Composition | ❌ TODO | Wire up admin routes |
| 7 | Admin Widgets | ❌ TODO | Health, Sessions, Panels |

### Phase 2: Display Primitives
```
Create:
- frontend/lib/widgets/molecules/display/data_matrix.dart
- frontend/lib/widgets/molecules/display/key_value_list.dart
Update:
- frontend/lib/widgets/molecules/molecules.dart (exports)
```

### Phase 3: Data Layer
```
Create:
- frontend/lib/services/metadata/metadata_provider.dart (interface)
- frontend/lib/services/metadata/json_metadata_provider.dart (impl)
Update:
- frontend/lib/main.dart (register provider)
```

### Phase 4: Page Templates
```
Create:
- frontend/lib/widgets/templates/tabbed_page.dart
- frontend/lib/widgets/templates/dashboard_page.dart
Update:
- frontend/lib/widgets/templates/templates.dart (exports)
```

### Phase 5: State Management
```
Create:
- frontend/lib/providers/editable_form_provider.dart
- frontend/lib/widgets/molecules/forms/save_discard_bar.dart
```

### Phase 6: Route Composition
```
Update:
- frontend/lib/core/routing/app_router.dart (admin routes)
- frontend/assets/config/nav-config.json (admin sidebar)
```

### Phase 7: Admin Widgets
```
Create:
- frontend/lib/widgets/organisms/admin/health_status_widget.dart
- frontend/lib/widgets/organisms/admin/sessions_widget.dart
- frontend/lib/widgets/organisms/admin/maintenance_toggle.dart
- frontend/lib/widgets/organisms/admin/permissions_panel.dart
- frontend/lib/widgets/organisms/admin/validation_panel.dart
- frontend/lib/widgets/organisms/admin/audit_log_table.dart
```

---

## 7. Configuration Files

### Location: `frontend/assets/config/`

| File | Purpose | Used By |
|------|---------|---------|
| `entity-metadata.json` | Entity definitions, fields, relationships | GenericEntityService, forms |
| `nav-config.json` | Sidebar/menu structure, route strategies | NavMenuBuilder, AdaptiveShell |
| `permissions.json` | RLS policies, role permissions | PermissionGate, backend |
| `validation-rules.json` | Field validation rules | Form validation |

### nav-config.json Admin Strategy
```json
{
  "sidebarStrategies": {
    "admin": {
      "label": "Administration",
      "sections": [
        { "id": "home", "label": "Home", "route": "/admin" },
        { "id": "entities", "label": "Entities", "isGrouper": true, "dynamic": true },
        { "id": "logs", "label": "Logs", "route": "/admin/logs" }
      ]
    }
  },
  "routeStrategies": {
    "/admin": "admin",
    "/admin/*": "admin"
  }
}
```

### Admin Routes (Current)
```
/admin                    → AdminScreen (placeholder)
/admin/system/logs/data   → _AdminSectionScreen('logs/data')
/admin/system/logs/auth   → _AdminSectionScreen('logs/auth')
/admin/:entity            → _AdminSectionScreen(entity)
```

### Admin Routes (Target)
```
/admin                    → DashboardPage(health, sessions, maintenance)
/admin/logs               → TabbedPage(Data | Auth tabs)
/admin/:entity            → TabbedPage(Permissions | Validation | Settings)
```

---

## 8. State Management

### Current Stack
- **Package**: `provider: ^6.1.2` (already installed)
- **Pattern**: `ChangeNotifier` + `Consumer` / `context.watch`

### Existing Providers
| Provider | Scope | Purpose |
|----------|-------|---------|
| `AuthProvider` | Global | Auth state, user, token |
| `AppProvider` | Global | Network/backend health |
| `DashboardProvider` | Global | Dashboard stats |
| `PreferencesProvider` | Global | User preferences |

### Scope Strategy
| Data Type | Scope | Reason |
|-----------|-------|--------|
| Auth, User | Global | Needed everywhere |
| Permissions, Metadata | Global | Loaded once, used everywhere |
| Health Status | Global | Shown in dashboard, admin, header |
| Audit Logs | Scoped | Fresh fetch each visit, large dataset |
| Entity Lists | Scoped | Respects filters/pagination |

### Tab State: URL + Provider Hybrid
```dart
// URL captures NAVIGATION state (tab selection)
GoRoute(
  path: '/admin/logs',
  builder: (context, state) {
    final activeTab = state.uri.queryParameters['tab'] ?? 'data';
    return TabbedPage(
      activeTab: activeTab,
      onTabChanged: (tab) => context.go('/admin/logs?tab=$tab'),
      tabs: [...],
    );
  },
)

// Provider captures DATA state (fetched data)
final auditLogsProvider = ...;  // Cached, survives tab switches
```

### Dirty State Pattern (for Phase 5)
```dart
class EditableFormProvider extends ChangeNotifier {
  Map<String, dynamic> _original = {};
  Map<String, dynamic> _current = {};
  
  bool get isDirty => _original != _current;
  int get changeCount => ...;
  
  void updateField(String key, dynamic value);
  Future<void> save();
  void discard();
}
```

---

## 9. Testing Patterns

### Critical Testing Infrastructure

#### MockAuthProvider (REQUIRED for widget tests)
Location: `test/mocks/mock_services.dart`

**Why it exists**: Real `AuthProvider` uses platform channels (`flutter_secure_storage`) that don't work in tests. `AdaptiveShell` has defense-in-depth that blocks unauthenticated users.

**Usage Pattern**:
```dart
import '../mocks/mock_services.dart';

Widget createTestWidget() {
  return MultiProvider(
    providers: [
      // MUST use MockAuthProvider, NOT AuthProvider()
      ChangeNotifierProvider<AuthProvider>.value(
        value: MockAuthProvider.authenticated(role: 'admin'),
      ),
      // Other providers...
    ],
    child: const YourWidget(),
  );
}
```

**Available factories**:
- `MockAuthProvider()` - Unauthenticated state
- `MockAuthProvider.authenticated()` - Admin user (default)
- `MockAuthProvider.authenticated(role: 'technician')` - Specific role

#### Test Helpers
Location: `test/helpers/`

| Helper | Purpose |
|--------|---------|
| `pumpTestWidget()` | Wrap widget with MaterialApp + necessary context |
| `TestHarness` | Full test setup with providers |
| `TestApiClient` | Mock HTTP responses |
| `SilentErrorService` | Suppress error logs in tests |

### Test Philosophy

**DO test**:
- User-observable behavior (can tap, sees text, form submits)
- Provider state changes
- Service API calls and responses
- Route guard access control

**DON'T test**:
- Specific widget types (fragile, implementation detail)
- Widget tree structure
- Thin wrapper screens (test the organisms/templates instead)

### Running Tests
```bash
# All frontend tests
cd frontend && flutter test

# Failures only (with custom parser)
npm run test:frontend:failures

# All tests (backend + frontend + e2e)
npm run test:all

# Backend unit only
npm run test:unit

# Backend integration only  
npm run test:integration

# E2E only
npm run test:e2e
```

---

## 10. Open Decisions

### Resolved ✅

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management library | `provider` (existing) | Already invested, KISS |
| Async data pattern | Provider-based | Unified with existing patterns |
| Tab state | URL + Provider hybrid | Deep-linkable, data cached |
| Metadata source swap | Build-time | One-time major version change |
| Responsiveness | 100% responsive | Mobile targets planned |
| Provider scope | Global for shared, Scoped for screen-specific | Simple rule |
| Edit mode save | Batch save with dirty tracking | Better UX than auto-save |
| Logs: separate routes vs tabs | Single route with tabs | Simpler sidebar |
| Screen test strategy | Test organisms/templates, not thin wrappers | Avoids fragile tests |
| Mock auth in tests | `MockAuthProvider.authenticated()` | Bypasses platform channels |

### Pending ❓

| Decision | Options | Notes |
|----------|---------|-------|
| Tab component | Build custom vs use package | Need to evaluate flutter packages |
| Dashboard grid columns | Fixed vs fully responsive | Leaning responsive |
| Entity list in admin sidebar | All vs filtered by permission | Leaning all (admins see all) |

---

## 11. Next Session Checklist

### Quick Context Load
1. Read this document: `docs/ADMIN_FRONTEND_ARCHITECTURE.md`
2. Current phase: **Phase 2 - Display Primitives**
3. All tests passing (1619 + 742 + 1950 + 30 = 4341 tests)
4. Analysis clean: `flutter analyze lib/` and `npm run lint` (no issues)

### Verify Environment
```bash
# Ensure all tests still pass
npm run test:all

# Check for lint issues
cd backend && npm run lint
cd frontend && flutter analyze lib/
```

### Phase 2 Tasks
- [ ] Create `DataMatrix` molecule (`molecules/display/data_matrix.dart`)
- [ ] Create `KeyValueList` molecule (`molecules/display/key_value_list.dart`)
- [ ] Update exports (`molecules/molecules.dart`)
- [ ] Write tests (use `MockAuthProvider.authenticated()` if needed)
- [ ] Run `flutter analyze lib/`

### Key Files to Reference
```
# Architecture & Routing
frontend/lib/core/routing/app_router.dart      # Routes with guards
frontend/lib/core/routing/route_guard.dart     # Access control logic
frontend/lib/widgets/templates/adaptive_shell.dart  # Shell with guard

# Configuration
frontend/assets/config/nav-config.json         # Navigation structure
frontend/assets/config/entity-metadata.json    # Entity definitions
config/permissions.json                         # Role permissions

# Testing
frontend/test/mocks/mock_services.dart         # MockAuthProvider
frontend/test/helpers/                          # Test utilities
```

### Test Commands
```bash
# Quick validation
cd frontend && flutter test --reporter=compact

# Failures only
npm run test:frontend:failures

# Full suite
npm run test:all

# Backend only
npm run test:unit && npm run test:integration

# E2E only
npm run test:e2e
```

### Session Resume Prompt
> "I'm continuing work on TrossApp admin frontend. Please read 
> `docs/ADMIN_FRONTEND_ARCHITECTURE.md` for full context. We completed 
> Phase 1 (security). Ready to start Phase 2 (display primitives).
> All tests are currently passing."

---

## Appendix: File Structure Reference

```
frontend/lib/
├── config/                     # App configuration
├── core/
│   └── routing/
│       ├── app_router.dart     # GoRouter config
│       ├── app_routes.dart     # Route constants
│       └── route_guard.dart    # Access control
├── models/                     # Data models
├── providers/                  # ChangeNotifier providers
│   ├── auth_provider.dart
│   ├── app_provider.dart
│   ├── dashboard_provider.dart
│   └── preferences_provider.dart
├── screens/                    # Top-level screens (thin wrappers)
├── services/                   # API & business logic
│   ├── auth/
│   ├── entity_metadata.dart
│   ├── generic_entity_service.dart
│   ├── nav_menu_builder.dart
│   └── ...
├── utils/                      # Utility functions
└── widgets/
    ├── atoms/                  # Smallest building blocks
    ├── molecules/              # Composed atoms
    ├── organisms/              # Complex components
    └── templates/              # Page layouts

frontend/test/
├── helpers/                    # Test utilities
├── mocks/
│   └── mock_services.dart      # MockAuthProvider, etc.
├── core/routing/               # Route guard tests
├── providers/                  # Provider tests
├── services/                   # Service tests
├── templates/                  # Template tests
└── widgets/                    # Widget tests
```
