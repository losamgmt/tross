# Notification System Design

> **Status:** Implemented
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

Tross requires a notification system to alert users of important events:

- **Work order assignments** - Technicians notified when assigned new work
- **Status changes** - Customers notified when their work order status changes
- **System events** - Export ready, background job complete, etc.

### Two Notification Systems

| System                | Purpose                                   | Persistence         | Transport           |
| --------------------- | ----------------------------------------- | ------------------- | ------------------- |
| **Toasts**            | Immediate feedback (save success, errors) | None (transient)    | Frontend only       |
| **Notification Tray** | Async events, user alerts                 | Database (per-user) | Fetch on navigation |

This document covers the **Notification Tray** system. Toasts are already implemented via `FeedbackService` and `AppSnackbar`.

---

## Architecture Decisions

### Core Principle: Follow `saved_views` Pattern

Notifications are **identical in architecture** to `saved_views`:

- Per-user data — each user sees only their own (a direct ownership RLS rule)
- Standard CRUD via generic router
- **NO custom routes**
- **NO custom services**
- **NO WebSocket/polling**

### Decisions

| Decision             | Choice                                        | Rationale                           |
| -------------------- | --------------------------------------------- | ----------------------------------- |
| **UI Location**      | Bell icon in top nav bar                      | Standard UX pattern                 |
| **Delivery**         | Fetch on navigation                           | KISS - no WebSocket complexity      |
| **Backend Creation** | `GenericEntityService.create()`               | Use existing infrastructure         |
| **Custom Endpoints** | **NONE**                                      | Generic CRUD is sufficient          |
| **Unread Count**     | Computed from list response                   | No custom `/unread-count` endpoint  |
| **Mark All Read**    | Loop PATCH calls (or defer bulk)              | No custom `/mark-all-read` endpoint |
| **Delete Behavior**  | Hard delete via generic router                | Standard DELETE                     |
| **Action URL**       | Computed from `resource_type` + `resource_id` | No redundant field storage          |

### What We DON'T Build

| ❌ Rejected                      | Why                                    |
| -------------------------------- | -------------------------------------- |
| `/unread-count` endpoint         | Count from list response in frontend   |
| `/mark-all-read` endpoint        | Loop PATCH calls (bulk can be Phase 2) |
| `/cleanup` endpoint              | Scheduled job, not API                 |
| A dedicated notification service | Use `GenericEntityService.create()`    |
| Socket.IO / WebSocket            | Overkill for MVP                       |
| Polling                          | Fetch on navigation is sufficient      |

---

## Database Schema

### Notifications Table

✅ **IMPLEMENTED** in `backend/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    body TEXT,
    type VARCHAR(25) NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'reminder')),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ
);

-- The user_id foreign key is added separately (deferred to avoid forward
-- references). It cascades: deleting a user deletes their notifications.
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Indexes

Two indexes exist in `backend/schema.sql`:

- `idx_notifications_title` — index on `title`
- `idx_notifications_user_id` — per-user lookups (the RLS filter and list queries key off `user_id`)

### Triggers

Notifications have **no database triggers**:

- `read_at` is a plain nullable column. It is **not** auto-populated — there is
  no trigger, and the mark-read `PATCH` sets `is_read` only. Treat `read_at` as
  reserved for a future "when was this read" feature.
- `updated_at` follows the standard entity contract and is set by the generic
  write path on update, not by a per-table trigger.

### Metadata Definition

Defined in the notification metadata: generic-router CRUD, with a row-level rule that grants **each user access to their own notifications only** (direct ownership, applied uniformly across roles). Creation is **system-only** (the API create path returns 403); users can read, update (mark read), and delete their own. The authoritative rules live in the entity metadata.

---

## Backend Implementation

### Routes: 100% Generic (No Custom Code)

The generic router auto-implements all needed endpoints:

| Method   | Endpoint                 | Purpose                                  |
| -------- | ------------------------ | ---------------------------------------- |
| `GET`    | `/api/notifications`     | List user's notifications (RLS filtered) |
| `GET`    | `/api/notifications/:id` | Get single notification                  |
| `PATCH`  | `/api/notifications/:id` | Mark as read: `{ is_read: true }`        |
| `DELETE` | `/api/notifications/:id` | Dismiss notification                     |
| `POST`   | `/api/notifications`     | **Returns 403** (create disabled)        |

### Creating Notifications (Backend Only)

When backend code needs to create a notification (e.g., work order assignment):

```javascript
// In the work order route handler or service
const GenericEntityService = require("../services/generic-entity-service");

await GenericEntityService.create(
  "notification",
  {
    user_id: technicianUserId,
    title: "New Work Order Assigned",
    body: `You've been assigned WO-2026-001`,
    type: "assignment",
    resource_type: "work_order",
    resource_id: workOrderId,
  },
  { auditContext },
);
```

**No separate notification service needed** - use `GenericEntityService.create()`.

### The write primitive

Every notification — whatever triggers it — is created by exactly one operation:
creating a `notification` entity row with a `user_id` (the recipient), `title`,
`body`, `type`, and optional `resource_type` + `resource_id` for deep-link
navigation. There is no second way to write a notification.

### Trigger boundary: two ways to reach the write primitive

| Path               | When                                                                                | How                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **A — Imperative** | Backend code already holds the target `user_id` (e.g. reacting to a non-field event) | Call `GenericEntityService.create('notification', { user_id, ... })` directly, as above                        |
| **B — Declarative** | A monitored entity field/status transition should notify someone                    | Declare an `afterChange` hook in the entity metadata that runs a `notification` action (see recipient contract) |

Rule of thumb: a field/status transition on a tracked entity → **Path B**
(declarative metadata hook). Any other event, or when the `user_id` is already
in hand → **Path A**. Both converge on the single write primitive above.

> **Status:** No business hooks are wired today (see Phase 4). The Path B
> mechanism and the recipient contract below exist and are validated at startup,
> but no entity metadata currently declares a notification hook.

### Path B recipient contract

A declarative `notification` action names its recipients with a
`recipient: { match, value }` pair that resolves against the **`users`** table:

- `match` — the `users` column to match on (e.g. `customer_profile_id`,
  `technician_profile_id`, `role_id`). It must be a real `users` column;
  a malformed recipient fails fast at startup.
- `value` — what to match it against, one of:
  - `{ field: '<record field>' }` — read a value from the triggering record
    (e.g. `{ field: 'customer_id' }` uses the record's `customer_id`)
  - `{ role: '<role name>' }` — resolve a role name to its id
  - a literal value

Resolution runs:

```sql
SELECT id FROM users WHERE <match> = <resolved value> AND is_active = true
```

and returns **0..N** user ids; each resolved user receives one notification via
the write primitive. Recipients therefore resolve to *users* (the login identity
that owns `notifications.user_id`), not to profiles or business rows. For
example `{ match: 'customer_profile_id', value: { field: 'customer_id' } }` turns
a record's customer **profile** id into the **user(s)** whose profile points at
it.

---

## Frontend Implementation

### Architecture Decision: Pure Props Pattern

Instead of a dedicated `NotificationProvider`, we follow the same pattern as `AppSidebar`:

- **Parent manages state** (`_NotificationTraySection` in `AdaptiveShell`)
- **Child receives plain props** (`NotificationTray` widget)
- **Data fetching** via `GenericEntityService.getAll('notification')`

This keeps widgets pure and testable, with no additional providers.

### Files Created

| File                                                            | Purpose                                     |
| --------------------------------------------------------------- | ------------------------------------------- |
| `lib/widgets/organisms/navigation/notification_tray.dart`       | Bell icon + dropdown (pure StatelessWidget) |
| `test/widgets/organisms/navigation/notification_tray_test.dart` | 19 widget tests                             |

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
- [x] Widget tests
- [x] Auth guard (hide tray when not authenticated)

### Phase 4: Backend Triggers (Future)

Not built yet. When wired, these will use the mechanism described under
[Creating Notifications](#creating-notifications-backend-only) — the single
write primitive, the Path A / Path B trigger boundary, and the Path B recipient
contract.

- [ ] Work order assignment → notify the assigned technician
- [ ] Status change → notify the customer
- [ ] Other business events as needed

---

## Anti-Patterns to Avoid

| ❌ Don't Do This                  | ✅ Do This Instead                  |
| --------------------------------- | ----------------------------------- |
| Create `notification-service.js`  | Use `GenericEntityService.create()` |
| Create custom routes              | Use generic router                  |
| Add `/unread-count` endpoint      | Count from list in frontend         |
| Add Socket.IO                     | Fetch on navigation                 |
| Add polling                       | Fetch on navigation                 |
| Create notification from frontend | Backend creates, frontend reads     |

---

## Related Documents

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - SSOT and metadata patterns
- [ADMIN_FRONTEND_ARCHITECTURE.md](ADMIN_FRONTEND_ARCHITECTURE.md) - Provider patterns
- `saved-view-metadata.js` - Reference pattern for per-user data
