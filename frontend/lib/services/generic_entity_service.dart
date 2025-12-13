/// Generic Entity Service - Metadata-driven CRUD operations
///
/// SOLE RESPONSIBILITY: Provide CRUD operations for ANY entity using metadata
///
/// NO PER-ENTITY SERVICES NEEDED. All entity operations go through this service.
/// Works with `Map<String, dynamic>` - validation is metadata-driven, not type-driven.
///
/// USAGE:
/// ```dart
/// // Fetch customers
/// final result = await GenericEntityService.getAll('customer');
/// final customers = result.data; // List<Map<String, dynamic>>
///
/// // Create a work order
/// final workOrder = await GenericEntityService.create('work_order', {
///   'title': 'Fix AC',
///   'customer_id': 42,
/// });
///
/// // Update inventory item
/// final updated = await GenericEntityService.update('inventory', 5, {
///   'quantity': 100,
/// });
///
/// // Delete invoice
/// await GenericEntityService.delete('invoice', 99);
/// ```
library;

import 'api_client.dart';
import 'error_service.dart';

/// Result of a paginated list query
class EntityListResult {
  final List<Map<String, dynamic>> data;
  final Map<String, dynamic>? pagination;
  final int count;
  final Map<String, dynamic>? appliedFilters;
  final String? timestamp;

  const EntityListResult({
    required this.data,
    this.pagination,
    required this.count,
    this.appliedFilters,
    this.timestamp,
  });

  /// Check if there are more pages
  bool get hasMore => pagination?['hasNext'] == true;

  /// Current page number
  int get page => pagination?['page'] ?? 1;

  /// Total pages
  int get totalPages => pagination?['totalPages'] ?? 1;

  /// Total items across all pages
  int get total => pagination?['total'] ?? count;
}

/// Generic Entity Service
///
/// All CRUD operations for all entities go through this service.
/// No per-entity services needed.
class GenericEntityService {
  // Private constructor - static class only
  GenericEntityService._();

  /// Fetch paginated list of entities
  ///
  /// Returns EntityListResult with data, pagination, and metadata.
  ///
  /// Example:
  /// ```dart
  /// final result = await GenericEntityService.getAll(
  ///   'customer',
  ///   page: 1,
  ///   limit: 50,
  ///   search: 'john',
  ///   sortBy: 'created_at',
  /// );
  /// for (final customer in result.data) {
  ///   print(customer['email']);
  /// }
  /// ```
  static Future<EntityListResult> getAll(
    String entityName, {
    int page = 1,
    int limit = 50,
    String? search,
    Map<String, dynamic>? filters,
    String? sortBy,
    String sortOrder = 'DESC',
  }) async {
    try {
      ErrorService.logInfo(
        '[GenericEntityService] Fetching $entityName list',
        context: {'page': page, 'limit': limit, 'search': search},
      );

      final result = await ApiClient.fetchEntities(
        entityName,
        page: page,
        limit: limit,
        search: search,
        filters: filters,
        sortBy: sortBy,
        sortOrder: sortOrder,
      );

      final data = result['data'] as List<Map<String, dynamic>>? ?? [];

      return EntityListResult(
        data: data,
        pagination: result['pagination'] as Map<String, dynamic>?,
        count: result['count'] as int? ?? data.length,
        appliedFilters: result['appliedFilters'] as Map<String, dynamic>?,
        timestamp: result['timestamp'] as String?,
      );
    } catch (e) {
      ErrorService.logError(
        '[GenericEntityService] Failed to fetch $entityName list',
        error: e,
      );
      rethrow;
    }
  }

  /// Fetch single entity by ID
  ///
  /// Example:
  /// ```dart
  /// final customer = await GenericEntityService.getById('customer', 42);
  /// print(customer['email']);
  /// ```
  static Future<Map<String, dynamic>> getById(String entityName, int id) async {
    try {
      ErrorService.logInfo('[GenericEntityService] Fetching $entityName #$id');

      return await ApiClient.fetchEntity(entityName, id);
    } catch (e) {
      ErrorService.logError(
        '[GenericEntityService] Failed to fetch $entityName #$id',
        error: e,
      );
      rethrow;
    }
  }

  /// Create new entity
  ///
  /// Returns the created entity with server-generated fields (id, timestamps).
  ///
  /// Example:
  /// ```dart
  /// final newCustomer = await GenericEntityService.create('customer', {
  ///   'email': 'new@example.com',
  ///   'first_name': 'John',
  /// });
  /// print('Created customer #${newCustomer['id']}');
  /// ```
  static Future<Map<String, dynamic>> create(
    String entityName,
    Map<String, dynamic> data,
  ) async {
    try {
      ErrorService.logInfo(
        '[GenericEntityService] Creating $entityName',
        context: {'fields': data.keys.toList()},
      );

      return await ApiClient.createEntity(entityName, data);
    } catch (e) {
      ErrorService.logError(
        '[GenericEntityService] Failed to create $entityName',
        error: e,
      );
      rethrow;
    }
  }

  /// Update existing entity (partial update)
  ///
  /// Only sends the fields included in data - does not overwrite missing fields.
  ///
  /// Example:
  /// ```dart
  /// final updated = await GenericEntityService.update('customer', 42, {
  ///   'first_name': 'Jane',
  /// });
  /// ```
  static Future<Map<String, dynamic>> update(
    String entityName,
    int id,
    Map<String, dynamic> data,
  ) async {
    try {
      ErrorService.logInfo(
        '[GenericEntityService] Updating $entityName #$id',
        context: {'fields': data.keys.toList()},
      );

      return await ApiClient.updateEntity(entityName, id, data);
    } catch (e) {
      ErrorService.logError(
        '[GenericEntityService] Failed to update $entityName #$id',
        error: e,
      );
      rethrow;
    }
  }

  /// Delete entity by ID
  ///
  /// Example:
  /// ```dart
  /// await GenericEntityService.delete('customer', 42);
  /// ```
  static Future<void> delete(String entityName, int id) async {
    try {
      ErrorService.logInfo('[GenericEntityService] Deleting $entityName #$id');

      await ApiClient.deleteEntity(entityName, id);
    } catch (e) {
      ErrorService.logError(
        '[GenericEntityService] Failed to delete $entityName #$id',
        error: e,
      );
      rethrow;
    }
  }
}
