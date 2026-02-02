/// PDF Preview - Web implementation using iframe
///
/// This file is used when running on web.
/// Uses browser's native PDF viewer via iframe.
library;

// ignore: avoid_web_libraries_in_flutter
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'package:web/web.dart' as web;

/// PDF preview widget using browser's native PDF viewer
class PdfPreviewWidget extends StatefulWidget {
  final String downloadUrl;
  final int fileId;

  const PdfPreviewWidget({
    super.key,
    required this.downloadUrl,
    required this.fileId,
  });

  @override
  State<PdfPreviewWidget> createState() => _PdfPreviewWidgetState();
}

class _PdfPreviewWidgetState extends State<PdfPreviewWidget> {
  late final String _viewType;

  @override
  void initState() {
    super.initState();
    // Create unique view type for this instance
    _viewType =
        'pdf-preview-${widget.fileId}-${DateTime.now().millisecondsSinceEpoch}';

    // Register the iframe factory
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe =
          web.document.createElement('iframe') as web.HTMLIFrameElement;
      iframe.src = widget.downloadUrl;
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      return iframe;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 500,
      decoration: BoxDecoration(
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: HtmlElementView(viewType: _viewType),
      ),
    );
  }
}
