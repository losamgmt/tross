/// TableCustomizationMenu - Dropdown menu for table customization
///
/// Provides UI controls for:
/// - Column visibility (show/hide columns)
/// - Table density (compact/standard/comfortable)
/// - Saved views (save/load table configurations)
///
/// All state is session-only unless explicitly saved.
library;

import 'package:flutter/material.dart';
import '../../../config/table_config.dart';
import '../../../config/table_column.dart';
import '../../../services/saved_view_service.dart';
import '../../../services/error_service.dart';

/// Column visibility state
class ColumnVisibility {
  final String id;
  final String label;
  final bool visible;

  const ColumnVisibility({
    required this.id,
    required this.label,
    this.visible = true,
  });

  ColumnVisibility copyWith({bool? visible}) {
    return ColumnVisibility(
      id: id,
      label: label,
      visible: visible ?? this.visible,
    );
  }
}

/// Table customization menu button with popover
class TableCustomizationMenu<T> extends StatelessWidget {
  final List<TableColumn<T>> columns;
  final Set<String> hiddenColumnIds;
  final TableDensity density;
  final ValueChanged<Set<String>> onHiddenColumnsChanged;
  final ValueChanged<TableDensity> onDensityChanged;

  /// Entity name for saved views (optional - hides saved views if null)
  final String? entityName;

  /// Callback when a saved view is loaded
  final void Function(SavedViewSettings)? onLoadView;

  const TableCustomizationMenu({
    super.key,
    required this.columns,
    required this.hiddenColumnIds,
    required this.density,
    required this.onHiddenColumnsChanged,
    required this.onDensityChanged,
    this.entityName,
    this.onLoadView,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PopupMenuButton<void>(
      icon: Icon(Icons.tune, color: theme.colorScheme.onSurfaceVariant),
      tooltip: 'Customize table',
      position: PopupMenuPosition.under,
      constraints: const BoxConstraints(minWidth: 220, maxWidth: 280),
      itemBuilder: (context) => [
        // Density section header
        PopupMenuItem<void>(
          enabled: false,
          height: 32,
          child: Text(
            'DENSITY',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
        // Density options
        ...TableDensity.values.map(
          (d) => PopupMenuItem<void>(
            onTap: () => onDensityChanged(d),
            height: 40,
            child: Row(
              children: [
                Icon(
                  density == d
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
                  size: 18,
                  color: density == d
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Text(d.label),
              ],
            ),
          ),
        ),

        const PopupMenuDivider(),

        // Columns section header
        PopupMenuItem<void>(
          enabled: false,
          height: 32,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'COLUMNS',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onHiddenColumnsChanged({});
                },
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Show all',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Column visibility toggles
        ...columns.map((col) {
          final isHidden = hiddenColumnIds.contains(col.id);
          return PopupMenuItem<void>(
            onTap: () {
              final newHidden = Set<String>.from(hiddenColumnIds);
              if (isHidden) {
                newHidden.remove(col.id);
              } else {
                newHidden.add(col.id);
              }
              onHiddenColumnsChanged(newHidden);
            },
            height: 40,
            child: Row(
              children: [
                Icon(
                  isHidden
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 18,
                  color: isHidden
                      ? theme.colorScheme.onSurfaceVariant.withValues(
                          alpha: 0.5,
                        )
                      : theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    col.label,
                    style: TextStyle(
                      color: isHidden
                          ? theme.colorScheme.onSurface.withValues(alpha: 0.5)
                          : null,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),

        // Saved views section (only if entityName provided)
        if (entityName != null) ...[
          const PopupMenuDivider(),
          PopupMenuItem<void>(
            enabled: false,
            height: 32,
            child: Text(
              'SAVED VIEWS',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
          PopupMenuItem<void>(
            onTap: () => _showSaveViewDialog(context),
            height: 40,
            child: Row(
              children: [
                Icon(
                  Icons.save_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                const Text('Save current view...'),
              ],
            ),
          ),
          PopupMenuItem<void>(
            onTap: () => _showLoadViewDialog(context),
            height: 40,
            child: Row(
              children: [
                Icon(
                  Icons.folder_open_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                const Text('Load saved view...'),
              ],
            ),
          ),
        ],
      ],
    );
  }

  void _showSaveViewDialog(BuildContext context) {
    final controller = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Save View'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'View name',
            hintText: 'e.g., My Pending Orders',
          ),
          onSubmitted: (_) => _saveView(ctx, controller.text),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => _saveView(ctx, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveView(BuildContext context, String viewName) async {
    if (viewName.trim().isEmpty) return;

    Navigator.of(context).pop();

    try {
      await SavedViewService.create(
        entityName: entityName!,
        viewName: viewName.trim(),
        settings: SavedViewSettings(
          hiddenColumns: hiddenColumnIds.toList(),
          density: density.name,
        ),
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('View "$viewName" saved'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      ErrorService.logError('Failed to save view', error: e);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to save view: ${e.toString().replaceFirst("Exception: ", "")}',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _showLoadViewDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => _LoadViewDialog(
        entityName: entityName!,
        onLoad: (settings) {
          Navigator.of(ctx).pop();
          onLoadView?.call(settings);
        },
      ),
    );
  }
}

/// Dialog for loading a saved view
class _LoadViewDialog extends StatefulWidget {
  final String entityName;
  final void Function(SavedViewSettings) onLoad;

  const _LoadViewDialog({required this.entityName, required this.onLoad});

  @override
  State<_LoadViewDialog> createState() => _LoadViewDialogState();
}

class _LoadViewDialogState extends State<_LoadViewDialog> {
  List<SavedView>? _views;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadViews();
  }

  Future<void> _loadViews() async {
    try {
      final views = await SavedViewService.getForEntity(widget.entityName);
      if (mounted) {
        setState(() {
          _views = views;
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

  Future<void> _deleteView(SavedView view) async {
    try {
      await SavedViewService.delete(view.id);
      _loadViews(); // Refresh list
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('View "${view.viewName}" deleted'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete view'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Load View'),
      content: SizedBox(
        width: 300,
        height: 300,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? Center(child: Text('Error: $_error'))
            : _views == null || _views!.isEmpty
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.bookmark_border,
                      size: 48,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 16),
                    Text('No saved views', style: theme.textTheme.bodyLarge),
                    const SizedBox(height: 8),
                    Text(
                      'Save your current view to access it later',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                itemCount: _views!.length,
                itemBuilder: (context, index) {
                  final view = _views![index];
                  return ListTile(
                    leading: Icon(
                      view.isDefault ? Icons.star : Icons.bookmark_outline,
                      color: view.isDefault ? theme.colorScheme.primary : null,
                    ),
                    title: Text(view.viewName),
                    subtitle: Text(
                      '${view.settings.hiddenColumns.length} hidden columns',
                      style: theme.textTheme.bodySmall,
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => _deleteView(view),
                      tooltip: 'Delete view',
                    ),
                    onTap: () => widget.onLoad(view.settings),
                  );
                },
              ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
