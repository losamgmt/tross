/// DevLoginCard - Organism for development authentication
///
/// **SOLE RESPONSIBILITY:** Compose role selection UI for dev login
/// - StatefulWidget ONLY for managing selected role state (UI state)
/// - Uses `SelectInput<String>` atom for role dropdown
/// - Pure composition, zero business logic
///
/// Self-contained card with:
/// - Header: "Developer Login" with code icon
/// - Description: "For testing and development only"
/// - Role dropdown: Generic `SelectInput<String>` with injected roles
/// - Login button: Triggers callback with selected role
///
/// Roles are INJECTED via props (loaded by parent via AsyncDataProvider)
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/string_helper.dart';
import '../../atoms/atoms.dart';

class DevLoginCard extends StatefulWidget {
  /// Available role names to select from (injected by parent)
  final List<String> availableRoles;

  /// Callback when dev login button pressed with selected role
  final void Function(String role) onDevLogin;

  const DevLoginCard({
    super.key,
    required this.availableRoles,
    required this.onDevLogin,
  });

  @override
  State<DevLoginCard> createState() => _DevLoginCardState();
}

class _DevLoginCardState extends State<DevLoginCard> {
  /// Currently selected role (defaults to first available)
  String? _selectedRole;

  @override
  void initState() {
    super.initState();
    // Default to first role (highest priority: admin)
    _selectedRole = widget.availableRoles.isNotEmpty
        ? widget.availableRoles.first
        : null;
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    return Card(
      elevation: 2,
      color: theme.colorScheme.errorContainer.withValues(alpha: 0.1),
      child: Padding(
        padding: spacing.paddingXL,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Dev Card Title
            Row(
              children: [
                Icon(Icons.code, color: theme.colorScheme.error, size: 20),
                SizedBox(width: spacing.sm),
                Text(
                  'Developer Login',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.error,
                  ),
                ),
              ],
            ),
            spacing.gapSM,
            Text(
              'For testing and development only',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            spacing.gapLG,

            // Generic SelectInput atom (pure, receives data via props)
            SelectInput<String>(
              value: _selectedRole,
              items: widget.availableRoles,
              displayText: StringHelper.capitalize,
              onChanged: (role) => setState(() => _selectedRole = role),
              placeholder: 'Select Role',
              helperText: 'Choose a role to test with',
            ),

            spacing.gapMD,

            // Single Dev Login Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _selectedRole != null
                    ? () => widget.onDevLogin(_selectedRole!)
                    : null,
                icon: const Icon(Icons.login),
                label: const Text('Dev Login'),
                style: OutlinedButton.styleFrom(
                  padding: EdgeInsets.symmetric(
                    horizontal: spacing.lg,
                    vertical: spacing.sm,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
