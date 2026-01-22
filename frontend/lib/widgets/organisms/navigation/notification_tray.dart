/// NotificationTray - AppBar notification bell with dropdown
///
/// **SOLE RESPONSIBILITY:** Display notification bell icon with unread badge,
/// and show dropdown list of notifications when clicked.
///
/// COMPOSITION:
/// - Flutter's Badge widget for count badge
/// - PopupMenuButton for dropdown
///
/// ARCHITECTURE:
/// - Pure UI component - receives plain data as props (no ValueNotifiers)
/// - Parent handles all state management and data fetching
/// - Follows same pattern as AppSidebar (receives items as props)
///
/// Usage:
/// ```dart
/// // Parent manages state and rebuilds when data changes:
/// NotificationTray(
///   notifications: myNotificationsList,
///   onOpen: () => refreshNotifications(),
///   onNotificationTap: (notification) => handleTap(notification),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';

/// Callback when a notification is tapped
typedef OnNotificationTap = void Function(Map<String, dynamic> notification);

/// Notification tray widget for the app bar
class NotificationTray extends StatelessWidget {
  /// List of notifications to display (plain data, not a notifier)
  final List<Map<String, dynamic>> notifications;

  /// Callback when dropdown opens - parent can use to refresh data
  final VoidCallback? onOpen;

  /// Callback when a notification is tapped
  final OnNotificationTap? onNotificationTap;

  /// Callback when "View All" is tapped
  final VoidCallback? onViewAll;

  const NotificationTray({
    super.key,
    required this.notifications,
    this.onOpen,
    this.onNotificationTap,
    this.onViewAll,
  });

  /// Derived unread count from the notifications list
  int get unreadCount =>
      notifications.where((n) => n['is_read'] != true).length;

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return PopupMenuButton<String>(
      onOpened: onOpen,
      offset: Offset(0, spacing.xxl),
      constraints: const BoxConstraints(
        minWidth: 300,
        maxWidth: 350,
        maxHeight: 400,
      ),
      itemBuilder: (context) => _buildMenuItems(context),
      child: _buildBellIcon(context, unreadCount),
    );
  }

  Widget _buildBellIcon(BuildContext context, int count) {
    return Tooltip(
      message: 'Notifications',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Badge(
          isLabelVisible: count > 0,
          label: Text(
            count > 99 ? '99+' : '$count',
            style: const TextStyle(fontSize: 10),
          ),
          backgroundColor: Colors.red,
          child: const Padding(
            padding: EdgeInsets.all(8),
            child: Icon(Icons.notifications_outlined, color: AppColors.white),
          ),
        ),
      ),
    );
  }

  List<PopupMenuEntry<String>> _buildMenuItems(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    if (notifications.isEmpty) {
      return [
        PopupMenuItem<String>(
          enabled: false,
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(spacing.lg),
              child: Column(
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 48,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  SizedBox(height: spacing.md),
                  Text(
                    'No notifications',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ];
    }

    final items = <PopupMenuEntry<String>>[];

    // Header
    items.add(
      PopupMenuItem<String>(
        enabled: false,
        height: 40,
        child: Text(
          'Notifications',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );

    items.add(const PopupMenuDivider());

    // Notification items
    for (final notification in notifications) {
      items.add(
        PopupMenuItem<String>(
          value: notification['id']?.toString(),
          onTap: () => onNotificationTap?.call(notification),
          child: _NotificationItem(notification: notification),
        ),
      );
    }

    // View All footer
    if (onViewAll != null) {
      items.add(const PopupMenuDivider());
      items.add(
        PopupMenuItem<String>(
          value: 'view_all',
          onTap: onViewAll,
          child: Center(
            child: Text(
              'View All Notifications',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      );
    }

    return items;
  }
}

/// Individual notification item in the dropdown
class _NotificationItem extends StatelessWidget {
  final Map<String, dynamic> notification;

  const _NotificationItem({required this.notification});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;
    final isRead = notification['is_read'] == true;
    final type = notification['type'] as String? ?? 'info';

    return Container(
      padding: EdgeInsets.symmetric(vertical: spacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Type icon
          _buildTypeIcon(type, theme),
          SizedBox(width: spacing.sm),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification['title'] as String? ?? 'Notification',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (notification['body'] != null) ...[
                  SizedBox(height: spacing.xxs),
                  Text(
                    notification['body'] as String,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                SizedBox(height: spacing.xxs),
                Text(
                  _formatTimestamp(notification['created_at']),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),

          // Unread indicator
          if (!isRead) ...[
            SizedBox(width: spacing.sm),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypeIcon(String type, ThemeData theme) {
    final (IconData icon, Color color) = switch (type) {
      'success' => (Icons.check_circle, Colors.green),
      'warning' => (Icons.warning, Colors.orange),
      'error' => (Icons.error, Colors.red),
      'assignment' => (Icons.assignment_ind, theme.colorScheme.primary),
      'reminder' => (Icons.schedule, Colors.blue),
      _ => (Icons.info, Colors.blue), // info and default
    };

    return Icon(icon, size: 20, color: color);
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return '';

    DateTime? date;
    if (timestamp is String) {
      date = DateTime.tryParse(timestamp);
    } else if (timestamp is DateTime) {
      date = timestamp;
    }

    if (date == null) return '';

    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';

    return '${date.month}/${date.day}/${date.year}';
  }
}
