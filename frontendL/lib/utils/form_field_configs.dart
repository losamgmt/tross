/// Form Field Configurations - Reusable field configs for User/Role forms
///
/// **SOLE RESPONSIBILITY:** Define field configurations for FormModal composition
///
/// Pure configuration data - no widgets, no state, just FieldConfig definitions.
/// - User fields: email, firstName, lastName, roleId, isActive
/// - Role fields: name, description, isActive
/// - Factory functions for empty instances
///
/// SRP: Centralized field definitions for CRUD modals
/// Pattern: Configuration over implementation
/// Testing: Easy to test - verify field types, validators, getValue/setValue
///
/// Usage:
/// ```dart
/// FormModal.show<User>(
///   context: context,
///   title: 'Create User',
///   value: createEmptyUser(),
///   fields: [
///     UserFieldConfigs.email,
///     UserFieldConfigs.firstName,
///     UserFieldConfigs.lastName,
///     UserFieldConfigs.role(availableRoles),
///   ],
/// )
/// ```
library;

import '../models/user_model.dart';
import '../models/role_model.dart';
import '../widgets/molecules/forms/field_config.dart';
import '../widgets/atoms/inputs/text_input.dart' show TextFieldType;
import '../utils/form_validators.dart';

/// User field configurations
class UserFieldConfigs {
  // Private constructor - static class only
  UserFieldConfigs._();

  /// Create empty user for "new" operations
  ///
  /// Returns User instance with:
  /// - Temporary ID (0 - will be assigned by backend)
  /// - Empty email/names
  /// - Default role (client - roleId: 5)
  /// - Active status (true)
  /// - Pending activation status (awaiting first login)
  /// - Current timestamps
  static User createEmpty() {
    return User(
      id: 0,
      email: '',
      auth0Id: '', // Will be assigned on first Auth0 login
      firstName: '',
      lastName: '',
      roleId: 5, // Default to client role
      role: 'client',
      isActive: true,
      status: 'pending_activation', // New user awaiting first login
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Email field configuration
  static final FieldConfig<User, String> email = FieldConfig<User, String>(
    fieldType: FieldType.text,
    label: 'Email',
    placeholder: 'user@example.com',
    required: true,
    textFieldType: TextFieldType.email,
    maxLength: 255,
    getValue: (user) => user.email,
    setValue: (user, value) => user.copyWith(email: value as String),
    validator: FormValidators.email,
  );

  /// First name field configuration
  static final FieldConfig<User, String> firstName = FieldConfig<User, String>(
    fieldType: FieldType.text,
    label: 'First Name',
    placeholder: 'John',
    required: true,
    maxLength: 100,
    getValue: (user) => user.firstName,
    setValue: (user, value) => user.copyWith(firstName: value as String),
    validator: FormValidators.required('First name'),
  );

  /// Last name field configuration
  static final FieldConfig<User, String> lastName = FieldConfig<User, String>(
    fieldType: FieldType.text,
    label: 'Last Name',
    placeholder: 'Doe',
    required: true,
    maxLength: 100,
    getValue: (user) => user.lastName,
    setValue: (user, value) => user.copyWith(lastName: value as String),
    validator: FormValidators.required('Last name'),
  );

  /// Role selection field configuration
  ///
  /// Dynamic field that requires available roles list at runtime.
  /// Pass roles loaded from RoleService.getAll().
  ///
  /// Example:
  /// ```dart
  /// final roles = await RoleService.getAll();
  /// final roleField = UserFieldConfigs.role(roles);
  /// ```
  static FieldConfig<User, int> role(List<Role> availableRoles) {
    return FieldConfig<User, int>(
      fieldType: FieldType.select,
      label: 'Role',
      helperText: 'User access level',
      required: true,
      getValue: (user) => user.roleId,
      setValue: (user, value) => user.copyWith(
        roleId: value as int,
        role: availableRoles
            .firstWhere(
              (r) => r.id == value,
              orElse: () => availableRoles.first,
            )
            .name,
      ),
      selectItems: availableRoles.map((r) => r.id).toList(),
      displayText: (dynamic roleId) {
        final role = availableRoles.firstWhere(
          (r) => r.id == roleId,
          orElse: () => availableRoles.first,
        );
        return '${role.name.toUpperCase()}${role.description != null ? ' - ${role.description}' : ''}';
      },
    );
  }

  /// Active status field configuration
  static final FieldConfig<User, bool> isActive = FieldConfig<User, bool>(
    fieldType: FieldType.boolean,
    label: 'Active',
    helperText: 'Inactive users cannot login',
    getValue: (user) => user.isActive,
    setValue: (user, value) => user.copyWith(isActive: value as bool),
  );
}

/// Role field configurations
class RoleFieldConfigs {
  // Private constructor - static class only
  RoleFieldConfigs._();

  /// Create empty role for "new" operations
  ///
  /// Returns Role instance with:
  /// - Temporary ID (0 - will be assigned by backend)
  /// - Empty name/description
  /// - Active status (true)
  /// - Current timestamps
  static Role createEmpty() {
    return Role(
      id: 0,
      name: '',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      isActive: true,
    );
  }

  /// Role name field configuration
  static final FieldConfig<Role, String> name = FieldConfig<Role, String>(
    fieldType: FieldType.text,
    label: 'Role Name',
    placeholder: 'e.g., supervisor',
    helperText: 'Lowercase letters, numbers, underscores only',
    required: true,
    maxLength: 50,
    getValue: (role) => role.name,
    setValue: (role, value) => role.copyWith(name: value as String),
    validator: (value) {
      if (value == null || value.isEmpty) return 'Role name is required';
      if (value.length < 2) return 'Role name must be at least 2 characters';
      if (!RegExp(r'^[a-z][a-z0-9_]*$').hasMatch(value)) {
        return 'Must start with letter, lowercase letters/numbers/underscores only';
      }
      return null;
    },
  );

  /// Role description field configuration
  static final FieldConfig<Role, String> description =
      FieldConfig<Role, String>(
        fieldType: FieldType.text,
        label: 'Description',
        placeholder: 'Optional role description',
        helperText: 'Brief description of role responsibilities',
        required: false,
        maxLength: 255,
        getValue: (role) => role.description ?? '',
        setValue: (role, value) {
          final trimmed = (value as String).trim();
          return role.copyWith(description: trimmed.isEmpty ? null : trimmed);
        },
      );

  /// Priority field configuration
  static final FieldConfig<Role, int> priority = FieldConfig<Role, int>(
    fieldType: FieldType.number,
    label: 'Priority',
    placeholder: '1-100',
    helperText: 'Role hierarchy (1=lowest, 100=highest)',
    required: false,
    isInteger: true,
    minValue: 1,
    maxValue: 100,
    step: 1,
    getValue: (role) => role.priority ?? 50, // Default to 50 if null
    setValue: (role, value) {
      // Handle null or empty string from input
      final intValue = value == null || value == ''
          ? null
          : (value is int ? value : int.tryParse(value.toString()));
      return role.copyWith(priority: intValue);
    },
    validator: (value) {
      if (value == null) return null; // Optional field
      final intValue = value is int ? value : int.tryParse(value.toString());
      if (intValue == null) return 'Priority must be a number';
      if (intValue < 1 || intValue > 100) {
        return 'Priority must be between 1 and 100';
      }
      return null;
    },
  );

  /// Active status field configuration
  static final FieldConfig<Role, bool> isActive = FieldConfig<Role, bool>(
    fieldType: FieldType.boolean,
    label: 'Active',
    helperText: 'Inactive roles cannot be assigned to users',
    getValue: (role) => role.isActive,
    setValue: (role, value) => role.copyWith(isActive: value as bool),
  );
}
