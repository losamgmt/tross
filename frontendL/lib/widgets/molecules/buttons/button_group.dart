/// ButtonGroup - Generic molecule for composing multiple buttons
///
/// SINGLE RESPONSIBILITY: Layout multiple buttons with consistent spacing
/// 100% GENERIC - receives button configurations as props
///
/// NO business logic, NO navigation, NO service calls!
/// Parent organism handles all logic and passes button configs down.
///
/// Usage:
/// ```dart
/// ButtonGroup(
///   buttons: [
///     ButtonConfig(label: 'Save', onPressed: _handleSave, isPrimary: true),
///     ButtonConfig(label: 'Cancel', onPressed: _handleCancel),
///   ],
///   direction: Axis.horizontal,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Configuration for a single button in the group
class ButtonConfig {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isPrimary;
  final bool isDestructive;
  final bool isLoading;

  const ButtonConfig({
    required this.label,
    this.icon,
    this.onPressed,
    this.isPrimary = false,
    this.isDestructive = false,
    this.isLoading = false,
  });
}

/// Generic button group molecule
///
/// Composes multiple buttons with consistent spacing and styling
class ButtonGroup extends StatelessWidget {
  final List<ButtonConfig> buttons;
  final Axis direction;
  final MainAxisAlignment alignment;
  final CrossAxisAlignment crossAlignment;
  final bool expand;

  const ButtonGroup({
    super.key,
    required this.buttons,
    this.direction = Axis.horizontal,
    this.alignment = MainAxisAlignment.start,
    this.crossAlignment = CrossAxisAlignment.center,
    this.expand = false,
  });

  /// Vertical button group (stacked)
  factory ButtonGroup.vertical({
    required List<ButtonConfig> buttons,
    bool expand = true,
  }) {
    return ButtonGroup(
      buttons: buttons,
      direction: Axis.vertical,
      expand: expand,
      crossAlignment: CrossAxisAlignment.stretch,
    );
  }

  /// Horizontal button group (row)
  factory ButtonGroup.horizontal({
    required List<ButtonConfig> buttons,
    MainAxisAlignment alignment = MainAxisAlignment.end,
  }) {
    return ButtonGroup(
      buttons: buttons,
      direction: Axis.horizontal,
      alignment: alignment,
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    final widgets = <Widget>[];

    for (var i = 0; i < buttons.length; i++) {
      final config = buttons[i];

      // Add spacing between buttons (but not before first)
      if (i > 0) {
        widgets.add(
          SizedBox(
            width: direction == Axis.horizontal ? spacing.md : 0,
            height: direction == Axis.vertical ? spacing.md : 0,
          ),
        );
      }

      // Build button widget
      final button = _buildButton(context, config, theme);
      widgets.add(
        expand && direction == Axis.vertical
            ? SizedBox(width: double.infinity, child: button)
            : button,
      );
    }

    return direction == Axis.horizontal
        ? Row(
            mainAxisAlignment: alignment,
            crossAxisAlignment: crossAlignment,
            children: widgets,
          )
        : Column(
            mainAxisAlignment: alignment,
            crossAxisAlignment: crossAlignment,
            children: widgets,
          );
  }

  Widget _buildButton(
    BuildContext context,
    ButtonConfig config,
    ThemeData theme,
  ) {
    // Determine button style
    final ButtonStyle? style = config.isPrimary
        ? ElevatedButton.styleFrom(
            backgroundColor: config.isDestructive
                ? theme.colorScheme.error
                : theme.colorScheme.primary,
            foregroundColor: config.isDestructive
                ? theme.colorScheme.onError
                : theme.colorScheme.onPrimary,
          )
        : config.isDestructive
        ? TextButton.styleFrom(foregroundColor: theme.colorScheme.error)
        : null;

    // Build button content
    final content = config.isLoading
        ? SizedBox(
            width: context.spacing.lg,
            height: context.spacing.lg,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                config.isPrimary
                    ? theme.colorScheme.onPrimary
                    : theme.colorScheme.primary,
              ),
            ),
          )
        : config.icon != null
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(config.icon, size: context.spacing.lg),
              SizedBox(width: context.spacing.sm),
              Text(config.label),
            ],
          )
        : Text(config.label);

    // Return appropriate button type
    return config.isPrimary
        ? ElevatedButton(
            onPressed: config.isLoading ? null : config.onPressed,
            style: style,
            child: content,
          )
        : TextButton(
            onPressed: config.isLoading ? null : config.onPressed,
            style: style,
            child: content,
          );
  }
}
