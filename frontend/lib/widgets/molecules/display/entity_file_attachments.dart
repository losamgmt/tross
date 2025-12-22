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
import '../../../services/file_service.dart';
import '../../../utils/helpers/string_helper.dart';
import '../../../config/app_spacing.dart';

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
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
