/// Core Input Validators
///
/// Lightweight validation utilities matching backend patterns.
/// Philosophy: Immediate feedback, clear error messages, consistent with API.
///
/// TWO TYPES OF VALIDATION:
/// 1. USER INPUT: Form fields, text inputs (returns String? error message)
/// 2. DATA VALIDATION: API responses, JSON parsing (throws or returns safe values)
///
/// DATA VALIDATORS (toSafe* methods):
/// - `toSafeInt()` - Extract/validate integers with range checking
/// - `toSafeDouble()` - Extract/validate floating-point numbers
/// - `toSafeString()` - Extract/validate strings with length constraints
/// - `toSafeBool()` - Extract/validate booleans from various formats
/// - `toSafeDateTime()` - Extract/validate ISO8601 timestamps
/// - `toSafeEmail()` - Extract/validate email addresses
/// - `toSafeUuid()` - Extract/validate UUID v4 identifiers
///
/// FORM VALIDATORS (returns String? for TextFormField):
/// - `required()` - Check non-empty
/// - `email()` - Validate email format
/// - `minLength()` / `maxLength()` - String length constraints
/// - `integer()` / `positive()` - Numeric format validation
/// - `integerRange()` - Range-constrained numeric validation
/// - `combine()` - Chain multiple validators
///
/// Usage:
/// ```dart
/// // Data validation (for API responses)
/// final userId = Validators.toSafeInt(json['user_id'], 'user_id', min: 1);
/// final email = Validators.toSafeEmail(json['email'], 'email');
/// final uuid = Validators.toSafeUuid(json['token'], 'token', allowNull: true);
///
/// // Form validation (for TextFormField)
/// TextFormField(
///   validator: Validators.email,
///   autovalidateMode: AutovalidateMode.onUserInteraction,
/// )
/// ```
///
/// Backend Alignment:
/// - Matches `backend/validators/type-coercion.js` behavior
/// - Consistent error messages across stack
/// - Same null handling and type coercion rules
///
/// @since 2025-11-07 - Added toSafeDouble, toSafeUuid, improved toSafeInt
library;

class Validators {
  // Private constructor to prevent instantiation
  Validators._();

  // ==========================================================================
  // DATA VALIDATION (API Responses, JSON Parsing)
  // ==========================================================================

  /// Safely extract integer from dynamic value
  ///
  /// Returns integer if valid, null if value is null/empty (when allowNull=true),
  /// throws descriptive error otherwise
  ///
  /// Matches backend toSafeInteger() behavior:
  /// - Coerces doubles to integers (3.14 → 3)
  /// - Parses strings with trimming
  /// - Validates min/max ranges
  static int? toSafeInt(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
    int? min,
    int? max,
  }) {
    // Handle null/undefined
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    // If already int, validate range
    if (value is int) {
      if (min != null && value < min) {
        throw ArgumentError('$fieldName must be at least $min (got $value)');
      }
      if (max != null && value > max) {
        throw ArgumentError('$fieldName must be at most $max (got $value)');
      }
      return value;
    }

    // Coerce double to int (matches backend parseInt behavior)
    if (value is double) {
      final intValue = value.toInt();
      if (min != null && intValue < min) {
        throw ArgumentError('$fieldName must be at least $min (got $intValue)');
      }
      if (max != null && intValue > max) {
        throw ArgumentError('$fieldName must be at most $max (got $intValue)');
      }
      return intValue;
    }

    // Try parsing from string
    if (value is String) {
      if (value.trim().isEmpty) {
        if (allowNull) return null;
        throw ArgumentError('$fieldName is required but received empty string');
      }

      final parsed = int.tryParse(value.trim());
      if (parsed == null) {
        throw ArgumentError(
          '$fieldName must be a valid integer (got "$value")',
        );
      }

      if (min != null && parsed < min) {
        throw ArgumentError('$fieldName must be at least $min (got $parsed)');
      }
      if (max != null && parsed > max) {
        throw ArgumentError('$fieldName must be at most $max (got $parsed)');
      }

      return parsed;
    }

    // Invalid type
    throw ArgumentError(
      '$fieldName must be an integer or string (got ${value.runtimeType})',
    );
  }

  /// Safely extract double from dynamic value
  ///
  /// Returns double if valid, null if value is null/empty (when allowNull=true),
  /// throws descriptive error otherwise
  ///
  /// Matches backend behavior for numeric fields
  static double? toSafeDouble(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
    double? min,
    double? max,
  }) {
    // Handle null/undefined
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    // If already double, validate range
    if (value is double) {
      if (min != null && value < min) {
        throw ArgumentError('$fieldName must be at least $min (got $value)');
      }
      if (max != null && value > max) {
        throw ArgumentError('$fieldName must be at most $max (got $value)');
      }
      return value;
    }

    // Coerce int to double
    if (value is int) {
      final doubleValue = value.toDouble();
      if (min != null && doubleValue < min) {
        throw ArgumentError(
          '$fieldName must be at least $min (got $doubleValue)',
        );
      }
      if (max != null && doubleValue > max) {
        throw ArgumentError(
          '$fieldName must be at most $max (got $doubleValue)',
        );
      }
      return doubleValue;
    }

    // Try parsing from string
    if (value is String) {
      if (value.trim().isEmpty) {
        if (allowNull) return null;
        throw ArgumentError('$fieldName is required but received empty string');
      }

      final parsed = double.tryParse(value.trim());
      if (parsed == null) {
        throw ArgumentError('$fieldName must be a valid number (got "$value")');
      }

      if (min != null && parsed < min) {
        throw ArgumentError('$fieldName must be at least $min (got $parsed)');
      }
      if (max != null && parsed > max) {
        throw ArgumentError('$fieldName must be at most $max (got $parsed)');
      }

      return parsed;
    }

    // Invalid type
    throw ArgumentError(
      '$fieldName must be a number or string (got ${value.runtimeType})',
    );
  }

  /// Safely extract string from dynamic value
  ///
  /// Returns string if valid, null if value is null/empty (when allowNull=true),
  /// throws descriptive error otherwise
  static String? toSafeString(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
    int? minLength,
    int? maxLength,
  }) {
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    final str = value.toString().trim();

    if (str.isEmpty) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received empty string');
    }

    if (minLength != null && str.length < minLength) {
      throw ArgumentError(
        '$fieldName must be at least $minLength characters (got ${str.length})',
      );
    }

    if (maxLength != null && str.length > maxLength) {
      throw ArgumentError(
        '$fieldName must be at most $maxLength characters (got ${str.length})',
      );
    }

    return str;
  }

  /// Safely extract boolean from dynamic value
  ///
  /// Returns boolean if valid, null if value is null (when allowNull=true),
  /// throws descriptive error otherwise
  static bool? toSafeBool(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
  }) {
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    if (value is bool) return value;

    if (value is String) {
      final lower = value.toLowerCase().trim();
      if (lower == 'true' || lower == '1' || lower == 'yes') return true;
      if (lower == 'false' || lower == '0' || lower == 'no') return false;

      throw ArgumentError('$fieldName must be a valid boolean (got "$value")');
    }

    if (value is int) return value != 0;

    throw ArgumentError(
      '$fieldName must be a boolean (got ${value.runtimeType})',
    );
  }

  /// Safely extract DateTime from dynamic value
  ///
  /// Returns DateTime if valid, null if value is null (when allowNull=true),
  /// throws descriptive error otherwise
  ///
  /// Matches backend behavior for timestamp fields
  static DateTime? toSafeDateTime(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
  }) {
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    if (value is DateTime) return value;

    if (value is String) {
      // Handle empty string like backend does
      if (value.trim().isEmpty) {
        if (allowNull) return null;
        throw ArgumentError('$fieldName is required but received empty string');
      }

      try {
        return DateTime.parse(value);
      } catch (e) {
        throw ArgumentError(
          '$fieldName must be a valid ISO8601 date string (got "$value")',
        );
      }
    }

    throw ArgumentError(
      '$fieldName must be a DateTime or ISO8601 string (got ${value.runtimeType})',
    );
  }

  /// Safely extract email from dynamic value
  ///
  /// Returns email string if valid, throws descriptive error otherwise
  static String toSafeEmail(dynamic value, String fieldName) {
    final str = toSafeString(value, fieldName, allowNull: false);
    if (str == null) {
      throw ArgumentError('$fieldName is required');
    }

    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );

    if (!emailRegex.hasMatch(str)) {
      throw ArgumentError('$fieldName must be a valid email (got "$str")');
    }

    return str;
  }

  /// Safely extract UUID v4 from dynamic value
  ///
  /// Returns UUID string if valid, null if value is null/empty (when allowNull=true),
  /// throws descriptive error otherwise
  ///
  /// Matches backend toSafeUuid() validation
  static String? toSafeUuid(
    dynamic value,
    String fieldName, {
    bool allowNull = false,
  }) {
    // Handle null/undefined/empty
    if (value == null) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received null');
    }

    // Must be string
    if (value is! String) {
      throw ArgumentError(
        '$fieldName must be a valid UUID string (got ${value.runtimeType})',
      );
    }

    final str = value.trim();
    if (str.isEmpty) {
      if (allowNull) return null;
      throw ArgumentError('$fieldName is required but received empty string');
    }

    // UUID v4 pattern: 8-4-4-4-12 hex digits
    // Version bit must be 4, variant bits must be 8/9/a/b
    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
    );

    if (!uuidRegex.hasMatch(str)) {
      throw ArgumentError('$fieldName must be a valid UUID v4 (got "$str")');
    }

    return str;
  }

  // ==========================================================================
  // USER INPUT VALIDATION (Form Fields)
  // ==========================================================================

  /// Validate required field
  ///
  /// Returns error message if field is empty/null, otherwise null
  static String? required(String? value, {String fieldName = 'Field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  /// Validate email format
  ///
  /// Returns error message if email is invalid, otherwise null
  /// Permissive validation - accepts any TLD format (matches backend)
  static String? email(String? value) {
    // First check if required
    final requiredError = required(value, fieldName: 'Email');
    if (requiredError != null) return requiredError;

    // Permissive email pattern - accepts ANY TLD (including new/custom TLDs)
    // Format: localpart@domain.tld
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+$',
    );

    if (!emailRegex.hasMatch(value!.trim())) {
      return 'Please enter a valid email address';
    }

    return null;
  }

  /// Validate minimum length
  ///
  /// Returns error message if string is too short, otherwise null
  static String? minLength(
    String? value,
    int minLen, {
    String fieldName = 'Field',
  }) {
    // First check if required
    final requiredError = required(value, fieldName: fieldName);
    if (requiredError != null) return requiredError;

    if (value!.trim().length < minLen) {
      return '$fieldName must be at least $minLen characters';
    }

    return null;
  }

  /// Validate maximum length
  ///
  /// Returns error message if string is too long, otherwise null
  static String? maxLength(
    String? value,
    int maxLen, {
    String fieldName = 'Field',
  }) {
    if (value == null) return null;

    if (value.trim().length > maxLen) {
      return '$fieldName must be at most $maxLen characters';
    }

    return null;
  }

  /// Validate integer format
  ///
  /// Returns error message if value is not a valid integer, otherwise null
  /// Matches backend toSafeInteger() validation
  static String? integer(String? value, {String fieldName = 'Field'}) {
    if (value == null || value.trim().isEmpty) {
      return null; // Allow empty (use required() separately if needed)
    }

    final parsed = int.tryParse(value.trim());
    if (parsed == null) {
      return '$fieldName must be a valid integer';
    }

    return null;
  }

  /// Validate positive integer
  ///
  /// Returns error message if value is not positive, otherwise null
  /// Matches backend min: 1 validation
  static String? positive(String? value, {String fieldName = 'Field'}) {
    // First check if valid integer
    final intError = integer(value, fieldName: fieldName);
    if (intError != null) return intError;

    if (value == null || value.trim().isEmpty) {
      return null; // Allow empty (use required() separately)
    }

    final parsed = int.parse(value.trim());
    if (parsed < 1) {
      return '$fieldName must be at least 1';
    }

    return null;
  }

  /// Validate integer range
  ///
  /// Returns error message if value is outside min/max range, otherwise null
  /// Matches backend toSafeInteger({ min, max }) validation
  static String? integerRange(
    String? value, {
    int? min,
    int? max,
    String fieldName = 'Field',
  }) {
    // First check if valid integer
    final intError = integer(value, fieldName: fieldName);
    if (intError != null) return intError;

    if (value == null || value.trim().isEmpty) {
      return null; // Allow empty (use required() separately)
    }

    final parsed = int.parse(value.trim());

    if (min != null && parsed < min) {
      return '$fieldName must be at least $min';
    }

    if (max != null && parsed > max) {
      return '$fieldName must be at most $max';
    }

    return null;
  }

  /// Combine multiple validators
  ///
  /// Returns first error found, otherwise null
  /// Useful for complex validation chains
  ///
  /// Example:
  /// ```dart
  /// combine([
  ///   () => Validators.required(value, fieldName: 'Name'),
  ///   () => Validators.minLength(value, 3, fieldName: 'Name'),
  ///   () => Validators.maxLength(value, 50, fieldName: 'Name'),
  /// ])
  /// ```
  static String? combine(List<String? Function()> validators) {
    for (final validator in validators) {
      final error = validator();
      if (error != null) return error;
    }
    return null;
  }
}
