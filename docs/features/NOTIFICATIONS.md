# Notification System Design

> **Status:** Phase 3 Complete (Frontend Implemented)
> **Last Updated:** 2026-01-21
> **Pattern:** Follows `saved_views` - metadata + generic router, NO custom code

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Implementation Checklist](#implementation-checklist)

---

## Overview

TrossApp requires a notification system to alert users of important events:

- **Work order assignments** - Technicians notified when assigned new work
- **Status changes** - Customers notified when their work order status changes
- **System events** - Export ready, background job complete, etc.

### Two Notification Systems

| System | Purpose | Persistence | Transport |
|--------|---------|-------------|-----------|
| **Toasts** | Immediate feedback (save success, errors) | None (transient) | Frontend only |
| **Notification Tray** | Async events, user alerts | Database (per-user) | Fetch on navigation |

This document covers the **Notification Tray** system. Toasts are already implemented via `NotificationService` and `AppSnackbar`.

---

## Architecture Decisions

### Core Principle: Follow `saved_views` Pattern

Notifications are **identical in architecture** to `saved_views`:
- Per-user data with RLS (`own_record_only`)
- Standard CRUD via generic router
- **NO custom routes**
- **NO custom services**
- **NO WebSocket/polling**

### Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **UI Location** | Bell icon in top nav bar | Standard UX pattern |
| **Delivery** | Fetch on navigation | KISS - no WebSocket complexity |
| **Backend Creation** | `GenericEntityService.create()` | Use existing infrastructure |
| **Custom Endpoints** | **NONE** | Generic CRUD is sufficient |
| **Unread Count** | Computed from list response | No custom `/unread-count` endpoint |
| **Mark All Read** | Loop PATCH calls (or defer bulk) | No custom `/mark-all-read` endpoint |
| **Delete Behavior** | Hard delete via generic router | Standard DELETE |
| **Action URL** | Computed from `resource_type` + `resource_id` | No redundant field storage |

### What We DON'T Build

| ❌ Rejected | Why |
|-------------|-----|
| `/unread-count` endpoint | Count from list response in frontend |
| `/mark-all-read` endpoint | Loop PATCH calls (bulk can be Phase 2) |
| `/cleanup` endpoint | Scheduled job, not API |
| `NotificationService` class | Use `GenericEntityService.create()` |
| Socket.IO / WebSocket | Overkill for MVP |
| Polling | Fetch on navigation is sufficient |

---

## Database Schema

### Notifications Table

✅ **IMPLEMENTED** in `backend/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'reminder')),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes & Triggers

✅ **IMPLEMENTED** - See `backend/schema.sql` for:
- `idx_notifications_user_unread` - Fast unread queries
- `idx_notifications_user_created` - Paged list queries
- `update_notifications_updated_at` trigger
- `trigger_notification_read_at` trigger (auto-sets `read_at`)

### Metadata Definition

✅ **IMPLEMENTED** in `backend/config/models/notification-metadata.js`:

```javascript
{
  tableName: 'notifications',
  rlsResource: 'notifications',
  routeConfig: { useGenericRouter: true },
  rlsPolicy: {
    customer: 'own_record_only',
    technician: 'own_record_only',
    dispatcher: 'own_record_only',
    manager: 'own_record_only',
    admin: 'own_record_only',  // Even admins only see their own
  },
  entityPermissions: {
    create: null,      // System only - API returns 403
    read: 'customer',
    update: 'customer',
    delete: 'customer',
  },
}
```

---

## Backend Implementation

### Routes: 100% Generic (No Custom Code)

The generic router auto-implements all needed endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/notifications` | List user's notifications (RLS filtered) |
| `GET` | `/api/notifications/:id` | Get single notification |
| `PATCH` | `/api/notifications/:id` | Mark as read: `{ is_read: true }` |
| `DELETE` | `/api/notifications/:id` | Dismiss notification |
| `POST` | `/api/notifications` | **Returns 403** (create disabled) |

### Creating Notifications (Backend Only)

When backend code needs to create a notification (e.g., work order assignment):

```javascript
// In the work order route handler or service
const GenericEntityService = require('../services/generic-entity-service');

await GenericEntityService.create('notification', {
  user_id: technicianUserId,
  title: 'New Work Order Assigned',
  body: `You've been assigned WO-2026-001`,
  type: 'assignment',
  resource_type: 'work_order',
  resource_id: workOrderId,
}, { auditContext });
```

**No separate NotificationService needed** - use `GenericEntityService.create()`.

---

## Frontend Implementation

### Architecture Decision: Pure Props Pattern

Instead of a dedicated `NotificationProvider`, we follow the same pattern as `AppSidebar`:
- **Parent manages state** (`_NotificationTraySection` in `AdaptiveShell`)
- **Child receives plain props** (`NotificationTray` widget)
- **Data fetching** via `GenericEntityService.getAll('notification')`

This keeps widgets pure and testable, with no additional providers.

### Files Created

| File | Purpose |
|------|---------|
| `lib/widgets/organisms/navigation/notification_tray.dart` | Bell icon + dropdown (pure StatelessWidget) |
| `test/widgets/organisms/navigation/notification_tray_test.dart` | 19 widget tests |

### NotificationTray Widget

```dart
/// Pure presentation widget - receives notifications as props
class NotificationTray extends StatelessWidget {
  final List<Map<String, dynamic>> notifications;
  final VoidCallback? onOpen;
  final void Function(Map<String, dynamic>)? onNotificationTap;
  final VoidCallback? onViewAll;

  /// Derived from notifications list - no separate prop needed
  int get unreadCount => notifications.where((n) => n['is_read'] != true).length;
}
```

### Integration in AdaptiveShell

```dart
/// Stateful section that manages data fetching
class _NotificationTraySection extends StatefulWidget { ... }

class _NotificationTraySectionState extends State<_NotificationTraySection> {
  List<Map<String, dynamic>> _notifications = [];

  Future<void> _loadNotifications() async {
    final entityService = context.read<GenericEntityService>();
    final result = await entityService.getAll(
      'notification',
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'DESC',
    );
    setState(() => _notifications = result.data);
  }

  @override
  Widget build(BuildContext context) {
    // Only show when authenticated
    if (!context.watch<AuthProvider>().isAuthenticated) {
      return const SizedBox.shrink();
    }
    return NotificationTray(notifications: _notifications, ...);
  }
}
```

### Key Behaviors

- **Bell icon** with red badge showing unread count
- **Dropdown** opens on tap with notification list
- **Tap notification** → marks as read + navigates to related entity
- **"View All"** → routes to `/notifications`
- **Empty state** → "No notifications"
- **Auth guard** → hidden on login page

---

## Implementation Checklist

### Phase 1: Database & Metadata ✅ COMPLETE
- [x] Database table with indexes and triggers
- [x] `notification-metadata.js` with generic router config
- [x] Permissions auto-derived (`create: null` = disabled)
- [x] Frontend metadata synced

### Phase 2: Verify Backend Routes ✅ COMPLETE
- [x] Confirm `GET /api/notifications` returns user's notifications (RLS filtered)
- [x] Confirm `PATCH /api/notifications/:id` marks as read (generic router)
- [x] Confirm `DELETE /api/notifications/:id` works (generic router)
- [x] Confirm `POST /api/notifications` returns 403 (disabled)
- [x] Integration tests auto-generated from factory (`all-entities.test.js`)

### Phase 3: Frontend Implementation ✅ COMPLETE
- [x] Create `NotificationTray` organism (bell icon + dropdown)
- [x] Use pure props pattern (no dedicated provider)
- [x] Use `GenericEntityService.getAll('notification')` for data fetching
- [x] Integrate into `AdaptiveShell` via `_NotificationTraySection`
- [x] Widget tests (19 tests)
- [x] Auth guard (hide tray when not authenticated)

### Phase 4: Backend Triggers (Future)
- [ ] Work order assignment → create notification
- [ ] Status change → create notification
- [ ] Other business events as needed

---

## Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Create `notification-service.js` | Use `GenericEntityService.create()` |
| Create custom routes | Use generic router |
| Add `/unread-count` endpoint | Count from list in frontend |
| Add Socket.IO | Fetch on navigation |
| Add polling | Fetch on navigation |
| Create notification from frontend | Backend creates, frontend reads |

---

## Related Documents

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - SSOT and metadata patterns
- [ADMIN_FRONTEND_ARCHITECTURE.md](ADMIN_FRONTEND_ARCHITECTURE.md) - Provider patterns
- `saved-view-metadata.js` - Reference pattern for per-user data
