import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';
import '../../atoms/atoms.dart';

/// ConfigCard - Molecule for displaying configuration or settings items
///
/// **SOLE RESPONSIBILITY:** Display a configurable card with status indicator
/// - Composes: StatusChip atom for status display
/// - Context-agnostic: NO domain logic
/// - Fully parameterized: title, description, status, actions all configurable
///
/// GENERIC: Works for any configuration display:
/// - Database connections (Connected/Disconnected)
/// - API integrations (Active/Inactive)
/// - User settings (Enabled/Disabled)
/// - Feature flags (On/Off)
///
/// Usage:
/// ```dart
/// // Simple config card
/// ConfigCard(
///   title: 'Primary Database',
///   description: 'PostgreSQL connection for main data',
///   statusLabel: 'Connected',
///   statusColor: Colors.green,
/// )
///
/// // With actions
/// ConfigCard(
///   title: 'API Integration',
///   description: 'Third-party sync service',
///   statusLabel: 'Inactive',
///   statusColor: Colors.grey,
///   trailing: IconButton(
///     icon: Icon(Icons.settings),
///     onPressed: () {},
///   ),
/// )
///
/// // With custom content
/// ConfigCard(
///   title: 'Email Notifications',
///   statusLabel: 'Enabled',
///   statusColor: Colors.green,
///   child: SwitchListTile(...),
/// )
/// ```
class ConfigCard extends StatelessWidget {
  /// Primary title for the configuration item
  final String title;

  /// Optional description text
  final String? description;

  /// Status label to display in StatusChip
  final String? statusLabel;

  /// Color for the status chip
  final Color? statusColor;

  /// Optional icon for the status chip
  final IconData? statusIcon;

  /// Whether to use compact status chip
  final bool compactStatus;

  /// Optional leading widget (icon, avatar, etc.)
  final Widget? leading;

  /// Optional trailing widget (buttons, switches, etc.)
  final Widget? trailing;

  /// Optional child content below title/description
  final Widget? child;

  /// Card padding
  final EdgeInsetsGeometry? padding;

  /// Card margin
  final EdgeInsetsGeometry? margin;

  /// Card background color
  final Color? backgroundColor;

  /// Card elevation
  final double? elevation;

  /// Whether the card is tappable
  final VoidCallback? onTap;

  /// Whether the card is in a disabled state
  final bool enabled;

  const ConfigCard({
    super.key,
    required this.title,
    this.description,
    this.statusLabel,
    this.statusColor,
    this.statusIcon,
    this.compactStatus = false,
    this.leading,
    this.trailing,
    this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.elevation,
    this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);
    final effectiveOpacity = enabled ? 1.0 : 0.5;

    Widget content = Opacity(
      opacity: effectiveOpacity,
      child: Padding(
        padding: padding ?? EdgeInsets.all(spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row: leading + title + status + trailing
            Row(
              children: [
                if (leading != null) ...[leading!, SizedBox(width: spacing.sm)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title with optional status chip inline
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (statusLabel != null && statusColor != null) ...[
                            SizedBox(width: spacing.sm),
                            StatusChip(
                              label: statusLabel!,
                              color: statusColor!,
                              icon: statusIcon,
                              compact: compactStatus,
                            ),
                          ],
                        ],
                      ),
                      // Description below title
                      if (description != null) ...[
                        SizedBox(height: spacing.xs),
                        Text(
                          description!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.7,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  SizedBox(width: spacing.sm),
                  trailing!,
                ],
              ],
            ),
            // Optional child content
            if (child != null) ...[SizedBox(height: spacing.md), child!],
          ],
        ),
      ),
    );

    // Wrap in TouchTarget if tappable
    if (onTap != null && enabled) {
      content = TouchTarget(onTap: onTap, semanticLabel: title, child: content);
    }

    return Card(
      margin: margin ?? EdgeInsets.all(spacing.xs),
      elevation: elevation ?? 1,
      color: backgroundColor,
      shape: RoundedRectangleBorder(borderRadius: spacing.radiusMD),
      clipBehavior: Clip.antiAlias,
      child: content,
    );
  }
}

/// ConfigCardGroup - Helper widget to display multiple ConfigCards
///
/// Provides consistent spacing between cards in a group.
class ConfigCardGroup extends StatelessWidget {
  /// List of config cards to display
  final List<ConfigCard> cards;

  /// Spacing between cards
  final double? spacing;

  /// Optional header widget
  final Widget? header;

  const ConfigCardGroup({
    super.key,
    required this.cards,
    this.spacing,
    this.header,
  });

  @override
  Widget build(BuildContext context) {
    final appSpacing = context.spacing;
    final effectiveSpacing = spacing ?? appSpacing.xs;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (header != null) ...[header!, SizedBox(height: effectiveSpacing)],
        ...cards.map(
          (card) => Padding(
            padding: EdgeInsets.only(bottom: effectiveSpacing),
            child: card,
          ),
        ),
      ],
    );
  }
}
