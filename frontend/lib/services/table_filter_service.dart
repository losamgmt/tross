/// Table Filter Service - Centralized filtering logic for tables
///
/// **SOLE RESPONSIBILITY:** Provide generic filtering functions
/// - Filter any list by search query
/// - Generic field extraction
/// - Metadata-driven filtering
/// - Zero UI, pure business logic
library;

import '../utils/helpers/string_helper.dart';
import 'entity_metadata.dart';

/// Generic table filter service
class TableFilterService {
  /// Filter a list by search query across multiple fields
  ///
  /// Usage:
  /// ```dart
  /// final filtered = TableFilterService.filter<User>(
  ///   users,
  ///   query: 'john',
  ///   fieldExtractors: [
  ///     (user) => user.fullName,
  ///     (user) => user.email,
  ///     (user) => user.role,
  ///   ],
  /// );
  /// ```
  static List<T> filter<T>({
    required List<T> items,
    required String query,
    required List<String Function(T)> fieldExtractors,
  }) {
    if (query.isEmpty) return items;

    final lowerQuery = StringHelper.toLowerCase(query);

    return items.where((item) {
      return fieldExtractors.any((extractor) {
        final fieldValue = extractor(item);
        return StringHelper.toLowerCase(fieldValue).contains(lowerQuery);
      });
    }).toList();
  }

  /// Filter users by search query (name, email, role)
  static List<T> filterByFields<T>({
    required List<T> items,
    required String query,
    required List<String> Function(T) getSearchableFields,
  }) {
    if (query.isEmpty) return items;

    final lowerQuery = StringHelper.toLowerCase(query);

    return items.where((item) {
      final fields = getSearchableFields(item);
      return fields.any(
        (field) => StringHelper.toLowerCase(field).contains(lowerQuery),
      );
    }).toList();
  }

  /// Metadata-driven filter for generic Map entities
  ///
  /// Uses searchableFields from entity metadata to determine which fields to search.
  /// Works with `Map<String, dynamic>` data (generic entities).
  ///
  /// Usage:
  /// ```dart
  /// final filtered = TableFilterService.filterByMetadata(
  ///   entityName: 'user',
  ///   items: users,
  ///   query: 'john',
  /// );
  /// ```
  static List<Map<String, dynamic>> filterByMetadata({
    required String entityName,
    required List<Map<String, dynamic>> items,
    required String query,
  }) {
    if (query.isEmpty) return items;

    final metadata = EntityMetadataRegistry.get(entityName);
    final searchableFields = metadata.searchableFields;

    if (searchableFields.isEmpty) {
      // Fallback: search all string fields
      return _filterAllStringFields(items, query);
    }

    final lowerQuery = StringHelper.toLowerCase(query);

    return items.where((item) {
      return searchableFields.any((fieldName) {
        final value = item[fieldName];
        if (value == null) return false;
        return StringHelper.toLowerCase(value.toString()).contains(lowerQuery);
      });
    }).toList();
  }

  /// Fallback: search all string-valued fields
  static List<Map<String, dynamic>> _filterAllStringFields(
    List<Map<String, dynamic>> items,
    String query,
  ) {
    final lowerQuery = StringHelper.toLowerCase(query);

    return items.where((item) {
      return item.values.any((value) {
        if (value == null) return false;
        if (value is String) {
          return StringHelper.toLowerCase(value).contains(lowerQuery);
        }
        return false;
      });
    }).toList();
  }

  /// Get searchable field names for an entity
  ///
  /// Useful for displaying "Search by: name, email, ..." hints
  static List<String> getSearchableFieldNames(String entityName) {
    final metadata = EntityMetadataRegistry.get(entityName);
    return metadata.searchableFields;
  }

  /// Get search placeholder text for an entity
  ///
  /// Returns something like: "Search by name, email, company..."
  static String getSearchPlaceholder(String entityName) {
    final fields = getSearchableFieldNames(entityName);
    if (fields.isEmpty) return 'Search...';

    final displayFields = fields
        .take(3)
        .map((f) => f.replaceAll('_', ' '))
        .toList();
    final suffix = fields.length > 3 ? '...' : '';
    return 'Search by ${displayFields.join(', ')}$suffix';
  }
}
