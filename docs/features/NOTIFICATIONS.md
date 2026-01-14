# Notification System Design

> **Status:** Planned  
> **Created:** 2026-01-13  
> **Last Updated:** 2026-01-13

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
- **Scheduled reminders** - Upcoming appointments for technicians and customers
- **System events** - Export ready, background job complete, etc.

### Two Notification Systems

| System | Purpose | Persistence | Transport |
|--------|---------|-------------|-----------|
| **Toasts** | Immediate feedback (save success, errors) | None (transient) | Frontend only |
| **Notification Tray** | Async events, reminders | Database (per-user) | WebSocket (Socket.IO) |

This document covers the **Notification Tray** system. Toasts are already implemented via `NotificationService` and `AppSnackbar`.

---

## Architecture Decisions

### Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **UI Location** | Bell icon in top nav bar | Standard UX pattern, unread badge |
| **Delivery** | Socket.IO (WebSocket) | Real-time delivery, built-in reconnection |
| **Who Creates** | Backend only | Single source of truth, works with all API consumers |
| **Scheduled Reminders** | Railway cron + app endpoint | Testable, extensible, platform-agnostic |
| **Retention** | User preference (default: 30 days) | Leverages existing preferences system |
| **Unread Badge** | Cap at 99+ | Prevents UI overflow |
| **Mark All Read** | All notifications ever | Simple single API call |
| **Delete Behavior** | Hard delete | Matches audit_logs pattern (append-only events) |
| **Grouping** | None | KISS - no scope creep |
| **Action URL** | Computed from resource_type + resource_id | No redundant field storage |
| **Entity Registry** | NOT included | System table pattern (like audit_logs) |

### Why Not In Entity Registry?

Notifications follow the `audit_logs` pattern:
- Created by **backend** (not users via forms)
- Users only **read**, **mark read**, **delete**
- No generic CRUD forms needed
- Dedicated service, model, and UI components

---

## Database Schema

### Notifications Table

Add to `backend/schema.sql` (version 3.1):

```sql
-- ============================================================================
-- USER NOTIFICATIONS TABLE
-- ============================================================================
-- User-specific notification inbox
-- RLS: Each user can only see their own notifications (user_id filter)
-- Pattern: Similar to saved_views (per-user, simple fields)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    
    -- Owner of this notification (RLS filter field)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    title VARCHAR(255) NOT NULL,
    body TEXT,
    
    -- Navigation context (optional - where to go when clicked)
    -- Pattern matches audit_logs: resource_type + resource_id
    resource_type VARCHAR(50),    -- 'work_order', 'invoice', etc. (nullable)
    resource_id INTEGER,          -- ID of related entity (nullable)
    
    -- Read status
    is_read BOOLEAN DEFAULT false NOT NULL,
    read_at TIMESTAMP,
    
    -- Timestamps (TIER 1 compliance)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON notifications(user_id, created_at DESC);
```

### Drop Table Addition

Add to the DROP TABLE section at the top of schema.sql:

```sql
DROP TABLE IF EXISTS notifications CASCADE;
```

### Preference Schema Addition

Add to `backend/config/models/preferences-metadata.js` in `preferenceSchema`:

```javascript
notificationRetentionDays: {
  type: 'enum',
  values: ['30', '60', '90', '180', '365', '-1'],
  default: '30',
  label: 'Notification History',
  description: 'How long to keep read notifications',
  displayLabels: {
    '30': '30 days',
    '60': '60 days',
    '90': '90 days',
    '180': '6 months',
    '365': '1 year',
    '-1': 'Forever',
  },
  order: 6,
},
```

### Deployment Command

```bash
npm run db:rebuild
```

This drops and rebuilds dev database with new schema.

---

## Backend Implementation

### New Files Required

| File | Purpose |
|------|---------|
| `services/notification-service.js` | CRUD for notifications + WebSocket broadcast |
| `routes/notifications.js` | REST API endpoints |
| `routes/internal/reminders.js` | Cron endpoint for scheduled reminders |
| `config/socket.js` | Socket.IO server setup |

### REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/notifications` | List user's notifications (paginated) |
| `GET` | `/api/notifications/unread-count` | Get unread count for badge |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification as read |
| `POST` | `/api/notifications/mark-all-read` | Mark all as read |
| `DELETE` | `/api/notifications/:id` | Delete (dismiss) notification |

### Socket.IO Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `notification:new` | Server → Client | Push new notification |
| `notification:read` | Server → Client | Sync read status |
| `notification:deleted` | Server → Client | Sync deletion |

### WebSocket Authentication

```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = await verifyAuth0Token(token);
    socket.userId = decoded.sub;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### Cron Endpoint

`POST /api/internal/check-reminders` (Railway cron calls this every minute)

```javascript
// Checks for upcoming work orders and creates reminder notifications
// Scheduled: Every minute
// Triggers: 24h, 1h, 15min before scheduled_start
```

### Notification Creation Pattern

```javascript
// NotificationService.create() does two things:
// 1. INSERT into database
// 2. Push via Socket.IO to connected user

await notificationService.create({
  userId: technicianUserId,
  title: 'New Work Order Assigned',
  body: `You've been assigned ${workOrderNumber}`,
  resourceType: 'work_order',
  resourceId: workOrderId,
});
```

---

## Frontend Implementation

### New Files Required

| File | Purpose |
|------|---------|
| `lib/models/notification.dart` | Notification data model |
| `lib/services/notification_api_service.dart` | REST API calls |
| `lib/services/websocket_service.dart` | Socket.IO connection management |
| `lib/providers/notification_provider.dart` | State management |
| `lib/widgets/organisms/navigation/notification_bell.dart` | Bell icon with badge |
| `lib/widgets/organisms/navigation/notification_dropdown.dart` | Dropdown list |

### Notification Model

```dart
class Notification {
  final int id;
  final int userId;
  final String title;
  final String? body;
  final String? resourceType;
  final int? resourceId;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;

  /// Computed navigation path
  String? get actionPath {
    if (resourceType == null || resourceId == null) return null;
    return '/${_pluralize(resourceType!)}/$resourceId';
  }
}
```

### WebSocket Service

```dart
class WebSocketService {
  // Connects on login, disconnects on logout
  // Reconnects automatically on connection loss
  // Dispatches received notifications to NotificationProvider
  
  void connect(String token);
  void disconnect();
  Stream<Notification> get onNotification;
}
```

### Notification Provider

```dart
class NotificationProvider extends ChangeNotifier {
  List<Notification> _notifications = [];
  int _unreadCount = 0;
  
  int get unreadCount => _unreadCount;
  String get unreadBadge => _unreadCount > 99 ? '99+' : '$_unreadCount';
  
  Future<void> fetchNotifications();
  Future<void> markAsRead(int id);
  Future<void> markAllAsRead();
  Future<void> deleteNotification(int id);
}
```

### Bell Icon Integration

Add to `AdaptiveShell` or top navigation:

```dart
NotificationBell(
  unreadCount: notificationProvider.unreadCount,
  onTap: () => _showNotificationDropdown(context),
)
```

### Preferences Integration

Add notification retention setting to Settings screen (auto-rendered from preferenceSchema).

---

## Implementation Checklist

### Phase 1: Database
- [ ] Add `DROP TABLE IF EXISTS notifications CASCADE` to schema.sql
- [ ] Add `CREATE TABLE notifications` to schema.sql
- [ ] Add notification indexes to schema.sql
- [ ] Update schema version to 3.1
- [ ] Add `notificationRetentionDays` to preferences-metadata.js
- [ ] Run `npm run db:rebuild` to apply changes
- [ ] Verify with `npm run test:backend:unit`

### Phase 2: Backend Service & Routes
- [ ] Create `services/notification-service.js`
- [ ] Create `routes/notifications.js`
- [ ] Add routes to `server.js`
- [ ] Add `notifications` to `permissions.json`
- [ ] Write unit tests for NotificationService
- [ ] Write integration tests for notification routes

### Phase 3: Backend WebSocket
- [ ] Install `socket.io` package
- [ ] Create `config/socket.js` (Socket.IO setup)
- [ ] Integrate Socket.IO with Express server
- [ ] Add authentication middleware
- [ ] Add user connection tracking
- [ ] Update NotificationService to broadcast on create

### Phase 4: Backend Cron
- [ ] Create `routes/internal/reminders.js`
- [ ] Implement reminder check logic
- [ ] Add internal auth for cron endpoint
- [ ] Configure Railway cron job

### Phase 5: Frontend Model & Service
- [ ] Create `lib/models/notification.dart`
- [ ] Create `lib/services/notification_api_service.dart`
- [ ] Write tests for notification model
- [ ] Write tests for notification service

### Phase 6: Frontend WebSocket
- [ ] Add `socket_io_client` to pubspec.yaml
- [ ] Create `lib/services/websocket_service.dart`
- [ ] Connect on login, disconnect on logout
- [ ] Handle reconnection

### Phase 7: Frontend Provider
- [ ] Create `lib/providers/notification_provider.dart`
- [ ] Wire up to WebSocketService
- [ ] Add to provider tree in main.dart
- [ ] Write tests for notification provider

### Phase 8: Frontend UI
- [ ] Create `notification_bell.dart` organism
- [ ] Create `notification_dropdown.dart` organism
- [ ] Integrate into AdaptiveShell
- [ ] Style with design system
- [ ] Write widget tests

### Phase 9: Integration
- [ ] Hook work order assignment → notification
- [ ] Hook status change → notification
- [ ] Test end-to-end flow
- [ ] Add notification retention cleanup job

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [AUTH.md](./AUTH.md) - Authentication with Auth0
- [API.md](./API.md) - API design patterns
