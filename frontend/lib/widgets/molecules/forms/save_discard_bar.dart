/// SaveDiscardBar - Action Bar for Dirty Form State
///
/// **SOLE RESPONSIBILITY:** Display save/discard actions when form is dirty
///
/// Features:
/// - Save and discard action buttons
/// - Change count indicator ("3 unsaved changes")
/// - Saving progress state with spinner
/// - Success/error feedback messages
/// - Automatically hides when form is clean
/// - Disabled buttons during save operation
/// - Custom button labels
///
/// This molecule composes buttons + status indicator, delegating all
/// state management to the caller (typically EditableFormNotifier).
///
/// Usage:
/// ```dart
/// // With EditableFormNotifier from Provider
/// Consumer<EditableFormNotifier>(
///   builder: (context, notifier, _) {
///     return SaveDiscardBar(
///       isDirty: notifier.isDirty,
///       changeCount: notifier.changeCount,
///       saveState: notifier.saveState,
///       saveError: notifier.saveError,
///       onSave: notifier.save,
///       onDiscard: notifier.discard,
///     );
///   },
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../providers/editable_form_notifier.dart';

/// Action bar that appears when a form has unsaved changes
///
/// Displays at the bottom of the screen with save/discard actions.
/// Automatically hides when form is clean (not dirty).
class SaveDiscardBar extends StatelessWidget {
  /// Whether the form has unsaved changes
  final bool isDirty;

  /// Number of fields that have been changed
  final int changeCount;

  /// Current save operation state
  final SaveState saveState;

  /// Error message from last failed save
  final String? saveError;

  /// Callback when save is tapped
  final VoidCallback? onSave;

  /// Callback when discard is tapped
  final VoidCallback? onDiscard;

  /// Optional custom save button label
  final String saveLabel;

  /// Optional custom discard button label
  final String discardLabel;

  const SaveDiscardBar({
    super.key,
    required this.isDirty,
    this.changeCount = 0,
    this.saveState = SaveState.idle,
    this.saveError,
    this.onSave,
    this.onDiscard,
    this.saveLabel = 'Save Changes',
    this.discardLabel = 'Discard',
  });

  @override
  Widget build(BuildContext context) {
    // Don't render anything if form is clean
    if (!isDirty && saveState != SaveState.success) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: spacing.md,
        vertical: spacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Status indicator
            Expanded(child: _buildStatusIndicator(theme, spacing)),

            SizedBox(width: spacing.md),

            // Action buttons
            ..._buildActionButtons(theme, spacing),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusIndicator(ThemeData theme, AppSpacing spacing) {
    switch (saveState) {
      case SaveState.saving:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: spacing.iconSizeMD,
              height: spacing.iconSizeMD,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.brandPrimary,
              ),
            ),
            SizedBox(width: spacing.sm),
            Text(
              'Saving...',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        );

      case SaveState.success:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.check_circle,
              size: spacing.iconSizeMD,
              color: AppColors.success,
            ),
            SizedBox(width: spacing.sm),
            Text(
              'Saved successfully',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.success,
              ),
            ),
          ],
        );

      case SaveState.error:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: spacing.iconSizeMD,
              color: AppColors.error,
            ),
            SizedBox(width: spacing.sm),
            Flexible(
              child: Text(
                saveError ?? 'Save failed',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.error,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );

      case SaveState.idle:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.edit_outlined,
              size: spacing.iconSizeMD,
              color: AppColors.warning,
            ),
            SizedBox(width: spacing.sm),
            Text(
              changeCount == 1
                  ? '1 unsaved change'
                  : '$changeCount unsaved changes',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        );
    }
  }

  List<Widget> _buildActionButtons(ThemeData theme, AppSpacing spacing) {
    final isSaving = saveState == SaveState.saving;

    return [
      // Discard button
      TextButton(
        onPressed: isSaving ? null : onDiscard,
        child: Text(discardLabel),
      ),

      SizedBox(width: spacing.sm),

      // Save button
      FilledButton.icon(
        onPressed: isSaving ? null : onSave,
        icon: Icon(Icons.save, size: spacing.iconSizeMD),
        label: Text(saveLabel),
      ),
    ];
  }
}
