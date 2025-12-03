/// Table Filter Service - Centralized filtering logic for tables
///
/// **SOLE RESPONSIBILITY:** Provide generic filtering functions
/// - Filter any list by search query
/// - Generic field extraction
/// - Zero UI, pure business logic
library;

import '../utils/helpers/string_helper.dart';

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
}
