/// ForeignKeyLookupCell - Atom for displaying foreign key relationships
///
/// Loads and displays a foreign key's related entity display name
/// with loading state and caching for performance.
///
/// USAGE:
/// ```dart
/// ForeignKeyLookupCell(
///   entityId: customerId,
///   relatedEntity: 'customer',
///   displayField: 'name',
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../services/generic_entity_service.dart';
import '../../../utils/table_cell_builders.dart';

/// Cache for foreign key lookups to avoid repeated API calls
/// Key: "entityName:id", Value: display string
final Map<String, String> _fkLookupCache = {};

/// Widget that loads and displays a foreign key's related entity display name
class ForeignKeyLookupCell extends StatefulWidget {
  final int entityId;
  final String relatedEntity;
  final String displayField;

  const ForeignKeyLookupCell({
    super.key,
    required this.entityId,
    required this.relatedEntity,
    required this.displayField,
  });

  @override
  State<ForeignKeyLookupCell> createState() => _ForeignKeyLookupCellState();
}

class _ForeignKeyLookupCellState extends State<ForeignKeyLookupCell> {
  String? _displayValue;
  bool _isLoading = true;

  String get _cacheKey => '${widget.relatedEntity}:${widget.entityId}';

  @override
  void initState() {
    super.initState();
    _loadValue();
  }

  Future<void> _loadValue() async {
    // Check cache first
    if (_fkLookupCache.containsKey(_cacheKey)) {
      if (mounted) {
        setState(() {
          _displayValue = _fkLookupCache[_cacheKey];
          _isLoading = false;
        });
      }
      return;
    }

    try {
      final entity = await GenericEntityService.getById(
        widget.relatedEntity,
        widget.entityId,
      );
      final display =
          entity[widget.displayField]?.toString() ?? 'ID: ${widget.entityId}';

      // Cache the result
      _fkLookupCache[_cacheKey] = display;

      if (mounted) {
        setState(() {
          _displayValue = display;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _displayValue = 'ID: ${widget.entityId}';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox(
        width: 80,
        child: LinearProgressIndicator(minHeight: 2),
      );
    }

    return TableCellBuilders.textCell(
      _displayValue ?? 'ID: ${widget.entityId}',
    );
  }
}
