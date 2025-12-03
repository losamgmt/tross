import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Generic select/dropdown input atom for ANY enum or object type
///
/// Type-safe dropdown that works with any type T
/// Uses a displayText function to convert items to strings
///
/// Features:
/// - Fully generic - works with any type
/// - Custom display text transformation
/// - Validation callback
/// - Error/helper text display
/// - Prefix/suffix icons
/// - Disabled state
/// - Optional "empty" selection
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the DropdownButtonFormField
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// Usage:
/// ```dart
/// // With enum
/// SelectInput<UserRole>(
///   value: UserRole.admin,
///   items: UserRole.values,
///   displayText: (role) => role.name,
///   onChanged: (role) => setState(() => selectedRole = role),
/// )
///
/// // With objects
/// SelectInput<User>(
///   value: currentUser,
///   items: allUsers,
///   displayText: (user) => user.fullName,
///   onChanged: (user) => setState(() => assignee = user),
/// )
/// ```
class SelectInput<T> extends StatelessWidget {
  final T? value;
  final List<T> items;
  final ValueChanged<T?> onChanged;
  final String Function(T) displayText;
  final String? Function(T?)? validator;
  final String? errorText;
  final String? helperText;
  final bool enabled;
  final String? placeholder;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final bool allowEmpty;
  final String? emptyText;

  const SelectInput({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.displayText,
    this.validator,
    this.errorText,
    this.helperText,
    this.enabled = true,
    this.placeholder,
    this.prefixIcon,
    this.suffixIcon,
    this.allowEmpty = false,
    this.emptyText = '-- Select --',
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Pure input rendering: Just the DropdownButtonFormField
    return DropdownButtonFormField<T>(
      initialValue: value,
      items: [
        // Optional empty item
        if (allowEmpty)
          DropdownMenuItem<T>(
            value: null,
            child: Text(
              emptyText!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
        // All items
        ...items.map((item) {
          return DropdownMenuItem<T>(
            value: item,
            child: Text(displayText(item)),
          );
        }),
      ],
      onChanged: enabled ? onChanged : null,
      decoration: InputDecoration(
        hintText: placeholder,
        errorText: errorText,
        helperText: helperText,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
        suffixIcon: suffixIcon != null ? Icon(suffixIcon) : null,
        border: const OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(
          horizontal: spacing.sm,
          vertical: spacing.xs,
        ),
      ),
      isExpanded: true,
    );
  }
}
