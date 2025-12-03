/// Form Field Validators
///
/// Flutter-specific wrappers for TextFormField validation.
/// Designed for use with TextFormField's validator parameter.
///
/// Philosophy:
/// - Immediate feedback (onChanged validation)
/// - Clear error messages matching backend
/// - Consistent UX across all forms
///
/// Usage:
/// ```dart
/// TextFormField(
///   validator: FormValidators.email,
///   autovalidateMode: AutovalidateMode.onUserInteraction,
/// )
/// ```
library;

import 'validators.dart';

class FormValidators {
  // Private constructor to prevent instantiation
  FormValidators._();

  /// Email validator for TextFormField
  ///
  /// Returns error message or null
  static String? email(dynamic value) {
    if (value is! String?) return 'Invalid email format';
    return Validators.email(value);
  }

  /// Required field validator
  ///
  /// Returns error message or null
  static String? Function(dynamic) required([String fieldName = 'Field']) {
    return (value) {
      if (value is! String?) return '$fieldName is required';
      return Validators.required(value, fieldName: fieldName);
    };
  }

  /// Minimum length validator
  ///
  /// Returns error message or null
  static String? Function(dynamic) minLength(
    int minLen, [
    String fieldName = 'Field',
  ]) {
    return (value) {
      if (value is! String?) {
        return '$fieldName must be at least $minLen characters';
      }
      return Validators.minLength(value, minLen, fieldName: fieldName);
    };
  }

  /// Maximum length validator
  ///
  /// Returns error message or null
  static String? Function(dynamic) maxLength(
    int maxLen, [
    String fieldName = 'Field',
  ]) {
    return (value) {
      if (value is! String?) return '$fieldName is too long';
      return Validators.maxLength(value, maxLen, fieldName: fieldName);
    };
  }

  /// Integer validator for TextFormField
  ///
  /// Returns error message or null
  static String? Function(dynamic) integer([String fieldName = 'Field']) {
    return (value) {
      if (value is! String?) return '$fieldName must be a number';
      return Validators.integer(value, fieldName: fieldName);
    };
  }

  /// Positive integer validator
  ///
  /// Returns error message or null
  static String? Function(dynamic) positive([String fieldName = 'Field']) {
    return (value) {
      if (value is! String?) return '$fieldName must be positive';
      return Validators.positive(value, fieldName: fieldName);
    };
  }

  /// Integer range validator
  ///
  /// Returns error message or null
  static String? Function(dynamic) integerRange({
    int? min,
    int? max,
    String fieldName = 'Field',
  }) {
    return (value) {
      if (value is! String?) return '$fieldName must be a number';
      return Validators.integerRange(
        value,
        min: min,
        max: max,
        fieldName: fieldName,
      );
    };
  }

  /// Compose multiple validators
  ///
  /// Runs validators in order, returns first error
  ///
  /// Example:
  /// ```dart
  /// TextFormField(
  ///   validator: FormValidators.compose([
  ///     FormValidators.required('Email'),
  ///     FormValidators.email,
  ///   ]),
  /// )
  /// ```
  static String? Function(String?) compose(
    List<String? Function(String?)> validators,
  ) {
    return (value) {
      for (final validator in validators) {
        final error = validator(value);
        if (error != null) return error;
      }
      return null;
    };
  }

  // ============================================================================
  // COMMON FIELD VALIDATORS (Pre-composed for convenience)
  // ============================================================================

  /// Required email validator
  ///
  /// Combines required + email validation
  static String? requiredEmail(String? value) {
    return Validators.combine([
      () => Validators.required(value, fieldName: 'Email'),
      () => Validators.email(value),
    ]);
  }

  /// Required name validator
  ///
  /// Combines required + min length validation (2-50 chars)
  static String? requiredName(String? value, [String fieldName = 'Name']) {
    return Validators.combine([
      () => Validators.required(value, fieldName: fieldName),
      () => Validators.minLength(value, 2, fieldName: fieldName),
      () => Validators.maxLength(value, 50, fieldName: fieldName),
    ]);
  }

  /// Required role name validator
  ///
  /// Combines required + min length validation (3-50 chars)
  /// Matches backend role name validation
  static String? requiredRoleName(String? value) {
    return Validators.combine([
      () => Validators.required(value, fieldName: 'Role name'),
      () => Validators.minLength(value, 3, fieldName: 'Role name'),
      () => Validators.maxLength(value, 50, fieldName: 'Role name'),
    ]);
  }

  /// Required positive integer validator
  ///
  /// Combines required + positive integer validation
  /// Matches backend ID validation (min: 1)
  static String? requiredPositiveInteger(
    String? value, [
    String fieldName = 'Field',
  ]) {
    return Validators.combine([
      () => Validators.required(value, fieldName: fieldName),
      () => Validators.positive(value, fieldName: fieldName),
    ]);
  }

  /// Optional email validator
  ///
  /// Allows empty, but validates format if provided
  static String? optionalEmail(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return Validators.email(value);
  }
}
