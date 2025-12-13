import 'package:flutter/material.dart';
import 'package:tross_app/widgets/atoms/inputs/text_input.dart'
    show TextFieldType;

/// Field type enumeration
enum FieldType { text, number, select, date, textArea, boolean }

/// Generic field configuration for ANY field on ANY model
///
/// Type parameters:
/// - T: The model type (e.g., User, Role)
/// - V: The field value type (e.g., String, int, DateTime, bool)
///
/// This configuration describes:
/// - Which input widget to use
/// - How to extract the value from the model
/// - How to update the model with a new value
/// - Validation rules
/// - Display properties (label, placeholder, etc.)
///
/// Usage:
/// ```dart
/// // Text field for User.email
/// FieldConfig<User, String>(
///   fieldType: FieldType.text,
///   label: 'Email',
///   getValue: (user) => user.email,
///   setValue: (user, value) => user.copyWith(email: value),
///   validator: (value) => value?.contains('@') == true ? null : 'Invalid email',
/// )
///
/// // Boolean field for User.isActive
/// FieldConfig<User, bool>(
///   fieldType: FieldType.boolean,
///   label: 'Active',
///   getValue: (user) => user.isActive,
///   setValue: (user, value) => user.copyWith(isActive: value),
/// )
/// ```
class FieldConfig<T, V> {
  final FieldType fieldType;
  final String label;
  final V Function(T) getValue;
  final T Function(T, Object?) setValue;
  final String? Function(dynamic)? validator; // Changed from V? to dynamic
  final String? placeholder;
  final String? helperText;
  final bool required;
  final IconData? icon;

  // Text field specific
  final TextFieldType? textFieldType;
  final bool? obscureText;
  final int? maxLength;

  // Number field specific
  final bool? isInteger;
  final num? minValue;
  final num? maxValue;
  final num? step;

  // Select field specific
  final List<V>? selectItems;
  final String Function(V)? displayText;
  final bool? allowEmpty;

  // Date field specific
  final DateTime? minDate;
  final DateTime? maxDate;

  // TextArea field specific
  final int? minLines;
  final int? maxLines;

  const FieldConfig({
    required this.fieldType,
    required this.label,
    required this.getValue,
    required this.setValue,
    this.validator,
    this.placeholder,
    this.helperText,
    this.required = false,
    this.icon,
    // Text specific
    this.textFieldType,
    this.obscureText,
    this.maxLength,
    // Number specific
    this.isInteger,
    this.minValue,
    this.maxValue,
    this.step,
    // Select specific
    this.selectItems,
    this.displayText,
    this.allowEmpty,
    // Date specific
    this.minDate,
    this.maxDate,
    // TextArea specific
    this.minLines,
    this.maxLines,
  });
}
