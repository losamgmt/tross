/// Metadata Provider - Abstract interface for admin metadata access
///
/// SOLE RESPONSIBILITY: Define contract for accessing permissions/validation metadata
///
/// This abstraction allows swapping data sources:
/// - JsonMetadataProvider: Reads from assets/config/*.json
/// - ApiMetadataProvider: (Future) Reads from /api/admin/system/config/*
///
/// USAGE:
/// ```dart
/// // Inject via Provider
/// final metadata = context.read<MetadataProvider>();
///
/// // Get permission matrix for display
/// final matrix = await metadata.getPermissionMatrix('users');
///
/// // Get validation rules for display
/// final rules = await metadata.getValidationRules('email');
/// ```
library;

import 'metadata_types.dart';

/// Abstract interface for metadata access
///
/// Implementations must be stateless or manage their own caching
abstract class MetadataProvider {
  /// Whether this provider allows editing metadata
  ///
  /// - false for JSON (read-only asset files)
  /// - true for API (can PUT to update)
  bool get isEditable;

  /// Provider name for debugging
  String get providerName;

  // ===========================================================================
  // Permission Metadata
  // ===========================================================================

  /// Get list of all role names
  Future<List<String>> getRoles();

  /// Get role summaries with priority and description
  Future<List<RoleSummary>> getRoleSummaries();

  /// Get list of all resource (entity) names with permissions defined
  Future<List<String>> getResources();

  /// Get resource summaries with description and operations
  Future<List<ResourceSummary>> getResourceSummaries();

  /// Get permission matrix for a specific resource
  ///
  /// Returns role × operation grid showing who can do what
  Future<PermissionMatrix?> getPermissionMatrix(String resource);

  /// Get permission matrices for all resources
  Future<Map<String, PermissionMatrix>> getAllPermissionMatrices();

  /// Get raw permissions config (for admin display)
  Future<Map<String, dynamic>> getRawPermissions();

  // ===========================================================================
  // Validation Metadata
  // ===========================================================================

  /// Get list of all field names with validation rules
  Future<List<String>> getValidationFields();

  /// Get validation rules for a specific field
  Future<FieldValidation?> getFieldValidation(String fieldName);

  /// Get all validation rules grouped by field
  Future<Map<String, FieldValidation>> getAllFieldValidations();

  /// Get raw validation config (for admin display)
  Future<Map<String, dynamic>> getRawValidation();

  // ===========================================================================
  // Entity Metadata
  // ===========================================================================

  /// Get list of all entity names
  Future<List<String>> getEntityNames();

  /// Get raw entity metadata (for admin display)
  Future<Map<String, dynamic>> getRawEntityMetadata();

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /// Clear any cached data and force reload on next access
  void clearCache();

  /// Reload all data from source
  Future<void> reload();
}
