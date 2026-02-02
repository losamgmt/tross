/// Entity File Attachments - Generic file attachment display for any entity
///
/// A molecule that displays files attached to an entity.
/// Completely GENERIC - works with any entity_type + entity_id.
///
/// ARCHITECTURE COMPLIANCE:
/// - Receives data from parent (no service calls)
/// - Exposes callbacks for actions (parent handles logic)
/// - Pure presentation + composition of atoms
///
/// USAGE:
/// ```dart
/// EntityFileAttachments(
///   files: attachments,          // Data from parent
///   loading: isLoading,          // Loading state from parent
///   error: errorMessage,         // Error from parent
///   uploading: isUploading,      // Upload state from parent
///   readOnly: false,
///   onUpload: () => controller.pickAndUpload(),
///   onDownload: (file) => controller.downloadFile(file),
///   onDelete: (file) => controller.confirmDelete(file),
///   onRetry: () => controller.loadFiles(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../models/file_attachment.dart';
import '../../../utils/helpers/string_helper.dart';
import '../../../utils/helpers/date_time_helpers.dart';
import '../../../config/app_spacing.dart';
import '../../organisms/modals/generic_modal.dart';
import 'key_value_list.dart';
// Conditional import for PDF preview (web vs non-web)
import 'pdf_preview_stub.dart' if (dart.library.html) 'pdf_preview_web.dart';

// =============================================================================
// MAIN WIDGET - Pure presentation, data received from parent
// =============================================================================

/// Displays file attachments for an entity
///
/// NOTE: This widget does NOT fetch data. Parent provides:
/// - [files]: List of attachments (null while loading)
/// - [loading]: Whether data is loading
/// - [error]: Error message if load failed
/// - [uploading]: Whether an upload is in progress
/// - [onUpload], [onDownload], [onDelete], [onRetry]: Action callbacks
class EntityFileAttachments extends StatelessWidget {
  /// Files to display (null = loading, empty = no files)
  final List<FileAttachment>? files;

  /// Whether data is loading
  final bool loading;

  /// Error message (if load failed)
  final String? error;

  /// Whether an upload is in progress
  final bool uploading;

  /// Whether uploads/deletes are disabled
  final bool readOnly;

  /// Title to display (default: "Attachments")
  final String? title;

  /// Called when user taps upload button
  final VoidCallback? onUpload;

  /// Called when user taps download on a file
  final void Function(FileAttachment file)? onDownload;

  /// Called when user taps delete on a file
  final void Function(FileAttachment file)? onDelete;

  /// Called when user taps retry after error
  final VoidCallback? onRetry;

  const EntityFileAttachments({
    super.key,
    this.files,
    this.loading = false,
    this.error,
    this.uploading = false,
    this.readOnly = false,
    this.title,
    this.onUpload,
    this.onDownload,
    this.onDelete,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Card(
      child: Padding(
        padding: EdgeInsets.all(spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _FileAttachmentsHeader(
              title: title ?? 'Attachments',
              uploading: uploading,
              readOnly: readOnly,
              onUpload: onUpload,
            ),
            SizedBox(height: spacing.md),
            if (loading)
              _LoadingState(spacing: spacing)
            else if (error != null)
              _ErrorState(
                error: error!,
                onRetry: onRetry,
                theme: theme,
                spacing: spacing,
              )
            else if (files == null || files!.isEmpty)
              _EmptyState(theme: theme, spacing: spacing)
            else
              _FileList(
                files: files!,
                readOnly: readOnly,
                onDownload: onDownload,
                onDelete: onDelete,
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// COMPOSED SUB-WIDGETS (private, pure presentation)
// =============================================================================

/// Header with title and upload button
class _FileAttachmentsHeader extends StatelessWidget {
  final String title;
  final bool uploading;
  final bool readOnly;
  final VoidCallback? onUpload;

  const _FileAttachmentsHeader({
    required this.title,
    required this.uploading,
    required this.readOnly,
    this.onUpload,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Row(
      children: [
        Icon(Icons.attach_file, color: theme.colorScheme.primary),
        SizedBox(width: spacing.sm),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const Spacer(),
        if (!readOnly)
          uploading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : IconButton(
                  icon: const Icon(Icons.add),
                  tooltip: 'Upload file',
                  onPressed: onUpload,
                ),
      ],
    );
  }
}

/// Loading state display
class _LoadingState extends StatelessWidget {
  final AppSpacing spacing;

  const _LoadingState({required this.spacing});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing.lg),
        child: const CircularProgressIndicator(),
      ),
    );
  }
}

/// Error state with retry button
class _ErrorState extends StatelessWidget {
  final String error;
  final VoidCallback? onRetry;
  final ThemeData theme;
  final AppSpacing spacing;

  const _ErrorState({
    required this.error,
    this.onRetry,
    required this.theme,
    required this.spacing,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            SizedBox(height: spacing.sm),
            Text(
              'Failed to load files',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
            SizedBox(height: spacing.sm),
            if (onRetry != null)
              TextButton(onPressed: onRetry, child: const Text('Try Again')),
          ],
        ),
      ),
    );
  }
}

/// Empty state display
class _EmptyState extends StatelessWidget {
  final ThemeData theme;
  final AppSpacing spacing;

  const _EmptyState({required this.theme, required this.spacing});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.folder_open, size: 48, color: theme.colorScheme.outline),
            SizedBox(height: spacing.sm),
            Text(
              'No files attached',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// File list
class _FileList extends StatelessWidget {
  final List<FileAttachment> files;
  final bool readOnly;
  final void Function(FileAttachment)? onDownload;
  final void Function(FileAttachment)? onDelete;

  const _FileList({
    required this.files,
    required this.readOnly,
    this.onDownload,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: files.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final file = files[index];
        return FileListTile(
          file: file,
          onDownload: onDownload != null ? () => onDownload!(file) : null,
          onDelete: (!readOnly && onDelete != null)
              ? () => onDelete!(file)
              : null,
        );
      },
    );
  }
}

// =============================================================================
// FILE LIST TILE - Reusable, exported for other uses
// =============================================================================

/// Individual file list tile with icon, metadata, and actions
class FileListTile extends StatelessWidget {
  final FileAttachment file;
  final VoidCallback? onDownload;
  final VoidCallback? onDelete;

  const FileListTile({
    super.key,
    required this.file,
    this.onDownload,
    this.onDelete,
  });

  IconData get _icon {
    if (file.isImage) return Icons.image;
    if (file.isPdf) return Icons.picture_as_pdf;
    switch (file.extension) {
      case 'txt':
        return Icons.text_snippet;
      case 'csv':
        return Icons.table_chart;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color get _iconColor {
    if (file.isImage) return Colors.blue;
    if (file.isPdf) return Colors.red;
    return Colors.grey;
  }

  void _showPreviewModal(BuildContext context) {
    FilePreviewModal.show(context: context, file: file, onDownload: onDownload);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: () => _showPreviewModal(context),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(_icon, color: _iconColor),
      ),
      title: Text(file.originalFilename, overflow: TextOverflow.ellipsis),
      subtitle: Text(
        '${file.fileSizeFormatted} • ${StringHelper.snakeToTitle(file.category)}',
        style: TextStyle(fontSize: 12, color: theme.colorScheme.outline),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (onDownload != null)
            IconButton(
              icon: const Icon(Icons.download),
              tooltip: 'Download',
              onPressed: onDownload,
            ),
          if (onDelete != null)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Delete',
              color: Colors.red,
              onPressed: onDelete,
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// FILE PREVIEW MODAL - Shows file preview + metadata
// =============================================================================

/// Modal for previewing file attachments
///
/// Supports:
/// - Images (jpg, png, gif, webp, svg) - displays inline
/// - PDFs - uses browser's native PDF viewer via iframe
/// - Text (txt, csv) - displays as selectable text
/// - Other formats - shows "preview not available" with download option
class FilePreviewModal {
  FilePreviewModal._();

  /// Show the preview modal for a file
  static Future<void> show({
    required BuildContext context,
    required FileAttachment file,
    VoidCallback? onDownload,
  }) {
    return GenericModal.show(
      context: context,
      title: file.originalFilename,
      width: file.isImage || file.isPdf ? 800 : 600,
      maxHeight: MediaQuery.of(context).size.height * 0.9,
      content: _FilePreviewContent(file: file, onDownload: onDownload),
    );
  }
}

/// Content widget for file preview modal
class _FilePreviewContent extends StatelessWidget {
  final FileAttachment file;
  final VoidCallback? onDownload;

  const _FilePreviewContent({required this.file, this.onDownload});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Preview area
        _buildPreview(context, theme, spacing),

        SizedBox(height: spacing.lg),

        // Metadata section
        _buildMetadata(theme),

        SizedBox(height: spacing.md),

        // Download button
        if (onDownload != null)
          ElevatedButton.icon(
            onPressed: onDownload,
            icon: const Icon(Icons.download),
            label: const Text('Download'),
          ),
      ],
    );
  }

  Widget _buildPreview(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    if (file.isImage) {
      return _ImagePreview(file: file, theme: theme, spacing: spacing);
    } else if (file.isPdf) {
      // Uses PdfPreviewWidget from conditional import (web vs non-web)
      return PdfPreviewWidget(downloadUrl: file.downloadUrl, fileId: file.id);
    } else if (_isTextFile) {
      return _TextPreview(file: file, theme: theme, spacing: spacing);
    } else {
      return _UnsupportedPreview(file: file, theme: theme, spacing: spacing);
    }
  }

  bool get _isTextFile {
    final ext = file.extension.toLowerCase();
    return ext == 'txt' || ext == 'csv' || file.mimeType.startsWith('text/');
  }

  Widget _buildMetadata(ThemeData theme) {
    return KeyValueList(
      dense: true,
      items: [
        KeyValueItem.text(
          label: 'File Name',
          value: file.originalFilename,
          icon: Icons.insert_drive_file,
        ),
        KeyValueItem.text(
          label: 'Size',
          value: file.fileSizeFormatted,
          icon: Icons.data_usage,
        ),
        KeyValueItem.text(
          label: 'Type',
          value: file.mimeType,
          icon: Icons.description,
        ),
        KeyValueItem.text(
          label: 'Category',
          value: StringHelper.snakeToTitle(file.category),
          icon: Icons.category,
        ),
        KeyValueItem.text(
          label: 'Uploaded',
          value: DateTimeHelpers.formatTimestamp(file.createdAt),
          icon: Icons.calendar_today,
        ),
        if (file.description != null && file.description!.isNotEmpty)
          KeyValueItem.text(
            label: 'Description',
            value: file.description!,
            icon: Icons.notes,
          ),
      ],
    );
  }
}

// =============================================================================
// PREVIEW WIDGETS BY TYPE
// =============================================================================

/// Image preview - uses Image.network
class _ImagePreview extends StatelessWidget {
  final FileAttachment file;
  final ThemeData theme;
  final AppSpacing spacing;

  const _ImagePreview({
    required this.file,
    required this.theme,
    required this.spacing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 400),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          file.downloadUrl,
          fit: BoxFit.contain,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return SizedBox(
              height: 200,
              child: Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                            loadingProgress.expectedTotalBytes!
                      : null,
                ),
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            return _PreviewError(
              message: 'Failed to load image',
              theme: theme,
              spacing: spacing,
            );
          },
        ),
      ),
    );
  }
}

/// Text file preview - shows download prompt
class _TextPreview extends StatelessWidget {
  final FileAttachment file;
  final ThemeData theme;
  final AppSpacing spacing;

  const _TextPreview({
    required this.file,
    required this.theme,
    required this.spacing,
  });

  @override
  Widget build(BuildContext context) {
    // For text files, we show a message to download since fetching
    // requires async and we want to keep this simple
    return Container(
      constraints: const BoxConstraints(maxHeight: 300),
      padding: EdgeInsets.all(spacing.md),
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
          Icon(Icons.text_snippet, size: 48, color: theme.colorScheme.primary),
          SizedBox(height: spacing.md),
          Text('Text File', style: theme.textTheme.titleMedium),
          SizedBox(height: spacing.sm),
          Text(
            'Click download to view the contents of this text file.',
            textAlign: TextAlign.center,
            style: TextStyle(color: theme.colorScheme.outline),
          ),
        ],
      ),
    );
  }
}

/// Unsupported format preview
class _UnsupportedPreview extends StatelessWidget {
  final FileAttachment file;
  final ThemeData theme;
  final AppSpacing spacing;

  const _UnsupportedPreview({
    required this.file,
    required this.theme,
    required this.spacing,
  });

  @override
  Widget build(BuildContext context) {
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
            Icons.visibility_off,
            size: 48,
            color: theme.colorScheme.outline,
          ),
          SizedBox(height: spacing.md),
          Text('Preview Not Available', style: theme.textTheme.titleMedium),
          SizedBox(height: spacing.sm),
          Text(
            'This file format (${file.extension.toUpperCase()}) cannot be previewed in the browser.\nPlease download the file to view its contents.',
            textAlign: TextAlign.center,
            style: TextStyle(color: theme.colorScheme.outline),
          ),
        ],
      ),
    );
  }
}

/// Error display for preview failures
class _PreviewError extends StatelessWidget {
  final String message;
  final ThemeData theme;
  final AppSpacing spacing;

  const _PreviewError({
    required this.message,
    required this.theme,
    required this.spacing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(spacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.broken_image, size: 48, color: theme.colorScheme.error),
          SizedBox(height: spacing.sm),
          Text(message, style: TextStyle(color: theme.colorScheme.error)),
        ],
      ),
    );
  }
}
