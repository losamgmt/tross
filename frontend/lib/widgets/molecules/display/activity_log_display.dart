/// Activity Log Display - Shows audit/history timeline for an entity
///
/// A molecule that displays a timeline of changes made to an entity.
/// Completely GENERIC - works with any resource_type + resource_id.
///
/// ARCHITECTURE COMPLIANCE:
/// - Receives data from parent (no service calls)
/// - Exposes callbacks for actions (parent handles logic)
/// - Pure presentation + composition of atoms
///
/// USAGE:
/// ```dart
/// ActivityLogDisplay(
///   entries: auditEntries,         // Data from parent
///   loading: isLoading,            // Loading state from parent
///   error: errorMessage,           // Error from parent
///   title: 'Activity History',
///   onRefresh: () => controller.loadHistory(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../models/audit_log_entry.dart';
import '../../../config/app_spacing.dart';

// =============================================================================
// MAIN WIDGET - Pure presentation, data received from parent
// =============================================================================

/// Displays activity/audit log timeline
///
/// NOTE: This widget does NOT fetch data. Parent provides:
/// - [entries]: List of audit log entries (null while loading)
/// - [loading]: Whether data is loading
/// - [error]: Error message if load failed
/// - [onRefresh]: Callback for refresh action
class ActivityLogDisplay extends StatelessWidget {
  /// Audit log entries to display (null = loading, empty = no entries)
  final List<AuditLogEntry>? entries;

  /// Whether data is loading
  final bool loading;

  /// Error message (if load failed)
  final String? error;

  /// Title to display (default: "Activity History")
  final String? title;

  /// Called when user taps refresh
  final VoidCallback? onRefresh;

  const ActivityLogDisplay({
    super.key,
    this.entries,
    this.loading = false,
    this.error,
    this.title,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _ActivityLogHeader(
          title: title ?? 'Activity History',
          loading: loading,
          onRefresh: onRefresh,
        ),
        SizedBox(height: spacing.sm),
        if (loading)
          _LoadingState()
        else if (error != null)
          _ErrorState(error: error!, onRefresh: onRefresh)
        else if (entries == null || entries!.isEmpty)
          _EmptyState()
        else
          _TimelineList(entries: entries!),
      ],
    );
  }
}

// =============================================================================
// COMPOSED SUB-WIDGETS (private, pure presentation)
// =============================================================================

/// Header with title and refresh button
class _ActivityLogHeader extends StatelessWidget {
  final String title;
  final bool loading;
  final VoidCallback? onRefresh;

  const _ActivityLogHeader({
    required this.title,
    required this.loading,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.refresh, size: 20),
          onPressed: loading ? null : onRefresh,
          tooltip: 'Refresh',
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}

/// Loading state display
class _LoadingState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: CircularProgressIndicator(),
      ),
    );
  }
}

/// Error state with retry button
class _ErrorState extends StatelessWidget {
  final String error;
  final VoidCallback? onRefresh;

  const _ErrorState({required this.error, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Center(
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            spacing.gapSM,
            Text(
              'Failed to load history',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
            spacing.gapSM,
            if (onRefresh != null)
              TextButton(onPressed: onRefresh, child: const Text('Try Again')),
          ],
        ),
      ),
    );
  }
}

/// Empty state display
class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Center(
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.history, size: 48, color: theme.colorScheme.outline),
            spacing.gapSM,
            Text(
              'No activity recorded',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Timeline list of entries
class _TimelineList extends StatelessWidget {
  final List<AuditLogEntry> entries;

  const _TimelineList({required this.entries});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        final isLast = index == entries.length - 1;
        return ActivityLogItem(entry: entry, isLast: isLast);
      },
    );
  }
}

// =============================================================================
// ACTIVITY LOG ITEM - Reusable, exported for other uses
// =============================================================================

/// Single activity log item with timeline connector
class ActivityLogItem extends StatelessWidget {
  final AuditLogEntry entry;
  final bool isLast;

  const ActivityLogItem({super.key, required this.entry, this.isLast = true});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TimelineIndicator(color: _getActionColor(theme), isLast: isLast),
          Expanded(
            child: _EntryContent(
              entry: entry,
              actionColor: _getActionColor(theme),
              actionIcon: _getActionIcon(),
            ),
          ),
        ],
      ),
    );
  }

  Color _getActionColor(ThemeData theme) {
    switch (entry.action.toLowerCase()) {
      case 'create':
        return Colors.green;
      case 'update':
        return Colors.blue;
      case 'delete':
      case 'deactivate':
        return Colors.red;
      default:
        return theme.colorScheme.primary;
    }
  }

  IconData _getActionIcon() {
    switch (entry.action.toLowerCase()) {
      case 'create':
        return Icons.add_circle_outline;
      case 'update':
        return Icons.edit_outlined;
      case 'delete':
        return Icons.delete_outline;
      case 'deactivate':
        return Icons.block_outlined;
      case 'login':
        return Icons.login;
      case 'logout':
        return Icons.logout;
      default:
        return Icons.history;
    }
  }
}

/// Timeline dot and connecting line
class _TimelineIndicator extends StatelessWidget {
  final Color color;
  final bool isLast;

  const _TimelineIndicator({required this.color, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: 32,
      child: Column(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          if (!isLast)
            Expanded(
              child: Container(
                width: 2,
                color: theme.colorScheme.outline.withValues(alpha: 0.3),
              ),
            ),
        ],
      ),
    );
  }
}

/// Entry content with action, time, and details
class _EntryContent extends StatelessWidget {
  final AuditLogEntry entry;
  final Color actionColor;
  final IconData actionIcon;

  const _EntryContent({
    required this.entry,
    required this.actionColor,
    required this.actionIcon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Padding(
      padding: EdgeInsets.only(bottom: spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Action and time
          Row(
            children: [
              Icon(actionIcon, size: 16, color: actionColor),
              SizedBox(width: spacing.xs),
              Text(
                entry.actionDescription,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                _formatTime(entry.createdAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),

          // Changed fields (for updates)
          if (entry.action.toLowerCase() == 'update' &&
              entry.changedFields.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(top: spacing.xs),
              child: Text(
                'Changed: ${entry.changedFields.join(", ")}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ),

          // User info if available
          if (entry.userId != null)
            Padding(
              padding: EdgeInsets.only(top: spacing.xs),
              child: Text(
                'By user #${entry.userId}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return '${months[time.month - 1]} ${time.day}, ${time.year}';
    }
  }
}
