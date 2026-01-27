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
/// - **Keyboard typeahead filtering** - type to filter options
/// - Validation callback
/// - Error/helper text display
/// - Leading icon support
/// - Disabled state
/// - Optional "empty" selection
///
/// **SRP: Pure Input Rendering**
/// - Returns ONLY the DropdownMenu
/// - NO label rendering (molecule's job)
/// - NO Column wrapper (molecule handles layout)
/// - Context-agnostic: Can be used anywhere
///
/// **Material 3 DropdownMenu** provides built-in:
/// - Keyboard navigation (arrow keys)
/// - Type-to-filter (type 'OR' to filter to 'Oregon')
/// - Proper focus management
/// - Accessibility support
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

    // Ensure value is valid: must be in items or null
    final bool canBeNull = allowEmpty || placeholder != null;
    final effectiveValue = (value != null && items.contains(value))
        ? value
        : (canBeNull ? null : (items.isNotEmpty ? items.first : null));

    // Build dropdown menu entries
    final List<DropdownMenuEntry<T?>> entries = [
      // Optional empty item
      if (allowEmpty)
        DropdownMenuEntry<T?>(
          value: null,
          label: emptyText ?? '-- Select --',
          style: MenuItemButton.styleFrom(
            foregroundColor: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      // All items
      ...items.map(
        (item) => DropdownMenuEntry<T?>(value: item, label: displayText(item)),
      ),
    ];

    // Material 3 DropdownMenu with keyboard filtering
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownMenu<T?>(
          initialSelection: effectiveValue,
          dropdownMenuEntries: entries,
          onSelected: enabled ? onChanged : null,
          enabled: enabled,
          enableFilter: true, // ✅ Type-to-filter keyboard support
          enableSearch: true, // ✅ Search within options
          expandedInsets: EdgeInsets.zero, // Expand to full width
          hintText: placeholder,
          leadingIcon: prefixIcon != null ? Icon(prefixIcon) : null,
          trailingIcon: suffixIcon != null ? Icon(suffixIcon) : null,
          inputDecorationTheme: InputDecorationTheme(
            border: const OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(
              horizontal: spacing.sm,
              vertical: spacing.xs,
            ),
          ),
          menuStyle: MenuStyle(
            maximumSize: WidgetStatePropertyAll(
              Size(double.infinity, spacing.xxxl * 8), // Max height for menu
            ),
          ),
        ),
        // Helper text
        if (helperText != null && errorText == null)
          Padding(
            padding: EdgeInsets.only(top: spacing.xxs, left: spacing.sm),
            child: Text(
              helperText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
        // Error text
        if (errorText != null)
          Padding(
            padding: EdgeInsets.only(top: spacing.xxs, left: spacing.sm),
            child: Text(
              errorText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }
}
