/// TableCustomizationMenu - Dropdown menu for table customization
///
/// Provides UI controls for:
/// - Column visibility (show/hide columns)
/// - Table density (compact/standard/comfortable)
///
/// All state is session-only (not persisted).
library;

import 'package:flutter/material.dart';
import '../../../config/table_config.dart';
import '../../../config/table_column.dart';

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

  const TableCustomizationMenu({
    super.key,
    required this.columns,
    required this.hiddenColumnIds,
    required this.density,
    required this.onHiddenColumnsChanged,
    required this.onDensityChanged,
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
      ],
    );
  }
}
