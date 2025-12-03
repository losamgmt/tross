/// EditableField - Generic inline field editor organism
///
/// SINGLE RESPONSIBILITY: Handle inline field editing workflow
/// - Display current value (via renderer widget)
/// - Show confirmation dialog on change
/// - Execute API call (via callback)
/// - Manage loading/error states
///
/// FULLY GENERIC: Works for ANY field type (bool, string, int, etc.) on ANY model
/// Zero special cases, zero field-specific logic
///
/// Type Parameters:
/// - T: Model type (User, Role, Post, etc.)
/// - V: Value type (bool, String, int, etc.)
///
/// Usage:
/// ```dart
/// // Boolean field (isActive)
/// EditableField<User, bool>(
///   value: user.isActive,
///   displayWidget: BooleanBadge.activeInactive(value: user.isActive),
///   editWidget: BooleanToggle.activeInactive(value: user.isActive, onToggle: null),
///   confirmationTitle: 'Change Status?',
///   confirmationMessage: (newValue) =>
///     'Set status to ${newValue ? "Active" : "Inactive"}?',
///   onUpdate: (newValue) async {
///     await userService.updateUser(user.id, isActive: newValue);
///   },
///   onChanged: () => refreshUserList(),
/// )
///
/// // String field (email)
/// EditableField<User, String>(
///   value: user.email,
///   displayWidget: DataValue.email(user.email),
///   editWidget: EmailInput(initialValue: user.email),
///   confirmationTitle: 'Update Email?',
///   confirmationMessage: (newValue) => 'Change email to $newValue?',
///   onUpdate: (newValue) => userService.updateUser(user.id, email: newValue),
///   onChanged: refreshUserList,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../atoms/atoms.dart';
import '../../molecules/molecules.dart';
import '../../../services/notification_service.dart';

/// Configuration for field editing confirmation
class ConfirmationConfig {
  final String title;
  final String Function(dynamic newValue) getMessage;
  final bool isDangerous;

  const ConfirmationConfig({
    required this.title,
    required this.getMessage,
    this.isDangerous = false,
  });

  /// Factory for boolean field confirmation
  factory ConfirmationConfig.boolean({
    required String fieldName,
    required String trueAction,
    required String falseAction,
  }) {
    return ConfirmationConfig(
      title: 'Change $fieldName?',
      getMessage: (newValue) =>
          'Are you sure you want to ${newValue ? trueAction : falseAction}?',
      isDangerous: false,
    );
  }

  /// Factory for text field confirmation
  factory ConfirmationConfig.text({required String fieldName}) {
    return ConfirmationConfig(
      title: 'Update $fieldName?',
      getMessage: (newValue) => 'Change $fieldName to "$newValue"?',
      isDangerous: false,
    );
  }
}

class EditableField<T, V> extends StatefulWidget {
  /// Current field value
  final V value;

  /// Widget to display when not editing (readonly view)
  final Widget displayWidget;

  /// Widget to use for editing (must emit change via callback)
  final Widget Function(V value, ValueChanged<V> onChanged) editWidget;

  /// Confirmation dialog configuration
  final ConfirmationConfig? confirmationConfig;

  /// Async callback to perform the update (returns true on success)
  final Future<bool> Function(V newValue) onUpdate;

  /// Callback when update succeeds
  final VoidCallback? onChanged;

  /// Whether to show loading state during update
  final bool showLoading;

  const EditableField({
    super.key,
    required this.value,
    required this.displayWidget,
    required this.editWidget,
    required this.onUpdate,
    this.confirmationConfig,
    this.onChanged,
    this.showLoading = true,
  });

  @override
  State<EditableField<T, V>> createState() => _EditableFieldState<T, V>();
}

class _EditableFieldState<T, V> extends State<EditableField<T, V>> {
  bool _isLoading = false;
  String? _errorMessage;

  /// Handle value change from edit widget
  Future<void> _handleValueChange(V newValue) async {
    // Skip if value hasn't changed
    if (newValue == widget.value) return;

    // Show confirmation dialog if configured
    if (widget.confirmationConfig != null) {
      final confirmed = await _showConfirmationDialog(newValue);
      if (confirmed != true) return; // User cancelled
    }

    // Execute the update
    await _executeUpdate(newValue);
  }

  /// Show confirmation dialog
  Future<bool?> _showConfirmationDialog(V newValue) async {
    if (!mounted) return false;

    final config = widget.confirmationConfig!;

    return showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return ConfirmationDialog(
          title: config.title,
          message: config.getMessage(newValue),
          onConfirm: () {}, // Dialog handles navigation
          isDangerous: config.isDangerous,
        );
      },
    );
  }

  /// Execute the field update
  Future<void> _executeUpdate(V newValue) async {
    if (widget.showLoading) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final success = await widget.onUpdate(newValue);

      if (!mounted) return;

      if (success) {
        // Success - notify parent
        widget.onChanged?.call();

        // Show brief success feedback
        if (mounted) {
          NotificationService.showSuccess(context, 'Updated successfully');
        }
      } else {
        // API returned false
        setState(() {
          _errorMessage = 'Update failed';
        });

        if (mounted) {
          NotificationService.showError(context, _errorMessage!);
        }
      }
    } catch (e) {
      // API threw exception
      if (!mounted) return;

      setState(() {
        _errorMessage = 'Error: ${e.toString()}';
      });

      if (mounted) {
        NotificationService.showError(context, _errorMessage!);
      }
    } finally {
      if (mounted && widget.showLoading) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && widget.showLoading) {
      return const LoadingIndicator.inline();
    }

    return widget.editWidget(widget.value, _handleValueChange);
  }
}
