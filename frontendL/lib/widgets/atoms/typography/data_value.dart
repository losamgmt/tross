/// DataValue - Atom component for displaying data values
///
/// Consistent styling for data values in tables and detail views
/// Supports different emphasis levels and optional copying
///
/// Material 3 Design with TrossApp branding
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../config/app_spacing.dart';
import '../../../services/notification_service.dart';
import '../../../utils/helpers/helpers.dart';

enum ValueEmphasis { primary, secondary, tertiary }

class DataValue extends StatelessWidget {
  final String text;
  final ValueEmphasis emphasis;
  final bool monospace;
  final bool copyable;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;

  const DataValue({
    super.key,
    required this.text,
    this.emphasis = ValueEmphasis.primary,
    this.monospace = false,
    this.copyable = false,
    this.style,
    this.maxLines,
    this.overflow,
  });

  /// Factory for email addresses (copyable, secondary emphasis)
  factory DataValue.email(String email) {
    return DataValue(
      text: email,
      emphasis: ValueEmphasis.secondary,
      copyable: true,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  /// Factory for IDs (monospace, tertiary emphasis)
  factory DataValue.id(String id) {
    return DataValue(
      text: id,
      emphasis: ValueEmphasis.tertiary,
      monospace: true,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  /// Factory for timestamps (secondary emphasis)
  factory DataValue.timestamp(DateTime timestamp) {
    final formatted = DateTimeHelpers.formatTimestamp(timestamp);
    return DataValue(text: formatted, emphasis: ValueEmphasis.secondary);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textStyle = _getTextStyle(theme);

    if (!copyable) {
      return Text(
        text,
        style: style ?? textStyle,
        maxLines: maxLines,
        overflow: overflow,
      );
    }

    // Copyable value - show with copy icon on hover
    final spacing = context.spacing;

    return InkWell(
      onTap: () => _copyToClipboard(context),
      borderRadius: spacing.radiusXS,
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.xxs,
          vertical: spacing.xxs * 0.5,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                text,
                style: style ?? textStyle,
                maxLines: maxLines,
                overflow: overflow,
              ),
            ),
            SizedBox(width: spacing.xxs),
            Icon(
              Icons.content_copy,
              size: spacing.iconSizeXS,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
            ),
          ],
        ),
      ),
    );
  }

  TextStyle _getTextStyle(ThemeData theme) {
    Color color;
    FontWeight fontWeight;

    switch (emphasis) {
      case ValueEmphasis.primary:
        color = theme.colorScheme.onSurface;
        fontWeight = FontWeight.w500;
        break;
      case ValueEmphasis.secondary:
        color = theme.colorScheme.onSurfaceVariant;
        fontWeight = FontWeight.normal;
        break;
      case ValueEmphasis.tertiary:
        color = theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7);
        fontWeight = FontWeight.w300;
        break;
    }

    return theme.textTheme.bodyMedium!.copyWith(
      color: color,
      fontWeight: fontWeight,
      fontFamily: monospace ? 'monospace' : null,
    );
  }

  void _copyToClipboard(BuildContext context) {
    Clipboard.setData(ClipboardData(text: text));
    NotificationService.showInfo(context, 'Copied: $text');
  }
}
