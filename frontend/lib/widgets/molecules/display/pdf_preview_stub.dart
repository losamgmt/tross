/// PDF Preview - Stub implementation for non-web platforms
///
/// This file is used when not running on web.
/// PDF preview is only supported on web platform.
library;

import 'package:flutter/material.dart';
import '../../../config/app_spacing.dart';

/// Stub PDF preview widget for non-web platforms
class PdfPreviewWidget extends StatelessWidget {
  final String downloadUrl;
  final int fileId;

  const PdfPreviewWidget({
    super.key,
    required this.downloadUrl,
    required this.fileId,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Container(
      padding: EdgeInsets.all(spacing.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.picture_as_pdf,
            size: 48,
            color: theme.colorScheme.primary,
          ),
          SizedBox(height: spacing.md),
          Text('PDF Preview', style: theme.textTheme.titleMedium),
          SizedBox(height: spacing.sm),
          Text(
            'PDF preview is only available in the browser.\nPlease download the file to view.',
            textAlign: TextAlign.center,
            style: TextStyle(color: theme.colorScheme.outline),
          ),
        ],
      ),
    );
  }
}
