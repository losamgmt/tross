# Admin Frontend Architecture

> **Purpose**: Architecture decisions and context for admin frontend development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Backend API Structure](#2-backend-api-structure)
3. [Frontend Architecture Principles](#3-frontend-architecture-principles)
4. [Component Inventory](#4-component-inventory)
5. [Security Implementation](#5-security-implementation)
6. [Configuration Files](#6-configuration-files)
7. [State Management](#7-state-management)
8. [Testing Patterns](#8-testing-patterns)
9. [Architecture Decisions](#9-architecture-decisions)

---

## 1. Executive Summary

### What We're Building

A metadata-driven admin frontend with **zero specificity** - generic templates and widgets composed by routes with configuration. No `AdminDashboardScreen`, `AdminLogsScreen`, etc. - just `TabbedContent`, `AdaptiveShell` templates parameterized at the route level.

### Core Design Principles

- **100% Metadata-Driven**: UI generated from JSON config, no per-entity code
- **Zero Specificity**: Generic widgets, specificity only at route composition
- **Triple-Tier Security**: Router guard → Shell guard → Backend guard
- **Provider-Based State**: Using existing `provider` package with `ChangeNotifier`
- **URL-Driven Navigation**: Tabs use query params for deep-linking
- **Responsive First**: All views adapt to mobile/tablet/desktop
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Screens

### Current Test Status

All test suites should pass before making changes. Run `npm run test:all` to verify.

### Current Implementation Status

- Router uses centralized `RouteGuard.checkAccess()` for ALL routes
- `AdaptiveShell` has defense-in-depth guard (second tier)
- Route guard tests are comprehensive
- `/admin/*` routes properly protected

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
/api/{entity}/{id}/files/   - File attachments (sub-resource pattern)
/api/preferences/           - User preferences (GET, PUT, POST /reset)
/api/stats/{entity}         - Aggregations
/api/export/{entity}        - CSV exports
/api/audit/                 - Audit log queries
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
/api/admin/system/config/validation  - View validation (derived from metadata)
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
│  - AdaptiveShell, CenteredLayout                        │
│  - Fully parameterized, zero business logic             │
├─────────────────────────────────────────────────────────┤
│  ORGANISMS (widgets/organisms/)                         │
│  - Compose molecules, manage local state                │
│  - TabbedContent, DataTable, ErrorDisplay               │
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
  path: '/admin/logs/:tab',
  builder: (context, state) {
    final tab = state.pathParameters['tab'] ?? 'data';
    return AdaptiveShell(
      body: TabbedContent(
        syncWithUrl: true,
        currentTabId: tab,
        baseRoute: '/admin/system/logs',
        tabs: [
          TabConfig(id: 'data', label: 'Data Changes'),
          TabConfig(id: 'auth', label: 'Auth Events'),
        ],
        contentBuilder: (tabId) => AuditLogTable(type: tabId),
      ),
    );
  },
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

| Component          | Subdirectory  | Purpose                      |
| ------------------ | ------------- | ---------------------------- |
| `LoadingIndicator` | `indicators/` | Spinner with size variants   |
| `StatusBadge`      | `display/`    | Color-coded status labels    |
| Various buttons    | `buttons/`    | Icon buttons, action buttons |
| Typography         | `typography/` | Text styles                  |
| Inputs             | `inputs/`     | Form input atoms (see below) |

**Input Atoms - Accessibility-First Design:**

All form inputs follow these principles:

- **Keyboard navigable** - Tab to focus, Space/Enter to activate
- **Focus states visible** - Clear visual indicator when focused
- **Native widgets preferred** - Use Flutter's `DropdownMenu`, `Checkbox`, `Radio` for built-in accessibility
- **Custom widgets accessible** - `FocusNode` + `KeyboardListener` + `Semantics` wrapper

| Input            | Type                  | Keyboard Support                       |
| ---------------- | --------------------- | -------------------------------------- |
| `TextInput`      | Native TextField      | Full native support                    |
| `NumberInput`    | Native TextField      | Full native support                    |
| `TextAreaInput`  | Native TextField      | Full native support                    |
| `SelectInput`    | DropdownMenu          | Arrow keys, typeahead, Enter to select |
| `LookupInput`    | Async search dropdown | Search + arrow keys + Enter            |
| `FilterDropdown` | MenuAnchor            | Typeahead filtering, arrow keys        |
| `DateInput`      | Custom + DatePicker   | Space/Enter opens picker               |
| `TimeInput`      | Custom + TimePicker   | Space/Enter opens picker               |
| `BooleanToggle`  | Custom icon button    | Space/Enter toggles, focus ring        |
| `CheckboxInput`  | Native Checkbox       | Full native support                    |
| `RadioInput`     | Native Radio          | Full native support                    |

#### Molecules (`widgets/molecules/`)

| Component        | Subdirectory  | Purpose                    |
| ---------------- | ------------- | -------------------------- |
| `ErrorCard`      | `cards/`      | Inline error with retry    |
| `TitledCard`     | `cards/`      | Card with title header     |
| `DataCell`       | `display/`    | Table cell display         |
| `InlineEditCell` | `display/`    | Editable cell              |
| `UserInfoHeader` | `display/`    | User avatar + name display |
| Button groups    | `buttons/`    | Grouped action buttons     |
| Form widgets     | `forms/`      | Form field molecules       |
| Pagination       | `pagination/` | Page controls              |

#### Organisms (`widgets/organisms/`)

| Component          | Subdirectory  | Purpose                         |
| ------------------ | ------------- | ------------------------------- |
| `ErrorDisplay`     | `feedback/`   | Full-page error (404, 403, 500) |
| `DashboardContent` | `dashboards/` | Config-driven entity charts     |
| `EntityDetailCard` | `cards/`      | Metadata-driven entity display  |
| `EntityFormModal`  | `modals/`     | CRUD form modal                 |
| `EntityDataTable`  | `tables/`     | Metadata-driven data table      |
| `NavMenuItem`      | `navigation/` | Sidebar/menu item               |
| Login widgets      | `login/`      | Auth0 login flow                |
| Guards             | `guards/`     | Permission gates                |

#### Templates (`widgets/templates/`)

| Component        | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `AdaptiveShell`  | Responsive sidebar/drawer layout with defense-in-depth guard |
| `CenteredLayout` | Centered content layout for unauthenticated pages            |

#### Providers (`providers/`)

| Provider              | Purpose                         |
| --------------------- | ------------------------------- |
| `AuthProvider`        | Auth state, user, token, role   |
| `AppProvider`         | Network/backend health state    |
| `DashboardProvider`   | Dashboard chart data per entity |
| `PreferencesProvider` | User preferences                |

#### Services (`services/`)

| Service                    | Purpose                           |
| -------------------------- | --------------------------------- |
| `GenericEntityService`     | CRUD for any entity               |
| `NavMenuBuilder`           | Builds menus from nav-config.json |
| `EntityMetadataRegistry`   | Entity metadata access            |
| `PermissionServiceDynamic` | Role-based permission checks      |
| `NavConfigService`         | Navigation configuration loader   |
| `ApiClient`                | HTTP client with auth             |
| `StatsService`             | Dashboard statistics API          |
| `AuditLogService`          | Audit log queries                 |
| `FileService`              | File attachment operations        |
| `PreferencesService`       | User preferences API              |

### Need to Build ❌

| Component              | Type      | Location             | Purpose                             |
| ---------------------- | --------- | -------------------- | ----------------------------------- |
| `MetadataProvider`     | Interface | `services/metadata/` | Abstract data source                |
| `JsonMetadataProvider` | Impl      | `services/metadata/` | Loads from JSON assets              |
| `EditableFormProvider` | Provider  | `providers/`         | Dirty state tracking for batch save |
| `SaveDiscardBar`       | Molecule  | `molecules/forms/`   | Appears when form is dirty          |

### Already Built (Completed) ✅

| Component           | Type     | Location                | Purpose                                        |
| ------------------- | -------- | ----------------------- | ---------------------------------------------- |
| `DataMatrix`        | Molecule | `molecules/display/`    | Row×column grid                                |
| `KeyValueList`      | Molecule | `molecules/display/`    | Vertical label:value pairs                     |
| `TabbedContent`     | Organism | `organisms/layout/`     | Unified tab bar with local or URL-synced state |
| `ScrollableContent` | Molecule | `molecules/containers/` | Standardized scroll wrapper                    |

---

## 5. Security Implementation

### Triple-Tier Defense-in-Depth

| Tier  | Component     | Location                | Mechanism                              |
| ----- | ------------- | ----------------------- | -------------------------------------- |
| **1** | Router Guard  | `app_router.dart`       | `RouteGuard.checkAccess()` in redirect |
| **2** | Shell Guard   | `AdaptiveShell.build()` | Secondary check before rendering       |
| **3** | Backend Guard | `/api/admin/*` routes   | 403 Forbidden if not admin             |

### Security Implementation Details

**File: `app_router.dart`**

- Uses `RouteGuard.checkAccess()` for protection
- Protects ALL `/admin/*` routes via path matching

**File: `adaptive_shell.dart`**

- Has defense-in-depth `RouteGuard.checkAccess()` check
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

## 6. Configuration Files

### Location: `frontend/assets/config/`

| File                   | Purpose                                               | Used By                                           |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `entity-metadata.json` | Entity definitions, fields, validation, relationships | GenericEntityService, forms, JsonMetadataProvider |
| `nav-config.json`      | Sidebar/menu structure, route strategies              | NavMenuBuilder, AdaptiveShell                     |
| `permissions.json`     | RLS policies, role permissions                        | PermissionGate, backend                           |

> **Note**: Validation rules are included in `entity-metadata.json` (SSOT). There is no separate validation-rules.json file.

### nav-config.json Strategies

**App Strategy** (Main Business Navigation):

```json
{
  "sidebarStrategies": {
    "app": {
      "label": "Main Navigation",
      "groups": ["crm", "operations", "finance", "admin"],
      "includeEntities": true,
      "showDashboard": true
    }
  }
}
```

- **Groups**: `crm`, `operations`, `finance`, `admin`
- **Admin Group**: Contains `user` and `role` entities (admin-only visibility)
- **Permission Gating**: Nav items filtered by `PermissionService.hasPermission(role, resource, read)`

**Admin Strategy** (System Configuration):

```json
{
  "sidebarStrategies": {
    "admin": {
      "label": "Administration",
      "groups": ["crm", "operations", "finance", "admin"],
      "sections": [
        { "id": "home", "label": "Home", "route": "/admin" },
        { "id": "entities", "label": "Entities", "isGrouper": true },
        { "id": "logs", "label": "Logs", "route": "/admin/system/logs" },
        { "id": "files", "label": "Files", "route": "/admin/system/files" }
      ]
    }
  },
  "routeStrategies": {
    "/admin": "admin",
    "/admin/*": "admin"
  }
}
```

### Admin Routes

```
/admin                    → AdminScreen (dashboard)
/admin/system/health      → System health dashboard
/admin/system/logs/:tab   → TabbedContent (Data Changes | Auth Events)
/admin/system/files       → TabbedContent (file attachments - placeholder)
/admin/:entity            → TabbedContent (entity metadata viewer)
```

---

## 7. State Management

### Current Stack

- **Package**: `provider: ^6.1.2` (already installed)
- **Pattern**: `ChangeNotifier` + `Consumer` / `context.watch`

### Existing Providers

| Provider              | Scope  | Purpose                 |
| --------------------- | ------ | ----------------------- |
| `AuthProvider`        | Global | Auth state, user, token |
| `AppProvider`         | Global | Network/backend health  |
| `DashboardProvider`   | Global | Dashboard stats         |
| `PreferencesProvider` | Global | User preferences        |

### Scope Strategy

| Data Type             | Scope  | Reason                                |
| --------------------- | ------ | ------------------------------------- |
| Auth, User            | Global | Needed everywhere                     |
| Permissions, Metadata | Global | Loaded once, used everywhere          |
| Health Status         | Global | Shown in dashboard, admin, header     |
| Audit Logs            | Scoped | Fresh fetch each visit, large dataset |
| Entity Lists          | Scoped | Respects filters/pagination           |

### Tab State: TabbedContent Dual Mode

```dart
// URL-synced mode (bookmarkable, shareable)
TabbedContent(
  syncWithUrl: true,
  currentTabId: tabFromUrl,
  baseRoute: '/admin/system/logs',
  tabs: [...],
  contentBuilder: (tabId) => ...,
)

// Local state mode (modals, nested contexts)
TabbedContent(
  syncWithUrl: false,  // default
  tabs: [...],
  contentBuilder: (tabId) => ...,
)
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

## 8. Testing Patterns

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

| Helper               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `pumpTestWidget()`   | Wrap widget with MaterialApp + necessary context |
| `TestHarness`        | Full test setup with providers                   |
| `TestApiClient`      | Mock HTTP responses                              |
| `SilentErrorService` | Suppress error logs in tests                     |

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

## 9. Architecture Decisions

| Decision                      | Choice                                        | Rationale                      |
| ----------------------------- | --------------------------------------------- | ------------------------------ |
| State management library      | `provider` (existing)                         | Already invested, KISS         |
| Async data pattern            | Provider-based                                | Unified with existing patterns |
| Tab state                     | URL + Provider hybrid                         | Deep-linkable, data cached     |
| Metadata source swap          | Build-time                                    | One-time major version change  |
| Responsiveness                | 100% responsive                               | Mobile targets planned         |
| Provider scope                | Global for shared, Scoped for screen-specific | Simple rule                    |
| Edit mode save                | Batch save with dirty tracking                | Better UX than auto-save       |
| Logs: separate routes vs tabs | Single route with tabs                        | Simpler sidebar                |
| Screen test strategy          | Test organisms/templates, not thin wrappers   | Avoids fragile tests           |
| Mock auth in tests            | `MockAuthProvider.authenticated()`            | Bypasses platform channels     |

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
