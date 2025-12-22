/// Activity Log Display - Shows audit/history timeline for an entity
///
/// A molecule that displays a timeline of changes made to an entity.
/// Fetches data from AuditLogService and presents it in a readable format.
///
/// USAGE:
/// ```dart
/// ActivityLogDisplay(
///   resourceType: 'work_order',
///   resourceId: 123,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../services/audit_log_service.dart';
import '../../../config/app_spacing.dart';

/// Displays activity/audit log for a resource
class ActivityLogDisplay extends StatefulWidget {
  /// Entity type (work_order, customer, user, etc.)
  final String resourceType;

  /// ID of the resource
  final int resourceId;

  /// Maximum entries to show (default 20)
  final int maxEntries;

  /// Title to display (default "Activity History")
  final String? title;

  const ActivityLogDisplay({
    super.key,
    required this.resourceType,
    required this.resourceId,
    this.maxEntries = 20,
    this.title,
  });

  @override
  State<ActivityLogDisplay> createState() => _ActivityLogDisplayState();
}

class _ActivityLogDisplayState extends State<ActivityLogDisplay> {
  List<AuditLogEntry>? _entries;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didUpdateWidget(ActivityLogDisplay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.resourceType != widget.resourceType ||
        oldWidget.resourceId != widget.resourceId) {
      _loadHistory();
    }
  }

  Future<void> _loadHistory() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final entries = await AuditLogService.getResourceHistory(
        resourceType: widget.resourceType,
        resourceId: widget.resourceId,
        limit: widget.maxEntries,
      );

      if (mounted) {
        setState(() {
          _entries = entries;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with refresh
        Row(
          children: [
            Text(
              widget.title ?? 'Activity History',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.refresh, size: 20),
              onPressed: _loading ? null : _loadHistory,
              tooltip: 'Refresh',
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
        SizedBox(height: spacing.sm),

        // Content
        if (_loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_error != null)
          _buildErrorState(theme)
        else if (_entries == null || _entries!.isEmpty)
          _buildEmptyState(theme)
        else
          _buildTimeline(theme, spacing),
      ],
    );
  }

  Widget _buildErrorState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 8),
            Text(
              'Failed to load history',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
            const SizedBox(height: 8),
            TextButton(onPressed: _loadHistory, child: const Text('Try Again')),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.history, size: 48, color: theme.colorScheme.outline),
            const SizedBox(height: 8),
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

  Widget _buildTimeline(ThemeData theme, AppSpacing spacing) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _entries!.length,
      itemBuilder: (context, index) {
        final entry = _entries![index];
        final isLast = index == _entries!.length - 1;
        return _ActivityLogItem(entry: entry, isLast: isLast);
      },
    );
  }
}

/// Single activity log item with timeline connector
class _ActivityLogItem extends StatelessWidget {
  final AuditLogEntry entry;
  final bool isLast;

  const _ActivityLogItem({required this.entry, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: _getActionColor(theme),
                    shape: BoxShape.circle,
                  ),
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
          ),

          // Content
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: spacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Action and time
                  Row(
                    children: [
                      Icon(
                        _getActionIcon(),
                        size: 16,
                        color: _getActionColor(theme),
                      ),
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
      // Simple date format without intl dependency
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
