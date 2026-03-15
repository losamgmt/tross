# Role-Based Dashboard Design

> **Version:** 2.0  
> **Date:** March 2026  
> **Status:** Design Document

## Overview

This document specifies the role-based dashboard layouts for the Tross application. The design follows our atomic composition principles and config-driven architecture.

---

## Role Hierarchy & Views

| Role | Dashboard View | Primary Panel | Key Actions |
|------|---------------|---------------|-------------|
| **Customer** | Work Order Log | History list | View details, track status |
| **Technician** | My Schedule | Assigned work orders | View/update assigned work |
| **Dispatcher** | Operations Center | Schedule + Queues | Assign, triage, monitor |
| **Manager** | Operations Center | Inherits Dispatcher | + Reporting access |
| **Admin** | Operations Center | Inherits Dispatcher | + System config |

---

## Layout Architecture

### Customer Dashboard
```
┌─────────────────────────────────────────┐
│ Work Order History                      │
│ ┌─────────────────────────────────────┐ │
│ │ [Timeframe ▼] [Status ▼] [Refresh]  │ │
│ ├─────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ WO-001 | Plumbing | Completed   │ │ │
│ │ ├─────────────────────────────────┤ │ │
│ │ │ WO-002 | HVAC     | In Progress │ │ │
│ │ ├─────────────────────────────────┤ │ │
│ │ │ WO-003 | Electric | Scheduled   │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Components:**
- `LogTimeframe` filter (7d, 30d, 90d, All)
- Status filter (optional)
- Simple list view of their work orders
- RLS ensures customer only sees own work

### Technician Dashboard
```
┌─────────────────────────────────────────┐
│ My Schedule                             │
│ ┌─────────────────────────────────────┐ │
│ │ [◀ Prev] [This Week ▼] [Next ▶]    │ │
│ ├─────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ 9AM  WO-001 | 123 Main St      │ │ │
│ │ ├─────────────────────────────────┤ │ │
│ │ │ 11AM WO-002 | 456 Oak Ave      │ │ │
│ │ ├─────────────────────────────────┤ │ │
│ │ │ 2PM  WO-003 | 789 Pine Rd      │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Inventory Quick-Access Panel]          │
└─────────────────────────────────────────┘
```

**Components:**
- Date range navigation (day/week view)
- Time-sorted work order list
- RLS ensures technician only sees assigned work
- Optional: Inventory sidebar for parts lookup

### Dispatcher+ Dashboard (Operations Center)
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚠ Attention Required (3 items)                        [▼]  │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 🔴 WO-045 Overdue | Scheduled end was 2h ago          │ │ │
│ │ │ 🟡 WO-012 Stale   | Pending for 3 days                │ │ │
│ │ │ 🟡 WO-018 Stale   | Pending for 2 days                │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────┐ ┌──────────────────────┐ │
│ │ Schedule                           │ │ Unscheduled Queue    │ │
│ │ ┌────────────────────────────────┐ │ │ ┌──────────────────┐ │ │
│ │ │ [Date ▼][Range ▼][Tech ▼][⟳]  │ │ │ │ WO-007 | Pending │ │ │
│ │ ├────────────────────────────────┤ │ │ ├──────────────────┤ │ │
│ │ │ WO-001 | John | 9AM | ✓       │ │ │ │ WO-008 | Pending │ │ │
│ │ │ WO-002 | Jane | 10AM | ✓      │ │ │ ├──────────────────┤ │ │
│ │ │ WO-003 | ⚠ Unassigned | 2PM   │ │ │ │ WO-009 | Pending │ │ │
│ │ │ WO-004 | John | 3PM | ✓       │ │ │ └──────────────────┘ │ │
│ │ └────────────────────────────────┘ │ │                      │ │
│ └────────────────────────────────────┘ └──────────────────────┘ │
│                                                                 │
│ [Entity Charts: Work Orders, Invoices, Contracts...]           │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- **Attention Banner** (collapsible): Computed conditions, not status
- **Schedule Panel** (main): All scheduled work with technician filter
- **Unscheduled Queue** (sidebar): work_orders WHERE scheduled_start IS NULL
- Existing entity charts below

---

## Attention Conditions (Computed)

These are NOT statuses - they are computed warning conditions:

| Condition | Definition | Visual |
|-----------|------------|--------|
| **Overdue** | `scheduled_end < NOW() AND status NOT IN ('completed', 'cancelled')` | 🔴 Red |
| **Stale Pending** | `status = 'pending' AND created_at < NOW - 48 business hours` | 🟡 Yellow |
| **Unassigned** | `scheduled_start IS NOT NULL AND assigned_technician_id IS NULL` | ⚠ Warning badge on row |

**Banner Behavior:**
- Green header when empty (all clear)
- Yellow/amber header when items present
- Collapsible via `CollapseController`
- Count badge in header

---

## Work Order Status Enum

| Status | Color | Meaning |
|--------|-------|---------|
| `pending` | warning/yellow | Awaiting triage |
| `scheduled` | info/blue | Scheduled date set |
| `in_progress` | primary/bronze | Work actively happening |
| `completed` | success/green | Finished |
| `cancelled` | error/red | Cancelled |

> **Note:** Rename `assigned` → `scheduled` in backend migration for semantic clarity.

---

## Component Composition

### Collapsibility via Atoms

The new `CollapseController` and `CollapseToggleIcon` atoms enable collapsibility for ANY widget:

```dart
// Attention Banner using CollapseController
CollapseController(
  builder: (context, isExpanded, toggle, animation) => TitledCard(
    title: 'Attention Required',
    color: attentionItems.isEmpty 
        ? theme.colorScheme.primaryContainer  // Green-ish
        : theme.colorScheme.warningContainer,  // Amber
    trailing: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (attentionItems.isNotEmpty)
          AppBadge(count: attentionItems.length),
        CollapseToggleIcon(animation: animation, onTap: toggle),
      ],
    ),
    child: isExpanded && attentionItems.isNotEmpty
        ? AttentionList(items: attentionItems)
        : null,
  ),
)
```

### Widget Composition Hierarchy

```
DashboardContent
├── [Customer/Technician]
│   └── WorkOrderLogSection or ScheduleSection
│       └── TitledCard + FilterableDataTable
│
├── [Dispatcher+]
│   ├── AttentionBanner
│   │   └── CollapseController → TitledCard → AttentionList
│   │
│   ├── Row (responsive → Column on mobile)
│   │   ├── SchedulePanel (flex: 2)
│   │   │   └── TitledCard → ScheduleTable
│   │   │
│   │   └── UnscheduledQueuePanel (flex: 1)
│   │       └── TitledCard → UnscheduledList
│   │
│   └── EntityCharts (existing)
```

---

## Provider Additions

### ScheduleProvider Extensions

```dart
// New getters for dispatcher+ views
List<Map<String, dynamic>> get unscheduledWorkOrders;
List<Map<String, dynamic>> get attentionWorkOrders;

// Computed attention conditions
bool isOverdue(Map<String, dynamic> wo);
bool isStalePending(Map<String, dynamic> wo);
bool isUnassigned(Map<String, dynamic> wo);
```

### New Data Queries

```dart
/// Unscheduled: No scheduled_start set
Future<void> _loadUnscheduledWorkOrders() async {
  final result = await _entityService.getAll(
    'work_order',
    filters: {
      'scheduled_start[null]': true,
      'status[in]': ['pending', 'scheduled'],
    },
    sortBy: 'created_at',
    sortOrder: 'ASC',
  );
  _unscheduledWorkOrders = result.data;
}

/// Attention: Overdue OR Stale
Future<void> _loadAttentionWorkOrders() async {
  // Backend might need a custom endpoint or we filter client-side
  // from already-loaded scheduled work orders
}
```

---

## Config Updates

### dashboard-config.json Additions

```json
{
  "schedule": {
    "position": "top",
    "defaultDateRangeUnit": "week",
    "minRole": "customer",
    "attentionBanner": {
      "minRole": "dispatcher",
      "stalePendingHours": 48,
      "initiallyExpanded": true
    },
    "unscheduledQueue": {
      "minRole": "dispatcher",
      "position": "sidebar"
    },
    "filters": [...]
  },
  "customerLog": {
    "minRole": "customer",
    "maxRole": "customer",
    "timeframes": ["7d", "30d", "90d", "all"],
    "defaultTimeframe": "30d"
  }
}
```

---

## Mobile Responsiveness

| Desktop | Mobile |
|---------|--------|
| Schedule + Sidebar (Row) | Schedule above Sidebar (Column) |
| Attention banner expanded | Collapsed by default |
| Charts in grid | Charts stacked |

Use `LayoutBuilder` or MediaQuery to switch:

```dart
LayoutBuilder(
  builder: (context, constraints) {
    final isWide = constraints.maxWidth > 800;
    return isWide
        ? Row(children: [schedulePanel, unscheduledSidebar])
        : Column(children: [schedulePanel, unscheduledSidebar]);
  },
)
```

---

## Implementation Phases

### Phase 1: Foundation (Completed)
- [x] `CollapseController` atom
- [x] `CollapseToggleIcon` atom
- [x] Unit tests for collapse atoms

### Phase 2: Status Cleanup
- [ ] Backend: Rename `assigned` → `scheduled` (migration)
- [ ] Frontend: Update status references

### Phase 3: Provider Extensions
- [ ] Add `unscheduledWorkOrders` getter
- [ ] Add `attentionWorkOrders` getter
- [ ] Add attention computation methods

### Phase 4: Dashboard Layout
- [ ] Create `AttentionBanner` organism
- [ ] Create `UnscheduledQueuePanel` molecule
- [ ] Update `DashboardContent` with role-branched layouts
- [ ] Mobile responsive adaptations

### Phase 5: Testing
- [ ] Widget tests for new components  
- [ ] Integration tests for role-based views
- [ ] E2E tests for dispatcher workflow

---

## Test Strategy

### Widget Tests
```dart
// Attention banner tests
testWidgets('shows green when no attention items', ...);
testWidgets('shows amber with count when items present', ...);
testWidgets('collapses when toggle clicked', ...);
testWidgets('hidden for customer/technician roles', ...);

// Role view tests  
testWidgets('customer sees log view', ...);
testWidgets('technician sees schedule only', ...);
testWidgets('dispatcher sees operations center', ...);
```

### Factory Integration
Existing `WidgetTestFactory` patterns apply - test behavior, not implementation.

---

## File Structure

```
lib/widgets/
├── atoms/
│   └── interactions/
│       ├── collapse_controller.dart     ✅ Created
│       └── collapse_toggle_icon.dart    ✅ Created
│
└── organisms/
    └── dashboard/
        ├── attention_banner.dart        (Phase 4)
        ├── unscheduled_queue.dart       (Phase 4)
        └── operations_layout.dart       (Phase 4)
```

---

## Summary

This design:
1. **Respects atomic composition** - CollapseController is a pure state atom
2. **Follows config-driven patterns** - Role visibility via config
3. **Uses existing infrastructure** - RLS, providers, metadata
4. **Is testable** - Behavior-focused tests via factory patterns
5. **Is progressive** - Phased implementation with clear milestones
