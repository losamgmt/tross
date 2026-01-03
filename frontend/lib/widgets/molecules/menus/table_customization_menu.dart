/// TableCustomizationMenu - Dropdown menu for table customization
///
/// Provides UI controls for:
/// - Column visibility (show/hide columns)
/// - Table density (compact/standard/comfortable)
/// - Saved views (save/load table configurations)
///
/// ARCHITECTURE COMPLIANCE:
/// - Receives data from parent (no service calls)
/// - Exposes callbacks for actions (parent handles logic)
/// - Pure presentation + composition of sub-widgets
///
/// USAGE:
/// ```dart
/// TableCustomizationMenu(
///   columns: tableColumns,
///   hiddenColumnIds: currentHidden,
///   density: currentDensity,
///   savedViews: loadedViews,         // From parent
///   savedViewsLoading: isLoading,    // From parent
///   onHiddenColumnsChanged: (ids) => controller.setHiddenColumns(ids),
///   onDensityChanged: (d) => controller.setDensity(d),
///   onSaveView: (name) => controller.saveView(name),
///   onLoadView: (settings) => controller.loadView(settings),
///   onDeleteView: (view) => controller.deleteView(view),
///   onRefreshViews: () => controller.loadViews(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/table_config.dart';
import '../../../config/table_column.dart';
import '../../../models/saved_view.dart';

// =============================================================================
// MAIN WIDGET - Pure presentation, data received from parent
// =============================================================================

/// Table customization menu button with popover
///
/// NOTE: This widget does NOT fetch data. Parent provides:
/// - [savedViews]: List of saved views (null while loading)
/// - [savedViewsLoading]: Whether views are loading
/// - [onSaveView], [onLoadView], [onDeleteView]: Action callbacks
class TableCustomizationMenu<T> extends StatelessWidget {
  /// Available columns
  final List<TableColumn<T>> columns;

  /// Currently hidden column IDs
  final Set<String> hiddenColumnIds;

  /// Current density
  final TableDensity density;

  /// Called when hidden columns change
  final ValueChanged<Set<String>> onHiddenColumnsChanged;

  /// Called when density changes
  final ValueChanged<TableDensity> onDensityChanged;

  /// Entity name for saved views (optional - hides saved views if null)
  final String? entityName;

  /// Saved views from parent (null = loading)
  final List<SavedView>? savedViews;

  /// Whether saved views are loading
  final bool savedViewsLoading;

  /// Called when user saves current view
  final void Function(String viewName)? onSaveView;

  /// Called when user loads a view
  final void Function(SavedViewSettings)? onLoadView;

  /// Called when user deletes a view
  final void Function(SavedView)? onDeleteView;

  /// Called to refresh saved views
  final VoidCallback? onRefreshViews;

  const TableCustomizationMenu({
    super.key,
    required this.columns,
    required this.hiddenColumnIds,
    required this.density,
    required this.onHiddenColumnsChanged,
    required this.onDensityChanged,
    this.entityName,
    this.savedViews,
    this.savedViewsLoading = false,
    this.onSaveView,
    this.onLoadView,
    this.onDeleteView,
    this.onRefreshViews,
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
        // Density section
        ..._buildDensitySection(context, theme),

        const PopupMenuDivider(),

        // Columns section
        ..._buildColumnsSection(context, theme),

        // Saved views section (only if entityName provided)
        if (entityName != null) ..._buildSavedViewsSection(context, theme),
      ],
    );
  }

  List<PopupMenuEntry<void>> _buildDensitySection(
    BuildContext context,
    ThemeData theme,
  ) {
    return [
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
    ];
  }

  List<PopupMenuEntry<void>> _buildColumnsSection(
    BuildContext context,
    ThemeData theme,
  ) {
    return [
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
                    ? theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5)
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
    ];
  }

  List<PopupMenuEntry<void>> _buildSavedViewsSection(
    BuildContext context,
    ThemeData theme,
  ) {
    return [
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
            const Expanded(
              child: Text(
                'Save current view...',
                overflow: TextOverflow.ellipsis,
              ),
            ),
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
            const Expanded(
              child: Text(
                'Load saved view...',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    ];
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
          onSubmitted: (_) {
            if (controller.text.trim().isNotEmpty) {
              Navigator.of(ctx).pop();
              onSaveView?.call(controller.text.trim());
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.of(ctx).pop();
                onSaveView?.call(controller.text.trim());
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showLoadViewDialog(BuildContext context) {
    // Trigger refresh when dialog opens
    onRefreshViews?.call();

    showDialog<void>(
      context: context,
      builder: (ctx) => LoadViewDialog(
        views: savedViews,
        loading: savedViewsLoading,
        onLoad: (settings) {
          Navigator.of(ctx).pop();
          onLoadView?.call(settings);
        },
        onDelete: onDeleteView,
      ),
    );
  }
}

// =============================================================================
// LOAD VIEW DIALOG - Pure presentation, data received from parent
// =============================================================================

/// Dialog for loading a saved view
///
/// NOTE: This widget does NOT fetch data. Parent provides:
/// - [views]: List of saved views (null while loading)
/// - [loading]: Whether data is loading
/// - [onLoad], [onDelete]: Action callbacks
class LoadViewDialog extends StatelessWidget {
  final List<SavedView>? views;
  final bool loading;
  final void Function(SavedViewSettings) onLoad;
  final void Function(SavedView)? onDelete;

  const LoadViewDialog({
    super.key,
    this.views,
    this.loading = false,
    required this.onLoad,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Load View'),
      content: SizedBox(
        width: 300,
        height: 300,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : views == null || views!.isEmpty
            ? _EmptyViewsState(theme: theme)
            : _ViewsList(views: views!, onLoad: onLoad, onDelete: onDelete),
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

/// Empty state when no saved views exist
class _EmptyViewsState extends StatelessWidget {
  final ThemeData theme;

  const _EmptyViewsState({required this.theme});

  @override
  Widget build(BuildContext context) {
    return Center(
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
    );
  }
}

/// List of saved views
class _ViewsList extends StatelessWidget {
  final List<SavedView> views;
  final void Function(SavedViewSettings) onLoad;
  final void Function(SavedView)? onDelete;

  const _ViewsList({required this.views, required this.onLoad, this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView.builder(
      itemCount: views.length,
      itemBuilder: (context, index) {
        final view = views[index];
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
          trailing: onDelete != null
              ? IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => onDelete!(view),
                  tooltip: 'Delete view',
                )
              : null,
          onTap: () => onLoad(view.settings),
        );
      },
    );
  }
}
