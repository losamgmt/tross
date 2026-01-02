/// Metadata Services - Barrel export
///
/// Unified access to admin metadata (permissions, validation, entity config)
///
/// USAGE:
/// ```dart
/// import 'package:tross_app/services/metadata/metadata.dart';
///
/// final provider = JsonMetadataProvider();
/// final matrix = await provider.getPermissionMatrix('users');
/// ```
library;

export 'metadata_types.dart';
export 'metadata_provider.dart';
export 'json_metadata_provider.dart';
