/// DevLoginCard - TEMPORARY: Will be moved to organisms/ in Step 2
///
/// Self-contained card with:
/// - Header: "Developer Login" with code icon
/// - Description: "For testing and development only"
/// - Role dropdown: Inline replacement for RoleSelector (deleted)
/// - Single login button
///
/// NOTE: This is actually an ORGANISM (has state), not a molecule
/// Will be moved to organisms/login/dev_login_card.dart in Step 2
///
/// Callbacks handle authentication logic in parent
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../../utils/helpers/string_helper.dart';

// TEMPORARY: Hardcoded role list until this moves to organisms
const _devRoles = ['admin', 'technician', 'manager', 'dispatcher', 'client'];

class DevLoginCard extends StatefulWidget {
  /// Callback when dev login button pressed with selected role
  final void Function(String role) onDevLogin;

  const DevLoginCard({super.key, required this.onDevLogin});

  @override
  State<DevLoginCard> createState() => _DevLoginCardState();
}

class _DevLoginCardState extends State<DevLoginCard> {
  /// Currently selected role (defaults to admin - highest priority)
  String? _selectedRole = 'admin';

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

            // TEMPORARY: Inline role dropdown (replaces deleted RoleSelector)
            // Will use SelectInput<String> when moved to organisms in Step 2
            DropdownButtonFormField<String>(
              initialValue: _selectedRole,
              decoration: const InputDecoration(
                labelText: 'Select Role',
                helperText: 'Choose a role to test with',
                border: OutlineInputBorder(),
              ),
              items: _devRoles.map((role) {
                return DropdownMenuItem(
                  value: role,
                  child: Text(StringHelper.capitalize(role)),
                );
              }).toList(),
              onChanged: (role) => setState(() => _selectedRole = role),
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
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
