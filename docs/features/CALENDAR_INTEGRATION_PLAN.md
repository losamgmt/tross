# Calendar Integration Plan

**Date:** March 12, 2026  
**Updated:** March 12, 2026 (Phases 1-4 Complete)  
**Status:** Infrastructure Complete ✅ (Package Deferred)  
**Package:** TBD (Syncfusion likely, architecture supports swapping)

---

## Executive Summary

This document outlines the systematic plan to build **calendar integration infrastructure** ("the slot") before committing to any calendar package. The infrastructure provides a **fallback list/table view** that proves the complete dataflow, controls, and state management - everything needed when a calendar package is eventually added.

### Philosophy

> **Build the slot, not the socket.** The infrastructure must work standalone with a table view. When we add a calendar package later, we swap the UI component only - provider, service calls, filters, and data flow remain unchanged.

### Key Architectural Decisions

| Decision | Rationale | Validated |
|----------|-----------|-----------|
| **Dashboard-embedded, no separate route** | Schedule is dispatcher workflow context, not standalone screen | ✅ |
| **Composition over inheritance** | `LoadingStateManager` + `AuthConnectionManager` extracted from DashboardProvider patterns | ✅ Audited |
| **Async methods return Future** | All async ops return `Future<void>`; caller decides to await or `unawaited()` | ✅ Strict Standard |
| **Type-safe enums** | `DateRangeUnit`, `UserRole` instead of strings - exhaustive matching, no dead code | ✅ KISS |
| **Unified `ActionItem` with position** | All toolbar items are `ActionItem` with `position` property - placement is purely a placement concern | ✅ Flexible |
| **Use `GenericEntityService`** | No new service - existing `getAll()` with filters handles date range queries | ✅ Audited |
| **Config SSOT in `dashboard-config.json`** | Schedule config lives alongside dashboard entity config | ✅ Audited |
| **RLS handles data filtering** | Backend filters by user; frontend only controls UI visibility per role | ✅ |
| **Existing prop pass-through unchanged** | `toolbarActions` already flows through FilterableDataTable → AppDataTable → TableToolbar | ✅ Audited |
| **Package-agnostic widget contract** | Calendar widget accepts raw maps + callbacks; internal adapters handle package types | ✅ Swappable |
| **Generic managers** | `LoadingStateManager` + `AuthConnectionManager` usable by any feature, not just calendar | ✅ Extensible |

---

## 1. Infrastructure Architecture (Build First)

This section describes the **slot** we build before adding any calendar package.

### 1.1 Composition Pattern

Instead of inheritance, we compose reusable non-ChangeNotifier managers:

```dart
// lib/providers/managers/loading_state_manager.dart
typedef NotifyCallback = void Function();

/// Reusable loading/error/lastUpdated state management
class LoadingStateManager {
  final NotifyCallback _notify;

  bool _isLoading = false;
  String? _error;
  DateTime? _lastUpdated;

  LoadingStateManager(this._notify);

  bool get isLoading => _isLoading;
  String? get error => _error;
  DateTime? get lastUpdated => _lastUpdated;
  bool get isLoaded => _lastUpdated != null;

  void startLoading() {
    _isLoading = true;
    _error = null;
    _notify();
  }

  void completeSuccess() {
    _isLoading = false;
    _lastUpdated = DateTime.now();
    _notify();
  }

  void completeError(String message) {
    _isLoading = false;
    _error = message;
    _notify();
  }

  void reset() {
    _isLoading = false;
    _error = null;
    _lastUpdated = null;
    _notify();
  }

  /// Run async operation with automatic state management
  Future<T?> runAsync<T>(Future<T> Function() operation, {
    String errorMessage = 'Operation failed',
  }) async {
    if (_isLoading) return null;
    startLoading();
    try {
      final result = await operation();
      completeSuccess();
      return result;
    } catch (e) {
      completeError(errorMessage);
      return null;
    }
  }
}
```

```dart
// lib/providers/managers/auth_connection_manager.dart
import 'dart:async';

typedef LifecycleCallback = FutureOr<void> Function();

/// Reusable auth lifecycle management (login → load, logout → clear)
/// 
/// Callbacks are awaited to ensure:
/// - Deterministic ordering (e.g., technicians load before schedule)
/// - Proper error propagation to call site
/// - Clean test assertions without race conditions
class AuthConnectionManager {
  final LifecycleCallback onLogin;
  final LifecycleCallback onLogout;

  AuthProvider? _authProvider;
  bool _wasAuthenticated = false;

  AuthConnectionManager({
    required this.onLogin,
    required this.onLogout,
  });

  String get userRole => _authProvider?.userRole ?? 'customer';
  bool get isAuthenticated => _authProvider?.isAuthenticated ?? false;

  /// Connect to auth provider and trigger onLogin if already authenticated.
  /// Returns Future that completes when initial login callback finishes.
  Future<void> connect(AuthProvider authProvider) async {
    _authProvider = authProvider;
    _wasAuthenticated = authProvider.isAuthenticated;
    authProvider.addListener(_onAuthChanged);
    if (authProvider.isAuthenticated) {
      await onLogin();
    }
  }

  void _onAuthChanged() {
    // Flutter listener contract is sync; schedule async work separately
    unawaited(_handleAuthChange());
  }

  Future<void> _handleAuthChange() async {
    final isNowAuthenticated = _authProvider?.isAuthenticated ?? false;
    if (!_wasAuthenticated && isNowAuthenticated) {
      await onLogin();
    } else if (_wasAuthenticated && !isNowAuthenticated) {
      await onLogout();
    }
    _wasAuthenticated = isNowAuthenticated;
  }

  void dispose() {
    _authProvider?.removeListener(_onAuthChanged);
  }
}
```

### 1.2 DateRangeUnit Enum

```dart
// lib/models/date_range_unit.dart

/// Type-safe date range unit for schedule view.
/// WHY "DateRangeUnit": Clearly describes what day/week/month ARE - units for a date range.
/// Exhaustive switch - no invalid states, no dead code paths.
/// Lives with schedule-related models (domain-scoped, not centralized).
enum DateRangeUnit {
  day(Duration(days: 1)),
  week(Duration(days: 7)),
  month(null); // Month requires special calculation

  final Duration? duration;
  const DateRangeUnit(this.duration);

  /// Calculate end date from start. Month increments to next month.
  DateTime endDate(DateTime start) => switch (this) {
    DateRangeUnit.day => start.add(duration!),
    DateRangeUnit.week => start.add(duration!),
    DateRangeUnit.month => DateTime(start.year, start.month + 1, 1),
  };

  /// Display label for UI
  String get label => name[0].toUpperCase() + name.substring(1);
}
```

**Enum organization rationale:** Enums live with their domain in Tross - `FieldType` in `field_definition.dart`, `UserRole` in `permission.dart`, `DashboardChartType` in `dashboard_config.dart`. This enum lives in `date_range_unit.dart` (or could add to `dashboard_config.dart` alongside `ScheduleConfig`).

### 1.3 ScheduleProvider (Composes Managers)

```dart
// lib/providers/schedule_provider.dart
import 'dart:async';  // Required for unawaited()
import 'package:flutter/foundation.dart';  // Required for debugPrint, ChangeNotifier
import '../models/date_range_unit.dart';
import '../models/permission.dart';  // Required for UserRole
import 'managers/loading_state_manager.dart';
import 'managers/auth_connection_manager.dart';

class ScheduleProvider extends ChangeNotifier {
  late final LoadingStateManager _loadingManager;
  late final AuthConnectionManager _authManager;
  final GenericEntityService _entityService;

  // Filter state
  DateTime _windowStart = DateTime.now();
  DateRangeUnit _dateRangeUnit = DateRangeUnit.week;
  int? _selectedTechnicianId;
  List<Map<String, dynamic>> _workOrders = [];
  List<Map<String, dynamic>> _technicians = [];

  ScheduleProvider(this._entityService) {
    _loadingManager = LoadingStateManager(notifyListeners);
    _authManager = AuthConnectionManager(
      onLogin: _onLogin,
      onLogout: _clearData,
    );
  }

  Future<void> _onLogin() async {
    // Graceful degradation: technician load failure shouldn't block schedule
    try {
      await _loadTechnicians();
    } catch (e) {
      debugPrint('Failed to load technicians: $e');
    }
    await loadSchedule();
  }

  bool get isLoading => _loadingManager.isLoading;
  String? get error => _loadingManager.error;
  DateTime? get lastUpdated => _loadingManager.lastUpdated;
  String get userRole => _authManager.userRole;

  // Filter getters
  DateTime get windowStart => _windowStart;
  DateRangeUnit get dateRangeUnit => _dateRangeUnit;
  int? get selectedTechnicianId => _selectedTechnicianId;

  Future<void> setWindowStart(DateTime date) async {
    _windowStart = date;
    await loadSchedule();
  }

  Future<void> setDateRangeUnit(DateRangeUnit unit) async {
    _dateRangeUnit = unit;
    await loadSchedule();
  }

  Future<void> setSelectedTechnician(int? technicianId) async {
    _selectedTechnicianId = technicianId;
    await loadSchedule();
  }

  // Data getters
  List<Map<String, dynamic>> get workOrders => List.unmodifiable(_workOrders);
  List<Map<String, dynamic>> get technicians => List.unmodifiable(_technicians);

  Future<void> connectToAuth(AuthProvider auth) => _authManager.connect(auth);

  Future<void> loadSchedule() async {
    await _loadingManager.runAsync(() async {
      final filters = _buildFilters();
      final result = await _entityService.getAll('work_order', filters: filters);
      _workOrders = result.data;
    }, errorMessage: 'Failed to load schedule');
  }

  Future<void> _loadTechnicians() async {
    // Loaded once on login, cached for filter dropdown
    final result = await _entityService.getAll('technician', filters: {'is_active': true});
    _technicians = result.data;
  }

  Map<String, dynamic> _buildFilters() {
    return {
      'scheduled_start[gte]': _windowStart.toIso8601String(),
      'scheduled_end[lte]': _dateRangeUnit.endDate(_windowStart).toIso8601String(),
      if (_selectedTechnicianId != null)
        'assigned_technician_id': _selectedTechnicianId,
    };
  }

  void _clearData() {
    _workOrders = [];
    _technicians = [];
    _loadingManager.reset();
  }

  @override
  void dispose() {
    _authManager.dispose();
    super.dispose();
  }
}
```

### 1.4 Unified Toolbar Actions (Position-Based)

**Problem with current design:** `TableToolbar` has separate props for different slots:
- `actionItems: List<ActionItem>` — DATA, can overflow to menu
- `trailingWidgets: List<Widget>` — WIDGETS, always shown
- `leadingControls: List<Widget>` — WIDGETS, proposed for this feature

This forces type decisions at the wrong level. A date picker MUST be a Widget because it's "leading", but a refresh button can be ActionItem because it's "actions".

**Solution:** Unify everything as `ActionItem` with position as a property.

#### 1.4.1 Position Enum

```dart
// Add to lib/widgets/molecules/menus/action_item.dart

/// Where in the toolbar this action appears
/// WHY "leading/trailing" not "left/right": RTL internationalization
enum ActionPosition {
  /// Before search (date picker, view controls)
  leading,
  /// After search, before trailing (refresh, create, delete) - CAN overflow
  actions,
  /// After actions (settings, customize) - NEVER overflow
  trailing,
}
```

#### 1.4.2 Extended ActionItem

```dart
class ActionItem {
  // ...existing fields (id, label, icon, onTap, onTapAsync, isLoading, etc.)...
  
  /// Where in toolbar this action appears
  final ActionPosition position;  // NEW - default: ActionPosition.actions
  
  /// Whether this action can move to overflow menu on small screens
  /// Leading/trailing positions are typically false (always visible)
  final bool canOverflow;  // NEW - default: true for actions, false for leading/trailing
  
  /// For complex controls (date picker, dropdown), provide widget directly
  /// If non-null, renders this instead of icon button
  final Widget Function(BuildContext)? widgetBuilder;  // NEW
}
```

#### 1.4.3 Toolbar Layout (Unified)

Now `TableToolbar` takes ONE list and sorts by position:

```dart
class TableToolbar extends StatelessWidget {
  /// All toolbar actions - sorted by position automatically
  final List<ActionItem> actions;  // SINGLE LIST
  
  @override
  Widget build(BuildContext context) {
    final leading = actions.where((a) => a.position == ActionPosition.leading);
    final middle = actions.where((a) => a.position == ActionPosition.actions);
    final trailing = actions.where((a) => a.position == ActionPosition.trailing);
    
    return Row(
      children: [
        // Leading: always rendered, never overflow
        ...leading.map((a) => _buildAction(a)),
        
        // Search (expands)
        if (onSearch != null) Expanded(child: DebouncedSearchFilter(...)),
        
        // Actions: can overflow on mobile
        ActionMenu(actions: middle.toList(), mode: _responsiveMode),
        
        // Trailing: always rendered, never overflow
        ...trailing.map((a) => _buildAction(a)),
      ],
    );
  }
  
  Widget _buildAction(ActionItem action) {
    // If widgetBuilder provided, use it (for complex controls)
    if (action.widgetBuilder != null) {
      return action.widgetBuilder!(context);
    }
    // Otherwise render as icon button
    return IconButton(icon: Icon(action.icon), onPressed: action.onTap);
  }
}
```

**Result:** `[Leading...] [Search] ← expands → [Actions (can overflow)] [Trailing...]`

#### 1.4.4 Usage Example (Schedule Section)

```dart
final scheduleToolbarActions = [
  // Leading: View controls - never overflow
  ActionItem(
    id: 'date_picker',
    label: 'Start Date',
    position: ActionPosition.leading,
    canOverflow: false,
    widgetBuilder: (context) => DateInput(
      value: schedule.windowStart,
      onChanged: (date) => unawaited(schedule.setWindowStart(date)),
    ),
  ),
  ActionItem(
    id: 'date_range',
    label: 'Range',
    position: ActionPosition.leading,
    canOverflow: false,
    widgetBuilder: (context) => SelectInput<DateRangeUnit>(
      value: schedule.dateRangeUnit,
      items: DateRangeUnit.values,
      onChanged: (v) => v != null ? unawaited(schedule.setDateRangeUnit(v)) : null,
      displayText: (v) => v.label,
    ),
  ),
  
  // Actions: Standard actions - CAN overflow on mobile
  ActionItem.refresh(onTap: () => unawaited(schedule.loadSchedule())),
  
  // Trailing: Settings - never overflow
  ActionItem(
    id: 'settings',
    label: 'Settings',
    icon: Icons.settings,
    position: ActionPosition.trailing,
    canOverflow: false,
    onTap: () => _showSettings(context),
  ),
];

// Pass single list to toolbar
FilterableDataTable(
  toolbarActions: scheduleToolbarActions,  // ONE list, fully flexible
  // ...
)
```

#### 1.4.5 Benefits of Unified Model

| Concern | Before (Separate Props) | After (Unified ActionItem) |
|---------|-------------------------|----------------------------|
| **Type flexibility** | ❌ Widget OR ActionItem based on slot | ✅ Always ActionItem |
| **Position changes** | ❌ Move between props, change types | ✅ Change `position` property |
| **Overflow control** | ❌ Implicit (Widget = no, ActionItem = yes) | ✅ Explicit `canOverflow` |
| **Complex controls** | ❌ Must use Widget slot | ✅ Use `widgetBuilder` |
| **Single source** | ❌ 3 separate lists | ✅ 1 list, sorted by position |
| **RTL support** | ✅ Leading/trailing | ✅ Leading/trailing |

**Placement is now PURELY a placement concern.** Any action can be moved to any position by changing one property.

### 1.5 Config SSOT

Add schedule configuration to `dashboard-config.json`:

```json
{
  "version": "1.1.0",
  "entities": [ /* existing chart config */ ],
  "schedule": {
    "defaultDateRangeUnit": "week",
    "minRole": "dispatcher",
    "showTechnicianFilter": true,
    "displayColumns": [
      "work_order_number",
      "name",
      "customer_id",
      "status",
      "priority",
      "assigned_technician_id",
      "scheduled_start",
      "scheduled_end"
    ]
  }
}
```

**Column rationale:** These 8 columns are exactly what the calendar needs - identity (WO#, name), assignment (customer, technician), state (status, priority), and timing (start, end). The fallback table proves the dataflow for all of them.

### 1.6 Filter API (Validated)

The existing `GenericEntityService.getAll()` passes filters directly to query params:

```dart
// In ScheduleProvider._buildFilters()
return {
  'scheduled_start[gte]': _windowStart.toIso8601String(),
  'scheduled_end[lte]': _dateRangeUnit.endDate(_windowStart).toIso8601String(),
  if (_selectedTechnicianId != null)
    'assigned_technician_id': _selectedTechnicianId,
};
```

**Backend operators confirmed** (from `query-builder-service.js`):
- `[gte]` - greater than or equal
- `[lte]` - less than or equal
- Direct equality for `assigned_technician_id`

**No API changes required.**

### 1.7 Existing Prop Pass-Through (Unchanged)

The `toolbarActions` prop ALREADY flows through the widget chain:

```
ScheduleSection (creates ActionItem list)
    └─► FilterableDataTable.toolbarActions  (existing prop)
            └─► AppDataTable.toolbarActions  (existing prop)
                    └─► TableToolbar.actions  (enhanced to sort by position)
```

**No new props needed.** We enhance `ActionItem` and `TableToolbar` — existing wiring just works.

### 1.8 Implementation Details

This section provides the missing implementation specifics to make the plan copy-paste ready.

#### 1.8.1 ScheduleConfig Model (Simplified)

Add to existing `dashboard_config.dart` following the same pattern:

```dart
// Add to lib/models/dashboard_config.dart

/// Schedule section configuration for dashboard
@immutable
class ScheduleConfig {
  /// Default date range unit - type-safe enum, no invalid states
  final DateRangeUnit defaultDateRangeUnit;
  
  /// Minimum role required to see schedule - parsed once, not repeatedly
  final UserRole minRole;
  
  /// Whether to show technician filter dropdown
  final bool showTechnicianFilter;
  
  /// Columns to display in table view (unmodifiable)
  final List<String> displayColumns;

  const ScheduleConfig({
    this.defaultDateRangeUnit = DateRangeUnit.week,
    this.minRole = UserRole.dispatcher,
    this.showTechnicianFilter = true,
    this.displayColumns = const ['work_order_number', 'name', 'status'],
  });

  factory ScheduleConfig.fromJson(Map<String, dynamic> json) {
    // Parse once - no runtime re-parsing
    final unitStr = json['defaultDateRangeUnit'] as String? ?? 'week';
    final roleStr = json['minRole'] as String? ?? 'dispatcher';
    
    return ScheduleConfig(
      defaultDateRangeUnit: DateRangeUnit.values.firstWhere(
        (e) => e.name == unitStr,
        orElse: () => DateRangeUnit.week,
      ),
      minRole: UserRole.fromString(roleStr) ?? UserRole.dispatcher,
      showTechnicianFilter: json['showTechnicianFilter'] as bool? ?? true,
      displayColumns: List.unmodifiable(
        (json['displayColumns'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ?? const ['work_order_number', 'name', 'status'],
      ),
    );
  }
}
```

**Simplifications:**
- `DateRangeUnit` enum - no stringly-typed values, exhaustive switch
- `UserRole minRole` - parsed once in `fromJson()`, not on every visibility check
- Removed `dateRangeUnitOptions` - UI uses `DateRangeUnit.values` directly

Then extend `DashboardConfig`:

```dart
// Modify DashboardConfig class
class DashboardConfig {
  final String version;
  final List<DashboardEntityConfig> entities;
  final ScheduleConfig? schedule;  // NEW

  const DashboardConfig({
    required this.version,
    required this.entities,
    this.schedule,  // NEW
  });

  factory DashboardConfig.fromJson(Map<String, dynamic> json) {
    // ... existing entity parsing ...
    
    // NEW: Parse schedule config if present
    final scheduleJson = json['schedule'] as Map<String, dynamic>?;
    final schedule = scheduleJson != null 
        ? ScheduleConfig.fromJson(scheduleJson) 
        : null;

    return DashboardConfig(
      version: json['version'] as String? ?? '1.0.0',
      entities: entities,
      schedule: schedule,  // NEW
    );
  }
}
```

#### 1.8.2 Provider DI Wiring

```dart
// Add to main.dart MultiProvider - follows existing ProxyProvider pattern
ChangeNotifierProxyProvider<GenericEntityService, ScheduleProvider>(
  create: (context) => ScheduleProvider(context.read<GenericEntityService>()),
  update: (_, __, previous) => previous!,
),

// Wire to auth in initState - explicit unawaited() per strict async pattern
unawaited(scheduleProvider.connectToAuth(context.read<AuthProvider>()));
```

#### 1.8.3 Schedule Section UI (Unified Actions)

```dart
// In DashboardContent - uses unified ActionItem model
Widget _buildScheduleSection(BuildContext context) {
  final schedule = context.watch<ScheduleProvider>();
  
  // 100% GENERIC - DateInput, SelectInput<T>, ActionItem all exist
  // Position is purely a placement concern – change position property to move
  final toolbarActions = [
    // Leading position: view controls (never overflow)
    ActionItem(
      id: 'date_picker',
      label: 'Start Date',
      position: ActionPosition.leading,
      widgetBuilder: (ctx) => DateInput(
        value: schedule.windowStart,
        onChanged: (date) => unawaited(schedule.setWindowStart(date)),
      ),
    ),
    ActionItem(
      id: 'date_range',
      label: 'Range',
      position: ActionPosition.leading,
      widgetBuilder: (ctx) => SelectInput<DateRangeUnit>(
        value: schedule.dateRangeUnit,
        items: DateRangeUnit.values,
        onChanged: (v) => v != null ? unawaited(schedule.setDateRangeUnit(v)) : null,
        displayText: (v) => v.label,
      ),
    ),
    // Actions position: standard (can overflow on mobile)
    ActionItem.refresh(onTap: () => unawaited(schedule.loadSchedule())),
  ];
  
  return FilterableDataTable(
    toolbarActions: toolbarActions,  // Single list, existing prop
    columns: config.displayColumns,
    // ...
  );
}
```

#### 1.8.4 Strict Async Pattern

**Principle:** All async methods return `Future<void>`. The CALLER decides whether to await or fire-and-forget. Never hide async inside void methods.

```dart
typedef LifecycleCallback = FutureOr<void> Function();
```

**Why this is strict (and correct):**

| Concern | Hidden Fire-and-Forget | Strict: Caller Decides |
|---------|------------------------|------------------------|
| **API honesty** | Method lies (looks sync) | Method is truthful |
| **Caller flexibility** | None - always fire-and-forget | Await OR fire-and-forget |
| **Testing** | Needs `Future.microtask()` hacks | Clean `await` in tests |
| **Error visibility** | Lost inside method | Caller can `.catchError()` |
| **Code review** | Hidden side effects | Explicit `unawaited()` visible |
| **Lint compliance** | Hidden lint suppression | Lint-clean at call site |

**The Strict Pattern:**

```dart
// STRICT: Methods return Future<void> - honest API
Future<void> setWindowStart(DateTime date) async {
  _windowStart = date;
  await loadSchedule();
}

// CALL SITE (Widget): UI callback is sync, must fire-and-forget
onChanged: (date) => unawaited(schedule.setWindowStart(date)),

// CALL SITE (Test): Can await for deterministic assertions
await provider.setWindowStart(DateTime(2026, 3, 15));
expect(provider.workOrders, isNotEmpty);
```

**When `unawaited()` is legitimate:**

Only at CALL SITES where ALL of these are true:
1. **Sync context** - Flutter callback contract (initState, onChanged, etc.)
2. **State visible** - Loading/error state managed separately (LoadingStateManager)
3. **Explicit** - `unawaited()` is visible in code review
4. **Documented** - Comment explains why fire-and-forget is intentional

```dart
// initState is void by contract - unawaited() is explicit and visible
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    unawaited(provider.connectToAuth(auth)); // Explicit, visible, justified
  });
}
```

**Never do this:**

```dart
// WRONG: Hides async, lies about return type
void setWindowStart(DateTime date) {
  _windowStart = date;
  unawaited(loadSchedule()); // Hidden fire-and-forget - BAD
}
```

#### 1.8.5 Additional Implementation Tasks

**Test Helpers:** Extend `MockAuthProvider` with `listenerCount` getter and `setAuthenticated(bool, {String role})` for testing `AuthConnectionManager`.

**String Extension:** Add `capitalize()` extension if not already present - trivial utility.

---

## 2. Future: Calendar Package Integration

**NOTE:** This section describes the *eventual* package integration. Build Section 1 first and prove it works with a table view.

### 2.1 Syncfusion Features Matrix

| Feature | Syncfusion Support | Tross Backend Support |
|---------|-------------------|----------------------|
| **Day/Week/Month Views** | ✅ Built-in | ✅ Date range queries |
| **Multi-Resource Timeline** | ✅ Native `resourceView` | ✅ Technicians entity |
| **Drag-Drop Rescheduling** | ✅ `allowDragAndDrop` | ✅ Batch update API |
| **Appointment Editing** | ✅ Tap handlers | ✅ CRUD operations |
| **Date Range Loading** | ✅ `loadMoreWidgetBuilder` | ✅ Filter operators |

### 2.2 Data Model Mapping (When Needed)

```dart
// Syncfusion Appointment ←→ Tross Work Order
Appointment(
  id: workOrder['id'],
  startTime: DateTime.parse(workOrder['scheduled_start']),
  endTime: DateTime.parse(workOrder['scheduled_end']),
  subject: workOrder['name'] ?? workOrder['work_order_number'],
  color: _getPriorityColor(workOrder['priority']),
  resourceIds: [workOrder['assigned_technician_id']],
  notes: workOrder['summary'],
)

// Syncfusion CalendarResource ←→ Tross Technician
CalendarResource(
  id: technician['id'],
  displayName: '${technician['first_name']} ${technician['last_name']}',
  color: _getAvailabilityColor(technician['availability']),
)
```

### 2.3 API Endpoints (Already Supported)

```
# Fetch work orders for visible date range
GET /work-orders?scheduled_start[gte]=2026-03-01&scheduled_end[lte]=2026-03-31

# Fetch active technicians for filter dropdown
GET /technicians?is_active=true

# Update single work order (drag-drop reschedule)
PATCH /work-orders/123
{ "scheduled_start": "...", "scheduled_end": "..." }

# Batch update (multi-select drag)
POST /work-orders/batch
{ "operations": [{ "operation": "update", "id": 123, "data": {...} }] }
```

### 2.4 Swapping Packages

When/if we swap Syncfusion for another package:

1. **Create adapter widget** wrapping the new package
2. **Swap the widget** in `DashboardContent` schedule section
3. **No changes to:**
   - `ScheduleProvider`
   - Filter state / API calls
   - `dashboard-config.json`
   - Auth integration

---

## 3. Dashboard Integration

The schedule section embeds directly in `DashboardContent`, gated by config:

```dart
// In DashboardContent.build()
Column(
  children: [
    // Existing: Entity charts from config
    ...dashboard.getVisibleEntities().map((e) => _buildEntityChart(...)),
    
    // NEW: Schedule section (config-driven visibility)
    if (_shouldShowSchedule(context))
      _buildScheduleSection(context),
  ],
)

bool _shouldShowSchedule(BuildContext context) {
  final config = DashboardConfigService.config.schedule;
  if (config == null) return false;
  final userRole = context.read<AuthProvider>().userRole;
  // config.minRole is UserRole - parsed once at config load, not here
  return UserRole.fromString(userRole).priority >= config.minRole.priority;
}
```

**No new routes, no nav-config changes, no ScheduleScreen.**

---

## 4. File Structure

### 4.1 Infrastructure Phase (Build Now)

```
frontend/lib/
├── models/
│   └── date_range_unit.dart             # NEW - DateRangeUnit enum
├── providers/
│   ├── managers/
│   │   ├── loading_state_manager.dart   # NEW - Extracted from DashboardProvider
│   │   └── auth_connection_manager.dart # NEW - Extracted from DashboardProvider
│   ├── schedule_provider.dart           # NEW - Composes managers
│   └── dashboard_provider.dart          # REFACTOR - Use composed managers
├── widgets/
│   └── organisms/
│       ├── tables/
│       │   └── table_toolbar.dart           # MODIFY - Sort actions by position
│       └── dashboard_content.dart           # MODIFY - Add schedule section
├── molecules/
│   └── menus/
│       └── action_item.dart             # MODIFY - Add position, canOverflow, widgetBuilder
└── assets/
    └── config/
        └── dashboard-config.json            # MODIFY - Add schedule key

frontend/test/
├── providers/
│   ├── managers/
│   │   ├── loading_state_manager_test.dart
│   │   └── auth_connection_manager_test.dart
│   └── schedule_provider_test.dart
```

### 4.2 Future Package Phase (Build Later)

```
frontend/lib/
├── widgets/
│   └── organisms/
│       └── calendar/
│           ├── calendar_widget.dart        # Wraps Syncfusion/other
│           └── calendar_adapters.dart      # Package-specific mapping
```

**Calendar Widget Contract (Package-Agnostic):**

Any calendar widget we create must accept these provider-supplied inputs:
- `List<Map<String, dynamic>> workOrders` - Raw work order data
- `List<Map<String, dynamic>> technicians` - For resource view
- `DateTime windowStart` + `DateRangeUnit dateRangeUnit` - Current view range
- `Function(int workOrderId, DateTime newStart, DateTime newEnd)` - Drag-drop callback

The widget handles all package-specific concerns internally:
- Mapping `Map<String, dynamic>` → Package's appointment type
- Mapping technicians → Package's resource type
- Package-specific event handlers → Provider method calls

This contract ensures swapping Syncfusion → TableCalendar → flutter_calendar requires only:
1. New widget implementing the same props
2. Internal adapters for the new package's types
3. **Zero changes to ScheduleProvider, config, or dashboard integration**

---

## 5. Implementation Phases

### Phase 1: Composition Infrastructure ✅ COMPLETE
- [x] Create `lib/models/date_range_unit.dart` (DateRangeUnit enum)
- [x] Create `lib/providers/managers/loading_state_manager.dart`
- [x] Create `lib/providers/managers/auth_connection_manager.dart`  
- [x] Unit tests for both managers
- [x] **Existing test infrastructure validated:** `MockAuthProvider`, `MockGenericEntityService`, `_TestableAuthProvider` all exist

### Phase 2: Schedule Provider & Config ✅ COMPLETE
- [x] Add `ScheduleConfig` model to `dashboard_config.dart` (stores `UserRole`, `DateRangeUnit`)
- [x] Extend `DashboardConfig.fromJson()` to parse `schedule` key
- [x] Create `ScheduleProvider` composing both managers
- [x] Unit tests using existing `MockGenericEntityService` and `_TestableAuthProvider` patterns
- [x] Add schedule config to `dashboard-config.json`

### Phase 3: ActionItem Enhancement ✅ COMPLETE
- [x] Add `ActionPosition` enum to `action_item.dart` (leading, actions, trailing)
- [x] Add `position`, `canOverflow`, `widgetBuilder` properties to `ActionItem`
- [x] Update `TableToolbar` to sort actions by position and render accordingly
- [x] Unit tests for position-based sorting and widgetBuilder rendering
- [x] **NOTE:** Uses existing `DateInput`, `SelectInput<T>` – zero new widgets
- [x] **NOTE:** No new props to pass through – existing `toolbarActions` wiring unchanged

### Phase 4: Dashboard Integration ✅ COMPLETE
- [x] Add `MockAuthProvider` extensions (`listenerCount`, `setAuthenticated`)
- [x] Add `MockGenericEntityService.lastFilters` capture
- [x] Add `_buildScheduleSection` to `DashboardContent`
- [x] Add `_shouldShowSchedule` config-driven visibility check
- [x] Wire up `ScheduleProvider` in `main.dart` (ChangeNotifierProxyProvider)
- [x] Connect to auth in `_AppWithRouter`

### Phase 5: Calendar Package (Future)
- [ ] Choose and add calendar package to pubspec.yaml
- [ ] Create `CalendarWidget` wrapping the package
- [ ] Create adapter to map work_order maps to package types
- [ ] Replace placeholder UI with actual calendar

---

## 6. Testing Strategy

Following established patterns from `test/TEST_PHILOSOPHY.md` and existing provider tests.

### 6.1 Test Philosophy Alignment

**DO Test (Behavioral):**
- State transitions (loading → loaded → error)
- Auth lifecycle (login triggers load, logout clears data)
- Filter changes trigger reload
- Listener notification counts
- Error handling and graceful degradation

**DON'T Test (Anti-patterns):**
- Widget counts or internal structure
- Exact pixel values
- Implementation details (private methods)

### 6.2 LoadingStateManager Tests

```dart
group('LoadingStateManager', () {
  test('initial state is not loading with no error', () {
    final manager = LoadingStateManager(() {});
    expect(manager.isLoading, false);
    expect(manager.error, isNull);
    expect(manager.lastUpdated, isNull);
  });

  test('startLoading sets loading state and clears error', () {
    int notifyCount = 0;
    final manager = LoadingStateManager(() => notifyCount++);
    
    manager.startLoading();
    
    expect(manager.isLoading, true);
    expect(manager.error, isNull);
    expect(notifyCount, 1);
  });

  test('completeSuccess sets lastUpdated and clears loading', () {
    final manager = LoadingStateManager(() {});
    manager.startLoading();
    
    manager.completeSuccess();
    
    expect(manager.isLoading, false);
    expect(manager.lastUpdated, isNotNull);
  });

  test('completeError sets error message', () {
    final manager = LoadingStateManager(() {});
    
    manager.completeError('Test error');
    
    expect(manager.error, 'Test error');
    expect(manager.isLoading, false);
  });

  test('runAsync handles success', () async {
    final manager = LoadingStateManager(() {});
    
    final result = await manager.runAsync(() async => 42);
    
    expect(result, 42);
    expect(manager.isLoading, false);
    expect(manager.lastUpdated, isNotNull);
  });

  test('runAsync handles error', () async {
    final manager = LoadingStateManager(() {});
    
    final result = await manager.runAsync(
      () async => throw Exception('fail'),
      errorMessage: 'Custom error',
    );
    
    expect(result, isNull);
    expect(manager.error, 'Custom error');
  });

  test('runAsync ignores concurrent calls', () async {
    final manager = LoadingStateManager(() {});
    manager.startLoading();
    
    final result = await manager.runAsync(() async => 42);
    
    expect(result, isNull); // Ignored due to already loading
  });
});
```

### 6.3 AuthConnectionManager Tests

```dart
group('AuthConnectionManager', () {
  test('connect subscribes to auth provider', () async {
    final auth = MockAuthProvider();
    final manager = AuthConnectionManager(
      onLogin: () async {},
      onLogout: () async {},
    );
    
    expect(auth.listenerCount, 0);
    await manager.connect(auth);
    
    expect(auth.listenerCount, 1);
  });

  test('connect awaits onLogin when initially authenticated', () async {
    final callOrder = <String>[];
    final auth = MockAuthProvider()..setAuthenticated(true);
    final manager = AuthConnectionManager(
      onLogin: () async {
        await Future.delayed(Duration(milliseconds: 10));
        callOrder.add('login_complete');
      },
      onLogout: () async {},
    );
    
    await manager.connect(auth);
    callOrder.add('connect_returned');
    
    // onLogin completes BEFORE connect returns
    expect(callOrder, ['login_complete', 'connect_returned']);
  });

  test('onLogin awaited on auth state change to authenticated', () async {
    final completer = Completer<void>();
    bool loginComplete = false;
    final auth = MockAuthProvider();
    final manager = AuthConnectionManager(
      onLogin: () async {
        await completer.future;
        loginComplete = true;
      },
      onLogout: () async {},
    );
    await manager.connect(auth);
    
    auth.setAuthenticated(true);
    
    // Login started but not complete
    expect(loginComplete, false);
    
    completer.complete();
    await Future.microtask(() {}); // Let async complete
    
    expect(loginComplete, true);
  });

  test('onLogout awaited on auth state change to unauthenticated', () async {
    bool logoutComplete = false;
    final auth = MockAuthProvider()..setAuthenticated(true);
    final manager = AuthConnectionManager(
      onLogin: () async {},
      onLogout: () async {
        await Future.delayed(Duration.zero);
        logoutComplete = true;
      },
    );
    await manager.connect(auth);
    
    auth.setAuthenticated(false);
    await Future.microtask(() {}); // Let async complete
    
    expect(logoutComplete, true);
  });

  test('dispose removes listener', () async {
    final auth = MockAuthProvider();
    final manager = AuthConnectionManager(
      onLogin: () async {},
      onLogout: () async {},
    );
    await manager.connect(auth);
    expect(auth.listenerCount, 1);
    
    manager.dispose();
    
    expect(auth.listenerCount, 0);
  });
});
```

### 6.4 ScheduleProvider Tests

Follow `dashboard_provider_test.dart` pattern:

```dart
group('ScheduleProvider', () {
  group('initialization', () {
    test('starts with default window values');
    test('isLoading is false initially');
    test('workOrders is empty initially');
  });

  group('filter changes', () {
    test('setWindowStart triggers load without extra notification');
    test('setDateRangeUnit triggers load without extra notification');
    test('setSelectedTechnician triggers load without extra notification');
  });

  group('auth integration', () {
    test('connectToAuth subscribes to auth changes');
    test('technicians loaded once on login');
    test('loadSchedule called on login after technicians');
    test('data cleared on logout');
    test('dispose removes auth listener');
  });

  group('data loading', () {
    test('loadSchedule populates workOrders');
    test('technicians populated after login');
    test('concurrent loads are ignored');
    test('error state set on failure');
  });
});
```

### 6.5 Mock Service Pattern

Use existing `MockGenericEntityService` from `test/mocks/mock_services.dart`:

```dart
final mockService = MockGenericEntityService();
mockService.mockEntities('work_order', [
  {'id': 1, 'name': 'Test WO', 'scheduled_start': '2026-03-15T09:00:00'},
]);

final provider = ScheduleProvider(mockService);
await provider.loadSchedule();

expect(mockService.wasCalled('getAll:work_order'), true);
expect(provider.workOrders.length, 1);
```

### 6.6 Testing Setters (Strict Async Pattern Benefit)

Because setters return `Future<void>`, tests can await them directly:

```dart
test('setWindowStart reloads with new date filter', () async {
  final mockService = MockGenericEntityService();
  mockService.mockEntities('work_order', []);
  final provider = ScheduleProvider(mockService);
  
  // AWAIT the setter - no hacks needed!
  await provider.setWindowStart(DateTime(2026, 4, 1));
  
  // Assert filter was applied
  expect(mockService.lastFilters['scheduled_start[gte]'], 
      contains('2026-04-01'));
});
```

This is impossible with void methods that hide `unawaited()` - you'd need timer-based hacks or signal completers.

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Package lock-in | Build infrastructure first; package is swappable |
| Manager complexity | Keep managers focused (SRP); comprehensive unit tests |
| DashboardProvider refactor breaks things | Refactor after managers proven; run existing tests |
| Performance with many work orders | Paginate by visible date range (backend already supports) |
| Syncfusion license issues | Community license free for <$1M revenue; architecture supports swapping |

---

## 8. Dependencies (Deferred)

Package installation deferred until infrastructure is complete.

### 8.1 Package Addition (Future)
```yaml
# pubspec.yaml - ADD WHEN READY
dependencies:
  syncfusion_flutter_calendar: ^24.1.41
```

### 8.2 License Configuration (Future)
```dart
// lib/main.dart (or config)
import 'package:syncfusion_flutter_core/syncfusion_flutter_core.dart';

void main() {
  // Community license - free for small teams
  SyncfusionLicense.registerLicense('YOUR-KEY-HERE');
  runApp(const TrossApp());
}
```

---

## Appendix A: Architectural Principles Applied

This integration follows Tross architectural principles:

- **Composition over Inheritance:** Managers are plain classes, not ChangeNotifiers
- **SRP:** `LoadingStateManager` manages loading state only; `AuthConnectionManager` manages auth lifecycle only
- **DRY:** Managers reusable across `DashboardProvider`, `ScheduleProvider`, future providers
- **Self-Documenting:** `runAsync()` encapsulates entire load lifecycle
- **Eminently Testable:** Managers can be unit tested in isolation
- **Async Correctness:** `FutureOr<void>` callbacks awaited by default; explicit `unawaited()` for intentional fire-and-forget
- **Provider Pattern:** `ScheduleProvider` follows `DashboardProvider` conventions
- **Generic Services:** Uses existing `GenericEntityService` - no new service needed
- **RLS Enforcement:** Backend filters by user role automatically

### Generic Extensibility Beyond Calendar

The composition pattern is **not calendar-specific**. Any feature with loading state + auth lifecycle can reuse these managers:

| Feature | LoadingStateManager | AuthConnectionManager |
|---------|--------------------|-----------------------|
| Dashboard Charts | ✅ Loading/error/lastUpdated | ✅ Load on login, clear on logout |
| Schedule (Calendar) | ✅ Loading/error/lastUpdated | ✅ Load on login, clear on logout |
| Notifications | ✅ Loading/error/lastUpdated | ✅ Connect on login, disconnect on logout |
| User Preferences | ✅ Loading/error/lastUpdated | ✅ Load on login, clear on logout |
| Reports | ✅ Loading/error/lastUpdated | ✅ Load on login, clear on logout |

**Pattern applies to any provider that:**
- Has async data loading operations
- Needs to react to authentication state changes
- Wants consistent loading/error/lastUpdated UI state

### Refresh Mechanism

`ScheduleProvider.loadSchedule()` is public for:
- Pull-to-refresh gestures
- Manual refresh button
- Periodic background refresh (via Timer if needed)
- After CRUD operations modify work orders

Example refresh button:
```dart
IconButton(
  icon: Icon(Icons.refresh),
  onPressed: schedule.isLoading ? null : () => unawaited(schedule.loadSchedule()),
)
```

---

## Appendix B: Backend Verification (Completed)

✅ `work_orders.scheduled_start` TIMESTAMP  
✅ `work_orders.scheduled_end` TIMESTAMP  
✅ `work_orders.assigned_technician_id` FK  
✅ Filter operators support `gte`, `lte` for date ranges  
✅ Batch update endpoint at `POST /api/work-orders/batch`  
✅ Technicians table has `id`, `first_name`, `last_name`, `status`, `availability`

---

## Appendix C: Critical Design Review

**Reviewed:** March 12, 2026  
**Verdict:** Architecture approved for implementation

### Elegance Criteria Verified

| Criterion | Assessment |
|-----------|------------|
| **Composition over Inheritance** | ✅ Managers are plain classes, not ChangeNotifier subclasses |
| **Single Responsibility** | ✅ LoadingStateManager handles only loading state; AuthConnectionManager handles only auth lifecycle |
| **DRY** | ✅ Managers will be reusable when DashboardProvider is refactored |
| **Self-Documenting** | ✅ `runAsync()` encapsulates entire lifecycle, no magic |
| **Testability** | ✅ Managers instantiable with mock callback - no external dependencies |
| **Async Correctness** | ✅ **Strict pattern:** All async methods return `Future<void>`; caller decides await vs `unawaited()` |
| **No Premature Abstractions** | ✅ No interfaces, adapters, or services until package is added |
| **Minimal Surface Area** | ✅ 3 new files for infrastructure (2 managers, 1 provider) |
| **SSOT Config** | ✅ Schedule config alongside dashboard config |
| **KISS** | ✅ No stringly-typed state; enum exhaustive matching; ~1000 lines (down from 1400+) |
| **Package-Agnostic** | ✅ Calendar widget contract defined; provider knows nothing about Syncfusion |
| **Generic Extensibility** | ✅ Managers documented as reusable for any auth-gated loading feature |

### Issues Found and Resolved

1. **Type inconsistency:** `onLogin`/`onLogout` now both use `LifecycleCallback`
2. **Redundant section:** "Swapping Package Later" merged into Section 2.4
3. **Conflicting decisions:** Removed references to separate "ScheduleScreen" route
4. **Premature models:** Removed `AppointmentModel`, `ResourceModel`, `ScheduleService` from plan
5. **Double notification:** Removed redundant `notifyListeners()` in setters - `runAsync()` handles it
6. **Missing technician load:** Added `_loadTechnicians()` called once on login
7. **Integration unclear:** Added `_shouldShowSchedule()` showing config-driven visibility check
8. **ScheduleConfig undefined:** Added `ScheduleConfig` model in Section 1.8.1
9. **DI wiring missing:** Added `ChangeNotifierProxyProvider` pattern in Section 1.8.2
10. **Schedule UI undefined:** Added `_buildScheduleSection` implementation in Section 1.8.3
11. **~~Async callback fire-and-forget~~:** → **Fixed: LifecycleCallback uses `FutureOr<void>` with proper await**
12. **Test helper missing:** Added `MockAuthProvider` extensions in Section 1.8.5
13. **Phase 3 incomplete:** Explicit checklist for all 3 widgets in pass-through chain
14. **Lint compliance:** Added explicit `unawaited()` for intentional fire-and-forget in UI setters
15. **Dead code removed:** `_notify` callback removed from `AuthConnectionManager` (SRP: manager delegates to callbacks, doesn't notify directly)
16. **Strict async pattern:** All async methods return `Future<void>`, not `void`. Caller decides to await or `unawaited()`. Hidden fire-and-forget inside void methods is forbidden.
17. **Hidden async in listener callback:** `_onAuthChanged()` now uses explicit `unawaited(_handleAuthChange())`
18. **Strict immutability:** `ScheduleConfig` uses `@immutable` annotation and `List.unmodifiable()` for JSON-parsed lists
19. **Stringly-typed window length:** Replaced `String _windowLength` with `DateRangeUnit` enum - exhaustive switch, no dead code paths
20. **Double role parsing:** `ScheduleConfig.minRole` now stores `UserRole` directly - parsed once in `fromJson()`, not on every visibility check
21. **Redundant config:** Removed `dateRangeUnitOptions` from JSON config - UI derives from `DateRangeUnit.values`
22. **Verbose implementation details:** Collapsed Section 1.8 to essential patterns only - ~300 lines removed
23. **Redundant sections:** Removed Sections 3.1, 3.2, 7 (duplicated Key Decisions table and Phase checklists)
24. **API mismatch:** Fixed `itemLabel` → `displayText` to match actual `SelectInput` widget API
25. **Mock gap:** `lastFilters` capture added to Phase 4 checklist for filter assertions in tests
26. **Error handling:** Added try-catch to `_loadTechnicians()` - failure shouldn't block schedule loading
27. **Redundant config:** Removed `defaultWindowStart: "today"` - always `DateTime.now()`, no config needed
28. **Naming inconsistency:** Unified `_buildScheduleTable` → `_buildScheduleSection` throughout
29. **Missing imports:** Added explicit imports to ScheduleProvider (`dart:async`, `permission.dart`)
30. **Package contract:** Added Calendar Widget Contract specifying package-agnostic props interface (Section 4.2)
31. **Generic extensibility:** Added table showing managers apply to any feature, not just calendar (Appendix A)
32. **Redundant notes removed:** Cleaned up 5 "how" notes - self-documenting code needs no explanation
33. **Confusing enum name:** Renamed `WindowLength` → `DateRangeUnit` - clearer name describing what day/week/month ARE (units for a date range), not calendar-specific
34. **Enum organization clarified:** Added rationale - enums live with their domain model (`FieldType` in field_definition.dart, `UserRole` in permission.dart, etc.), not centralized
35. **Leading nomenclature explained:** Added WHY "leading" not "left" - RTL internationalization, semantic clarity, Flutter pattern consistency
36. **Generic widget reuse verified:** Confirmed Phases 3-4 use 100% existing generic widgets (`DateInput`, `SelectInput<T>`, `FilterableDataTable`, `TableToolbar`) - zero calendar-specific widgets created
37. **Inflexible toolbar slots:** Unified to single `ActionItem` model with `position` property - placement is purely a placement concern, any action can be moved anywhere by changing one property. Replaces separate `leadingControls`, `trailingWidgets`, `actionItems` props.

### Architecture Strengths

- **Zero API changes:** Backend already supports date range filtering
- **Zero route changes:** Embeds in existing DashboardContent
- **Fallback-first:** Table view proves dataflow before calendar package
- **Package-agnostic:** Provider knows nothing about Syncfusion (or any package)
- **Widget contract:** Calendar widget interface defined - swap packages by implementing same props contract
- **Notification efficiency:** Single `notifyListeners()` per load cycle via `runAsync()`
- **Strict async:** All async methods return `Future<void>`; explicit `unawaited()` at intentional fire-and-forget call sites only
- **Generic extensibility:** Composition managers usable for notifications, reports, preferences, or any auth-gated feature

### Implementation Risks Acknowledged

- DashboardProvider refactor after managers proven (Phase 1 validates pattern)
- ActionItem enhancement is additive (existing actions continue to work with default position)
- Config SSOT requires parsing schedule object (pattern provided in 1.8.1)
- Listener callbacks are sync by Flutter contract; `_handleAuthChange()` schedules async work correctly

---

*Document prepared for Tross Frontend Calendar Integration*
