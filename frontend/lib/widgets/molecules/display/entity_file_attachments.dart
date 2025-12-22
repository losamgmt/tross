/// Entity File Attachments - Generic file attachment display for any entity
///
/// A molecule that displays files attached to an entity with upload/download.
/// Completely generic - works with any entity_type + entity_id.
///
/// USAGE:
/// ```dart
/// EntityFileAttachments(
///   entityType: 'work_order',
///   entityId: 123,
///   allowedCategories: ['photo', 'document'], // optional filter
///   readOnly: false, // optional
/// )
/// ```
library;

import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/file_service.dart';
import '../../../utils/helpers/mime_helper.dart';
import '../../../utils/helpers/string_helper.dart';
import '../../../config/app_spacing.dart';

// =============================================================================
// MAIN WIDGET
// =============================================================================

/// Displays and manages file attachments for an entity
class EntityFileAttachments extends StatefulWidget {
  /// Entity type (work_order, customer, technician, etc.)
  final String entityType;

  /// ID of the entity
  final int entityId;

  /// Optional: only show these categories (null = show all)
  final List<String>? allowedCategories;

  /// Whether uploads/deletes are disabled
  final bool readOnly;

  /// Title to display (default: "Attachments")
  final String? title;

  /// Callback when files change (upload/delete)
  final VoidCallback? onFilesChanged;

  const EntityFileAttachments({
    super.key,
    required this.entityType,
    required this.entityId,
    this.allowedCategories,
    this.readOnly = false,
    this.title,
    this.onFilesChanged,
  });

  @override
  State<EntityFileAttachments> createState() => _EntityFileAttachmentsState();
}

class _EntityFileAttachmentsState extends State<EntityFileAttachments> {
  List<FileAttachment>? _files;
  bool _loading = true;
  String? _error;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _loadFiles();
  }

  @override
  void didUpdateWidget(EntityFileAttachments oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.entityType != widget.entityType ||
        oldWidget.entityId != widget.entityId) {
      _loadFiles();
    }
  }

  // ===========================================================================
  // DATA LOADING
  // ===========================================================================

  Future<void> _loadFiles() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final files = await FileService.listFiles(
        entityType: widget.entityType,
        entityId: widget.entityId,
      );

      // Filter by allowed categories if specified
      final filteredFiles = widget.allowedCategories != null
          ? files
                .where((f) => widget.allowedCategories!.contains(f.category))
                .toList()
          : files;

      if (mounted) {
        setState(() {
          _files = filteredFiles;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  Future<void> _handleUpload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: MimeHelper.commonUploadExtensions,
      withData: true,
    );

    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    if (file.bytes == null) {
      _showSnackBar('Could not read file', isError: true);
      return;
    }

    // Show category selection if multiple allowed
    String category = 'attachment';
    if (widget.allowedCategories != null &&
        widget.allowedCategories!.isNotEmpty) {
      final selectedCategory = await _showCategoryDialog();
      if (selectedCategory == null) return;
      category = selectedCategory;
    }

    setState(() => _uploading = true);

    try {
      await FileService.uploadFile(
        entityType: widget.entityType,
        entityId: widget.entityId,
        bytes: Uint8List.fromList(file.bytes!),
        filename: file.name,
        category: category,
      );

      widget.onFilesChanged?.call();
      await _loadFiles();
      if (mounted) _showSnackBar('File uploaded successfully');
    } catch (e) {
      _showSnackBar(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _handleDownload(FileAttachment file) async {
    try {
      final info = await FileService.getDownloadUrl(fileId: file.id);
      final uri = Uri.parse(info.downloadUrl);

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _showSnackBar('Could not open download URL', isError: true);
      }
    } catch (e) {
      _showSnackBar(e.toString(), isError: true);
    }
  }

  Future<void> _handleDelete(FileAttachment file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete File'),
        content: Text(
          'Are you sure you want to delete "${file.originalFilename}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await FileService.deleteFile(fileId: file.id);
      widget.onFilesChanged?.call();
      await _loadFiles();
      if (mounted) _showSnackBar('File deleted');
    } catch (e) {
      _showSnackBar(e.toString(), isError: true);
    }
  }

  // ===========================================================================
  // DIALOGS & FEEDBACK
  // ===========================================================================

  Future<String?> _showCategoryDialog() {
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Category'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: widget.allowedCategories!.map((category) {
            return ListTile(
              title: Text(StringHelper.snakeToTitle(category)),
              onTap: () => Navigator.of(ctx).pop(category),
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : null,
      ),
    );
  }

  // ===========================================================================
  // BUILD
  // ===========================================================================

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
            _buildHeader(theme, spacing),
            SizedBox(height: spacing.md),
            if (_loading)
              _buildLoadingState(spacing)
            else if (_error != null)
              _buildErrorState(theme, spacing)
            else if (_files == null || _files!.isEmpty)
              _buildEmptyState(theme, spacing)
            else
              _buildFileList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, AppSpacing spacing) {
    return Row(
      children: [
        Icon(Icons.attach_file, color: theme.colorScheme.primary),
        SizedBox(width: spacing.sm),
        Text(
          widget.title ?? 'Attachments',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const Spacer(),
        if (!widget.readOnly)
          _uploading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : IconButton(
                  icon: const Icon(Icons.add),
                  tooltip: 'Upload file',
                  onPressed: _handleUpload,
                ),
      ],
    );
  }

  Widget _buildLoadingState(AppSpacing spacing) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(spacing.lg),
        child: const CircularProgressIndicator(),
      ),
    );
  }

  Widget _buildErrorState(ThemeData theme, AppSpacing spacing) {
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
            TextButton(onPressed: _loadFiles, child: const Text('Try Again')),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme, AppSpacing spacing) {
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

  Widget _buildFileList() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _files!.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final file = _files![index];
        return _FileListTile(
          file: file,
          onDownload: () => _handleDownload(file),
          onDelete: widget.readOnly ? null : () => _handleDelete(file),
        );
      },
    );
  }
}

// =============================================================================
// FILE LIST TILE
// =============================================================================

/// Individual file list tile with icon, metadata, and actions
class _FileListTile extends StatelessWidget {
  final FileAttachment file;
  final VoidCallback onDownload;
  final VoidCallback? onDelete;

  const _FileListTile({
    required this.file,
    required this.onDownload,
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
