/// Validation Rules Loader
///
/// Loads centralized validation rules from assets/config/validation-rules.json
/// Ensures frontend validation matches backend EXACTLY.
///
/// This is the SINGLE SOURCE OF TRUTH for all validation logic.
library;

import 'dart:convert';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter/services.dart';

/// Centralized validation rules loaded from JSON config
class ValidationRules {
  static ValidationRules? _instance;
  static Map<String, dynamic>? _rules;
  static bool _isLoaded = false;

  ValidationRules._();

  /// Get singleton instance
  static ValidationRules get instance {
    _instance ??= ValidationRules._();
    return _instance!;
  }

  /// Load validation rules from assets
  static Future<void> load() async {
    if (_isLoaded) return;

    try {
      final String jsonString = await rootBundle.loadString(
        'assets/config/validation-rules.json',
      );
      _rules = json.decode(jsonString) as Map<String, dynamic>;
      _isLoaded = true;

      final version = _rules!['version'];
      final policy = _rules!['policy'];
      debugPrint('[ValidationRules] ✅ Loaded validation rules v$version');
      debugPrint('[ValidationRules] 🎯 Policy: $policy');
    } catch (e) {
      debugPrint('[ValidationRules] ❌ Failed to load validation rules: $e');
      throw Exception('Cannot load validation rules from assets');
    }
  }

  /// Get field validation rules
  Map<String, dynamic>? getField(String fieldName) {
    if (!_isLoaded || _rules == null) {
      throw Exception(
        'Validation rules not loaded. Call ValidationRules.load() first',
      );
    }

    final fields = _rules!['fields'] as Map<String, dynamic>?;
    return fields?[fieldName] as Map<String, dynamic>?;
  }

  /// Get composite validation operation rules
  Map<String, dynamic>? getOperation(String operationName) {
    if (!_isLoaded || _rules == null) {
      throw Exception(
        'Validation rules not loaded. Call ValidationRules.load() first',
      );
    }

    final composites = _rules!['compositeValidations'] as Map<String, dynamic>?;
    return composites?[operationName] as Map<String, dynamic>?;
  }

  /// Get all error messages for a field
  Map<String, String> getErrorMessages(String fieldName) {
    final fieldRules = getField(fieldName);
    if (fieldRules == null) return {};

    final errorMessages = fieldRules['errorMessages'] as Map<String, dynamic>?;
    if (errorMessages == null) return {};

    return errorMessages.map((key, value) => MapEntry(key, value.toString()));
  }

  /// Get field constraint value (min, max, maxLength, etc.)
  dynamic getConstraint(String fieldName, String constraintName) {
    final fieldRules = getField(fieldName);
    return fieldRules?[constraintName];
  }

  /// Check if field is required
  bool isRequired(String fieldName) {
    final fieldRules = getField(fieldName);
    return fieldRules?['required'] == true;
  }

  /// Get validation pattern (regex)
  String? getPattern(String fieldName) {
    final fieldRules = getField(fieldName);
    return fieldRules?['pattern'] as String?;
  }

  /// Get validation metadata
  Map<String, dynamic> getMetadata() {
    if (!_isLoaded || _rules == null) {
      return {};
    }

    return {
      'version': _rules!['version'],
      'policy': _rules!['policy'],
      'lastUpdated': _rules!['lastUpdated'],
      'fields': (_rules!['fields'] as Map<String, dynamic>).keys.toList(),
      'operations': (_rules!['compositeValidations'] as Map<String, dynamic>)
          .keys
          .toList(),
    };
  }

  /// Get all rules (for debugging)
  Map<String, dynamic>? getAllRules() => _rules;
}

/// Validator functions that use centralized rules
class CentralizedValidators {
  /// Validate email using centralized rules
  static String? email(String? value) {
    final rules = ValidationRules.instance;
    final emailRules = rules.getField('email');
    if (emailRules == null) {
      // Fallback if rules not loaded
      return _fallbackEmailValidation(value);
    }

    // Check required
    if (emailRules['required'] == true) {
      if (value == null || value.trim().isEmpty) {
        return rules.getErrorMessages('email')['required'] ??
            'Email is required';
      }
    }

    // Apply trim if specified
    final trimmed = (emailRules['trim'] == true) ? value!.trim() : value!;

    // Check max length
    final maxLength = emailRules['maxLength'] as int?;
    if (maxLength != null && trimmed.length > maxLength) {
      return rules.getErrorMessages('email')['maxLength'] ??
          'Email cannot exceed $maxLength characters';
    }

    // Check pattern
    final pattern = emailRules['pattern'] as String?;
    if (pattern != null) {
      final regex = RegExp(pattern);
      if (!regex.hasMatch(trimmed)) {
        return rules.getErrorMessages('email')['format'] ??
            'Email must be a valid email address';
      }
    }

    return null;
  }

  /// Fallback email validation if rules not loaded
  static String? _fallbackEmailValidation(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required';
    }

    // Permissive email pattern (matches backend)
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+$',
    );

    if (!emailRegex.hasMatch(value.trim())) {
      return 'Email must be a valid email address';
    }

    if (value.length > 255) {
      return 'Email cannot exceed 255 characters';
    }

    return null;
  }

  /// Validate first name using centralized rules
  static String? firstName(String? value) {
    final rules = ValidationRules.instance;
    return _validateStringField(value, 'firstName', rules);
  }

  /// Validate last name using centralized rules
  static String? lastName(String? value) {
    final rules = ValidationRules.instance;
    return _validateStringField(value, 'lastName', rules);
  }

  /// Validate role name using centralized rules
  static String? roleName(String? value) {
    final rules = ValidationRules.instance;
    return _validateStringField(value, 'roleName', rules);
  }

  /// Generic string field validation
  static String? _validateStringField(
    String? value,
    String fieldName,
    ValidationRules rules,
  ) {
    final fieldRules = rules.getField(fieldName);
    if (fieldRules == null) {
      return null; // No rules defined
    }

    // Check required
    if (fieldRules['required'] == true) {
      if (value == null || value.trim().isEmpty) {
        return rules.getErrorMessages(fieldName)['required'] ??
            '${_capitalize(fieldName)} is required';
      }
    } else if (value == null || value.isEmpty) {
      return null; // Optional field, empty is OK
    }

    // Apply trim if specified
    final trimmed = (fieldRules['trim'] == true) ? value.trim() : value;

    // Check min length
    final minLength = fieldRules['minLength'] as int?;
    if (minLength != null && trimmed.length < minLength) {
      return rules.getErrorMessages(fieldName)['minLength'] ??
          '${_capitalize(fieldName)} must be at least $minLength characters';
    }

    // Check max length
    final maxLength = fieldRules['maxLength'] as int?;
    if (maxLength != null && trimmed.length > maxLength) {
      return rules.getErrorMessages(fieldName)['maxLength'] ??
          '${_capitalize(fieldName)} cannot exceed $maxLength characters';
    }

    // Check pattern
    final pattern = fieldRules['pattern'] as String?;
    if (pattern != null) {
      final regex = RegExp(pattern);
      if (!regex.hasMatch(trimmed)) {
        return rules.getErrorMessages(fieldName)['pattern'] ??
            '${_capitalize(fieldName)} contains invalid characters';
      }
    }

    return null;
  }

  /// Validate role ID using centralized rules
  static String? roleId(dynamic value) {
    if (value == null) return null; // Optional

    final rules = ValidationRules.instance;
    final fieldRules = rules.getField('roleId');
    if (fieldRules == null) return null;

    if (value is! int) {
      return rules.getErrorMessages('roleId')['type'] ??
          'Role ID must be a number';
    }

    final min = fieldRules['min'] as int?;
    if (min != null && value < min) {
      return rules.getErrorMessages('roleId')['min'] ??
          'Role ID must be at least $min';
    }

    final max = fieldRules['max'] as int?;
    if (max != null && value > max) {
      return rules.getErrorMessages('roleId')['max'] ??
          'Role ID cannot exceed $max';
    }

    return null;
  }

  /// Capitalize first letter
  static String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}
