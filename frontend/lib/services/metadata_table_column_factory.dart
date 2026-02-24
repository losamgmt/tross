/// Metadata Table Column Factory
///
/// **SOLE RESPONSIBILITY:** Generate table columns from entity metadata
///
/// Generates `List<TableColumn<Map<String, dynamic>>>` for any entity
/// based on its metadata configuration. Works with generic Map data.
///
/// USAGE:
/// ```dart
/// // Get columns for any entity
/// final columns = MetadataTableColumnFactory.forEntity(
///   'customer',
///   onEntityUpdated: () => loadCustomers(),
/// );
///
/// // Use with GenericDataTable
/// GenericDataTable<Map<String, dynamic>>(
///   columns: columns,
///   items: customers,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/table_column.dart';
import '../utils/helpers/string_helper.dart';
import '../utils/table_cell_builders.dart';
import '../widgets/atoms/cells/foreign_key_lookup_cell.dart';
import '../widgets/atoms/indicators/app_badge.dart';
import 'entity_metadata.dart';
import 'generic_entity_service.dart';

/// Factory for generating table columns from entity metadata
class MetadataTableColumnFactory {
  MetadataTableColumnFactory._();

  /// Generate table columns for an entity
  ///
  /// [context] - BuildContext for accessing Provider
  /// [entityName] - Name of the entity (e.g., 'customer', 'work_order')
  /// [onEntityUpdated] - Callback when an entity is updated in the table
  /// [visibleFields] - Optional list of fields to show. If null, shows defaults.
  /// [customBuilders] - Optional custom cell builders for specific fields
  static List<TableColumn<Map<String, dynamic>>> forEntity(
    BuildContext context,
    String entityName, {
    VoidCallback? onEntityUpdated,
    List<String>? visibleFields,
    Map<String, Widget Function(Map<String, dynamic>)>? customBuilders,
  }) {
    final metadata = EntityMetadataRegistry.get(entityName);
    final fields = visibleFields ?? _getDefaultVisibleFields(metadata);
    final entityService = context.read<GenericEntityService>();

    return fields
        .where((field) => metadata.fields.containsKey(field))
        .map(
          (field) => _buildColumn(
            metadata,
            field,
            entityService: entityService,
            onEntityUpdated: onEntityUpdated,
            customBuilder: customBuilders?[field],
          ),
        )
        .toList();
  }

  /// Get default visible fields for an entity
  ///
  /// Uses displayColumns from metadata if configured, otherwise shows all
  /// non-system fields. Tables can further filter via visibleFields param.
  static List<String> _getDefaultVisibleFields(EntityMetadata metadata) {
    // Use explicit displayColumns if configured
    if (metadata.displayColumns?.isNotEmpty ?? false) {
      return metadata.displayColumns!;
    }
    // Fallback: all fields minus system fields
    final systemFields = {'id', 'created_at', 'updated_at'};
    return metadata.fields.keys
        .where((f) => !systemFields.contains(f))
        .toList();
  }

  /// Build a single table column for a field
  static TableColumn<Map<String, dynamic>> _buildColumn(
    EntityMetadata metadata,
    String fieldName, {
    required GenericEntityService entityService,
    VoidCallback? onEntityUpdated,
    Widget Function(Map<String, dynamic>)? customBuilder,
  }) {
    final fieldDef = metadata.fields[fieldName];
    final isSortable = metadata.sortableFields.contains(fieldName);

    return TableColumn<Map<String, dynamic>>(
      id: fieldName,
      label: _fieldToLabel(fieldName, metadata),
      sortable: isSortable,
      width: _getColumnWidth(fieldDef?.type, fieldName),
      cellBuilder:
          customBuilder ??
          (item) => _buildCell(
            metadata,
            fieldName,
            item,
            entityService: entityService,
            onEntityUpdated: onEntityUpdated,
          ),
      comparator: isSortable ? _getComparator(fieldDef?.type, fieldName) : null,
    );
  }

  /// Convert field name to display label
  ///
  /// Uses fieldAliases from metadata if configured, otherwise generates
  /// from field name: 'first_name' -> 'First Name'
  static String _fieldToLabel(String fieldName, EntityMetadata metadata) {
    // Use explicit alias if configured
    final alias = metadata.fieldAliases?[fieldName];
    if (alias != null) return alias;

    // Generate from field name
    return _snakeToTitleCase(fieldName);
  }

  /// Convert snake_case to Title Case
  /// Simple conversion without metadata lookup
  static String _snakeToTitleCase(String text) {
    return text
        .split('_')
        .map(
          (word) => word.isEmpty
              ? ''
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }

  /// Get appropriate column width based on field type
  static double _getColumnWidth(FieldType? type, String fieldName) {
    // Special cases by field name
    if (fieldName == 'id') return 0.8;
    if (fieldName == 'email') return 2.5;
    if (fieldName.endsWith('_id')) return 2.0; // FK columns need more space
    if (fieldName == 'is_active') return 1.3;
    if (fieldName == 'status') return 1.5;

    // By field type
    return switch (type) {
      FieldType.boolean => 1.0,
      FieldType.integer => 1.0,
      FieldType.decimal => 1.2,
      FieldType.email => 2.5,
      FieldType.phone => 1.5,
      FieldType.timestamp => 1.8,
      FieldType.date => 1.5,
      FieldType.enumType => 1.5,
      FieldType.text => 3.0,
      FieldType.foreignKey => 2.0, // FK shows related entity name
      _ => 2.0,
    };
  }

  /// Build cell widget based on field type
  static Widget _buildCell(
    EntityMetadata metadata,
    String fieldName,
    Map<String, dynamic> item, {
    required GenericEntityService entityService,
    VoidCallback? onEntityUpdated,
  }) {
    final fieldDef = metadata.fields[fieldName];
    final value = item[fieldName];

    // Handle null values
    if (value == null) {
      return TableCellBuilders.textCell('—');
    }

    // Handle special fields
    if (fieldName == 'is_active' && !fieldDef!.readonly) {
      return _buildActiveToggle(
        metadata.name,
        item,
        value as bool,
        entityService,
        onEntityUpdated,
      );
    }

    // Handle by field type
    return switch (fieldDef?.type) {
      FieldType.boolean => _buildBooleanCell(value as bool),
      FieldType.email => TableCellBuilders.emailCell(value.toString()),
      FieldType.phone => TableCellBuilders.textCell(value.toString()),
      FieldType.timestamp => _buildTimestampCell(value),
      FieldType.date => _buildDateCell(value),
      // Enum fields: use badge if colors defined, plain text otherwise
      FieldType.enumType => _buildEnumCell(
        metadata.name,
        fieldName,
        value.toString(),
        fieldDef,
      ),
      FieldType.integer => TableCellBuilders.textCell(value.toString()),
      FieldType.decimal => _buildDecimalCell(value),
      FieldType.jsonb => TableCellBuilders.textCell('[JSON]'),
      FieldType.foreignKey => _buildForeignKeyCell(fieldDef!, value),
      _ => TableCellBuilders.textCell(value.toString()),
    };
  }

  /// Build is_active toggle with confirmation
  static Widget _buildActiveToggle(
    String entityName,
    Map<String, dynamic> item,
    bool value,
    GenericEntityService entityService,
    VoidCallback? onEntityUpdated,
  ) {
    final displayName = _snakeToTitleCase(entityName);
    return TableCellBuilders.editableBooleanCell<Map<String, dynamic>>(
      item: item,
      value: value,
      onUpdate: (newValue) async {
        final id = item['id'];
        if (id == null) return false;
        await entityService.update(entityName, id, {'is_active': newValue});
        return true;
      },
      onChanged: onEntityUpdated,
      fieldName: '$displayName status',
      trueAction: 'activate this $displayName',
      falseAction: 'deactivate this $displayName',
    );
  }

  /// Build boolean cell (non-editable)
  static Widget _buildBooleanCell(bool value) {
    return Icon(
      value ? Icons.check_circle : Icons.cancel,
      color: value ? Colors.green : Colors.red,
      size: 20,
    );
  }

  /// Build timestamp cell
  static Widget _buildTimestampCell(dynamic value) {
    if (value == null) return TableCellBuilders.textCell('—');

    DateTime? dateTime;
    if (value is String) {
      dateTime = DateTime.tryParse(value);
    } else if (value is DateTime) {
      dateTime = value;
    }

    if (dateTime == null) return TableCellBuilders.textCell(value.toString());

    // Format as "Jan 15, 2024 3:45 PM"
    final formatted =
        '${_monthAbbr(dateTime.month)} ${dateTime.day}, ${dateTime.year} '
        '${_formatTime(dateTime)}';
    return TableCellBuilders.textCell(formatted);
  }

  /// Build date cell
  static Widget _buildDateCell(dynamic value) {
    if (value == null) return TableCellBuilders.textCell('—');

    DateTime? date;
    if (value is String) {
      date = DateTime.tryParse(value);
    } else if (value is DateTime) {
      date = value;
    }

    if (date == null) return TableCellBuilders.textCell(value.toString());

    // Format as "Jan 15, 2024"
    final formatted = '${_monthAbbr(date.month)} ${date.day}, ${date.year}';
    return TableCellBuilders.textCell(formatted);
  }

  /// Build enum cell - badge if colors defined, plain text otherwise
  ///
  /// Uses metadata-driven colors from entity-metadata.json.
  /// Falls back to plain text for enums without semantic colors (e.g., state codes).
  static Widget _buildEnumCell(
    String entity,
    String field,
    String value,
    FieldDefinition? fieldDef,
  ) {
    // Check if this enum has colors defined
    final hasColors =
        fieldDef?.enumValueColors != null &&
        fieldDef!.enumValueColors!.isNotEmpty;

    if (hasColors) {
      // Use badge with metadata-driven color
      final colorName = EntityMetadataRegistry.getValueColor(
        entity,
        field,
        value,
      );
      return TableCellBuilders.statusBadgeCell(
        label: StringHelper.snakeToTitle(value),
        style: BadgeStyle.fromName(colorName),
        compact: true,
      );
    }

    // Plain text for enums without colors (state codes, etc.)
    return TableCellBuilders.textCell(StringHelper.snakeToTitle(value));
  }

  /// Build decimal cell with formatting
  static Widget _buildDecimalCell(dynamic value) {
    if (value == null) return TableCellBuilders.textCell('—');

    final numValue = value is num ? value : num.tryParse(value.toString());
    if (numValue == null) return TableCellBuilders.textCell(value.toString());

    // Format with 2 decimal places
    final formatted = numValue.toStringAsFixed(2);
    return TableCellBuilders.textCell(formatted);
  }

  /// Build foreign key cell with async lookup
  ///
  /// Uses a StatefulWidget to load and display the related entity's display field
  static Widget _buildForeignKeyCell(FieldDefinition fieldDef, dynamic value) {
    if (value == null) return TableCellBuilders.textCell('—');

    final relatedEntity = fieldDef.relatedEntity;
    final displayField = fieldDef.displayField ?? 'name';

    if (relatedEntity == null) {
      // No relationship defined, just show the ID
      return TableCellBuilders.textCell('ID: $value');
    }

    // Use async cell widget for FK lookup
    return ForeignKeyLookupCell(
      entityId: value is int ? value : int.tryParse(value.toString()) ?? 0,
      relatedEntity: relatedEntity,
      displayField: displayField,
    );
  }

  /// Get comparator function for sorting
  static int Function(Map<String, dynamic>, Map<String, dynamic>)?
  _getComparator(FieldType? type, String fieldName) {
    return (a, b) {
      final valueA = a[fieldName];
      final valueB = b[fieldName];

      // Handle nulls
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;

      // Compare by type
      return switch (type) {
        FieldType.integer ||
        FieldType.decimal => _compareNumbers(valueA, valueB),
        FieldType.boolean => _compareBooleans(valueA, valueB),
        FieldType.timestamp || FieldType.date => _compareDates(valueA, valueB),
        _ => valueA.toString().compareTo(valueB.toString()),
      };
    };
  }

  /// Compare numeric values
  static int _compareNumbers(dynamic a, dynamic b) {
    final numA = a is num ? a : num.tryParse(a.toString()) ?? 0;
    final numB = b is num ? b : num.tryParse(b.toString()) ?? 0;
    return numA.compareTo(numB);
  }

  /// Compare boolean values
  static int _compareBooleans(dynamic a, dynamic b) {
    final boolA = a == true;
    final boolB = b == true;
    return boolA == boolB
        ? 0
        : boolA
        ? -1
        : 1;
  }

  /// Compare date/timestamp values
  static int _compareDates(dynamic a, dynamic b) {
    DateTime? dateA;
    DateTime? dateB;

    if (a is String) dateA = DateTime.tryParse(a);
    if (a is DateTime) dateA = a;
    if (b is String) dateB = DateTime.tryParse(b);
    if (b is DateTime) dateB = b;

    if (dateA == null && dateB == null) return 0;
    if (dateA == null) return 1;
    if (dateB == null) return -1;
    return dateA.compareTo(dateB);
  }

  /// Month abbreviation helper
  static String _monthAbbr(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month - 1];
  }

  /// Format time as "3:45 PM"
  static String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour;
    final displayHour = hour == 0 ? 12 : hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    return '$displayHour:$minute $period';
  }
}
