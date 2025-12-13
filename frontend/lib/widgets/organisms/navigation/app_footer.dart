/// AppFooter - Generic application footer
///
/// SINGLE RESPONSIBILITY: Display footer with links and info
///
/// Features:
/// - Configurable links
/// - Copyright/version info
/// - Social media links
/// - Responsive layout
///
/// Usage:
/// ```dart
/// AppFooter(
///   copyrightText: '© 2025 TrossApp',
///   version: 'v1.0.0',
///   links: [
///     FooterLink(label: 'Privacy', url: '/privacy'),
///     FooterLink(label: 'Terms', url: '/terms'),
///   ],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Configuration for a footer link
class FooterLink {
  final String id;
  final String label;
  final String? url;
  final IconData? icon;
  final VoidCallback? onTap;

  const FooterLink({
    required this.id,
    required this.label,
    this.url,
    this.icon,
    this.onTap,
  });
}

/// Footer link group (for multi-column layouts)
class FooterLinkGroup {
  final String title;
  final List<FooterLink> links;

  const FooterLinkGroup({required this.title, required this.links});
}

/// Generic application footer
class AppFooter extends StatelessWidget {
  /// Copyright text (e.g., "© 2025 TrossApp")
  final String? copyrightText;

  /// Application version
  final String? version;

  /// Simple links (for single-row footer)
  final List<FooterLink>? links;

  /// Link groups (for multi-column footer)
  final List<FooterLinkGroup>? linkGroups;

  /// Social media links
  final List<FooterLink>? socialLinks;

  /// Callback when a link is tapped
  final void Function(FooterLink link)? onLinkTap;

  /// Whether to use compact (single-row) layout
  final bool compact;

  /// Custom footer content
  final Widget? customContent;

  /// Background color
  final Color? backgroundColor;

  const AppFooter({
    super.key,
    this.copyrightText,
    this.version,
    this.links,
    this.linkGroups,
    this.socialLinks,
    this.onLinkTap,
    this.compact = true,
    this.customContent,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: spacing.lg,
        vertical: compact ? spacing.md : spacing.xl,
      ),
      decoration: BoxDecoration(
        color:
            backgroundColor ??
            theme.colorScheme.surface.withValues(alpha: 0.95),
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: compact
          ? _buildCompactFooter(context)
          : _buildExpandedFooter(context),
    );
  }

  Widget _buildCompactFooter(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Row(
      children: [
        // Copyright
        if (copyrightText != null)
          Text(
            copyrightText!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),

        if (version != null) ...[
          SizedBox(width: spacing.sm),
          Text(
            version!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ],

        const Spacer(),

        // Links
        if (links != null)
          Wrap(
            spacing: spacing.md,
            children: links!
                .map((link) => _buildLink(link, theme, spacing))
                .toList(),
          ),

        // Social links
        if (socialLinks != null) ...[
          SizedBox(width: spacing.lg),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: socialLinks!
                .map((link) => _buildSocialLink(link, theme))
                .toList(),
          ),
        ],

        // Custom content
        if (customContent != null) customContent!,
      ],
    );
  }

  Widget _buildExpandedFooter(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Link groups
        if (linkGroups != null)
          Wrap(
            spacing: spacing.xl * 2,
            runSpacing: spacing.lg,
            children: linkGroups!
                .map((group) => _buildLinkGroup(group, theme, spacing))
                .toList(),
          ),

        if (linkGroups != null) SizedBox(height: spacing.lg),

        // Divider
        Divider(color: theme.colorScheme.outline.withValues(alpha: 0.2)),

        SizedBox(height: spacing.md),

        // Bottom row
        Row(
          children: [
            // Copyright
            if (copyrightText != null)
              Text(
                copyrightText!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),

            if (version != null) ...[
              SizedBox(width: spacing.sm),
              Text(
                '• $version',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                ),
              ),
            ],

            const Spacer(),

            // Social links
            if (socialLinks != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: socialLinks!
                    .map((link) => _buildSocialLink(link, theme))
                    .toList(),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildLinkGroup(
    FooterLinkGroup group,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          group.title.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        SizedBox(height: spacing.sm),
        ...group.links.map(
          (link) => Padding(
            padding: EdgeInsets.only(bottom: spacing.xs),
            child: _buildLink(link, theme, spacing),
          ),
        ),
      ],
    );
  }

  Widget _buildLink(FooterLink link, ThemeData theme, AppSpacing spacing) {
    return InkWell(
      onTap: link.onTap ?? () => onLinkTap?.call(link),
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.xs,
          vertical: spacing.xs / 2,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (link.icon != null) ...[
              Icon(
                link.icon,
                size: 14,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
              SizedBox(width: spacing.xs),
            ],
            Text(
              link.label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSocialLink(FooterLink link, ThemeData theme) {
    return IconButton(
      onPressed: link.onTap ?? () => onLinkTap?.call(link),
      icon: Icon(
        link.icon ?? Icons.link,
        size: 20,
        color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
      ),
      tooltip: link.label,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      padding: EdgeInsets.zero,
    );
  }
}
