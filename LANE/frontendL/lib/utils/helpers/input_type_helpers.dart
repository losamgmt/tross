/// Input Type Mapping Helpers
///
/// Centralized utilities for mapping custom types to Flutter types.
/// All methods are pure functions with no side effects.
///
/// Single Responsibility: Map enum types to Flutter framework types.
library;

import 'package:flutter/material.dart';

/// Input field type enumeration (generic, domain-agnostic).
enum TextFieldType { text, email, password, url, phone }

/// Input type mapping utilities.
///
/// Provides consistent mappings from app-level enums to Flutter types.
class InputTypeHelpers {
  // Private constructor to prevent instantiation
  InputTypeHelpers._();

  /// Maps [TextFieldType] to Flutter's [TextInputType].
  ///
  /// Returns appropriate keyboard type for each field type.
  ///
  /// Example:
  /// ```dart
  /// final keyboardType = InputTypeHelpers.getKeyboardType(TextFieldType.email);
  /// // Returns: TextInputType.emailAddress
  /// ```
  static TextInputType getKeyboardType(TextFieldType type) {
    switch (type) {
      case TextFieldType.email:
        return TextInputType.emailAddress;
      case TextFieldType.phone:
        return TextInputType.phone;
      case TextFieldType.url:
        return TextInputType.url;
      case TextFieldType.text:
      case TextFieldType.password:
        return TextInputType.text;
    }
  }
}
