# Notification System Design

> **Status:** In Progress (Phase 1 Complete)
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

### Files to Create

| File | Purpose |
|------|---------|
| `lib/models/notification.dart` | Data model |
| `lib/providers/notification_provider.dart` | State + API calls |
| `lib/widgets/organisms/navigation/notification_bell.dart` | Bell icon + badge |
| `lib/widgets/organisms/navigation/notification_dropdown.dart` | Dropdown list |

### Notification Model

```dart
class AppNotification {
  final int id;
  final int userId;
  final String title;
  final String? body;
  final String type;
  final String? resourceType;
  final int? resourceId;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;

  /// Computed navigation path
  String? get actionPath {
    if (resourceType == null || resourceId == null) return null;
    // Convert snake_case to route: 'work_order' -> '/work-orders/123'
    final route = resourceType!.replaceAll('_', '-');
    return '/${route}s/$resourceId';
  }

  /// Icon based on type
  IconData get icon => switch (type) {
    'success' => Icons.check_circle,
    'warning' => Icons.warning,
    'error' => Icons.error,
    'assignment' => Icons.assignment_ind,
    'reminder' => Icons.schedule,
    _ => Icons.info,
  };

  /// Color based on type
  Color get color => switch (type) {
    'success' => Colors.green,
    'warning' => Colors.orange,
    'error' => Colors.red,
    'assignment' => Colors.blue,
    'reminder' => Colors.purple,
    _ => Colors.grey,
  };
}
```

### Notification Provider

```dart
class NotificationProvider extends ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _loading = false;

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  String get unreadBadge => unreadCount > 99 ? '99+' : '$unreadCount';

  /// Fetch notifications (call on navigation, not polling)
  Future<void> fetch() async {
    _loading = true;
    notifyListeners();

    final response = await apiClient.get('/notifications?sort=created_at&order=desc');
    _notifications = (response['data'] as List)
        .map((json) => AppNotification.fromJson(json))
        .toList();

    _loading = false;
    notifyListeners();
  }

  /// Mark single notification as read
  Future<void> markAsRead(int id) async {
    await apiClient.patch('/notifications/$id', {'is_read': true});
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index >= 0) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      notifyListeners();
    }
  }

  /// Delete notification
  Future<void> delete(int id) async {
    await apiClient.delete('/notifications/$id');
    _notifications.removeWhere((n) => n.id == id);
    notifyListeners();
  }
}
```

### Integration Points

**AdaptiveShell** - Add bell icon to app bar:
```dart
NotificationBell(
  unreadCount: context.watch<NotificationProvider>().unreadCount,
  onTap: () => _showNotificationDropdown(context),
)
```

**Fetch on navigation** - Call `notificationProvider.fetch()` when:
- User logs in
- User navigates to home/dashboard
- User opens notification dropdown

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

### Phase 3: Frontend Implementation
- [ ] Create `AppNotification` model
- [ ] Create `NotificationProvider`
- [ ] Create `NotificationBell` organism
- [ ] Create `NotificationDropdown` organism
- [ ] Integrate into `AdaptiveShell`
- [ ] Write widget tests

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
