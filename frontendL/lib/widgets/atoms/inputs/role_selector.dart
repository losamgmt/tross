/// RoleSelector - Data-driven role dropdown for dev auth
///
/// Atomic component that loads available roles from permission config
/// and displays them sorted by priority (highest first: admin → client)
///
/// Features:
/// - Data-driven from permissions.json (single source of truth)
/// - Sorted by priority descending (admin = 5, client = 1)
/// - Returns role name as string
/// - Reusable for any role selection scenario
///
/// **SRP: Pure Input Rendering**
/// - Wraps `SelectInput<String>` with role-specific logic
/// - Handles async loading of roles from config
/// - Displays loading/error states appropriately
///
/// Usage:
/// ```dart
/// RoleSelector(
///   value: selectedRole,
///   onChanged: (role) => setState(() => selectedRole = role),
///   label: 'Select Role',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../services/permission_config_loader.dart';
import '../../../utils/helpers/string_helper.dart';
import 'select_input.dart';

class RoleSelector extends StatefulWidget {
  final String? value;
  final ValueChanged<String?> onChanged;
  final String? label;
  final String? helperText;
  final bool enabled;

  const RoleSelector({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.helperText,
    this.enabled = true,
  });

  @override
  State<RoleSelector> createState() => _RoleSelectorState();
}

class _RoleSelectorState extends State<RoleSelector> {
  List<_RoleOption>? _roles;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  /// Load roles from permission config and sort by priority
  Future<void> _loadRoles() async {
    try {
      final config = await PermissionConfigLoader.load();

      // Convert roles map to list with priority sorting
      final rolesList = config.roles.entries.map((entry) {
        return _RoleOption(
          name: entry.key,
          priority: entry.value.priority,
          description: entry.value.description,
        );
      }).toList();

      // Sort by priority descending (admin=5 first, client=1 last)
      rolesList.sort((a, b) => b.priority.compareTo(a.priority));

      if (mounted) {
        setState(() {
          _roles = rolesList;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load roles: $e';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Loading state
    if (_loading) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.label != null) ...[
            Text(widget.label!, style: theme.textTheme.labelLarge),
            SizedBox(height: spacing.xs),
          ],
          const Center(child: CircularProgressIndicator()),
        ],
      );
    }

    // Error state
    if (_error != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.label != null) ...[
            Text(widget.label!, style: theme.textTheme.labelLarge),
            SizedBox(height: spacing.xs),
          ],
          Container(
            padding: EdgeInsets.all(spacing.sm),
            decoration: BoxDecoration(
              color: theme.colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: theme.colorScheme.error),
                SizedBox(width: spacing.xs),
                Expanded(
                  child: Text(
                    _error!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    // Success state - render select input
    if (_roles == null || _roles!.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.label != null) ...[
            Text(widget.label!, style: theme.textTheme.labelLarge),
            SizedBox(height: spacing.xs),
          ],
          Text(
            'No roles available',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      );
    }

    // Render with label wrapper (SelectInput doesn't include label)
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!, style: theme.textTheme.labelLarge),
          SizedBox(height: spacing.xs),
        ],
        SelectInput<String>(
          value: widget.value,
          items: _roles!.map((role) => role.name).toList(),
          displayText: (roleName) {
            // Display: Just "Admin" (clean, simple)
            return StringHelper.capitalize(roleName);
          },
          onChanged: widget.onChanged,
          enabled: widget.enabled,
          helperText: widget.helperText,
        ),
      ],
    );
  }
}

/// Internal model for role selection
class _RoleOption {
  final String name;
  final int priority;
  final String description;

  const _RoleOption({
    required this.name,
    required this.priority,
    required this.description,
  });
}
