/// Centralized Helpers Library
///
/// Single source of truth for ALL frontend helper functions.
/// Components import ONLY from this barrel - never implement helpers inline.
///
/// Architectural Principle: STRICT SEPARATION OF CONCERNS
/// - Components (atoms/molecules/organisms) = pure composition/rendering
/// - Helpers (this library) = pure data transformation
/// - Services (lib/services/) = business logic & API calls
///
/// Usage:
/// ```dart
/// import 'package:tross_app/utils/helpers/helpers.dart';
///
/// // Use centralized helpers instead of inline logic
/// final formatted = DateTimeHelpers.formatDate(date);
/// final capitalized = StringHelpers.capitalize(text);
/// ```
library;

// Export all helper modules
export 'color_helpers.dart';
export 'date_time_helpers.dart';
export 'input_type_helpers.dart';
export 'number_helpers.dart';
export 'string_helper.dart'; // Fixed: was exporting non-existent string_helpers.dart

// ui_helpers.dart deleted - replaced by NotificationService + SnackBar atoms
