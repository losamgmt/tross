/// TableColumn - Configuration for a table column
///
/// Defines how a column should be displayed and sorted
/// Generic type T represents the data model
library;

import 'package:flutter/material.dart';

class TableColumn<T> {
  /// Column identifier (for sorting)
  final String id;

  /// Display header label
  final String label;

  /// Column width (null = flexible)
  final double? width;

  /// Is this column sortable?
  final bool sortable;

  /// Text alignment
  final TextAlign alignment;

  /// Build cell widget from data
  final Widget Function(T item) cellBuilder;

  /// Compare function for sorting (required if sortable)
  final int Function(T a, T b)? comparator;

  const TableColumn({
    required this.id,
    required this.label,
    required this.cellBuilder,
    this.width,
    this.sortable = false,
    this.alignment = TextAlign.left,
    this.comparator,
  }) : assert(
         !sortable || comparator != null,
         'Sortable columns must provide a comparator',
       );

  /// Factory for simple text columns
  factory TableColumn.text({
    required String id,
    required String label,
    required String Function(T item) getText,
    double? width,
    bool sortable = false,
    TextAlign alignment = TextAlign.left,
  }) {
    return TableColumn<T>(
      id: id,
      label: label,
      width: width,
      sortable: sortable,
      alignment: alignment,
      cellBuilder: (item) => Text(
        getText(item),
        textAlign: alignment,
        overflow: TextOverflow.ellipsis,
      ),
      comparator: sortable ? (a, b) => getText(a).compareTo(getText(b)) : null,
    );
  }
}
