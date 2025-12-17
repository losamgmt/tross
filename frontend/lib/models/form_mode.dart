/// Form Mode - Enum for distinguishing create vs edit operations
///
/// SOLE RESPONSIBILITY: Provide clear mode distinction for forms
///
/// This enum allows forms and modals to adapt their behavior based on
/// whether they're creating a new entity or editing an existing one.
///
/// Key differences by mode:
/// - CREATE: Empty initial values, all editable fields enabled, "Create" button
/// - EDIT: Pre-populated values, some fields may be readOnly, "Save" button
///
/// USAGE:
/// ```dart
/// // Metadata factory respects mode
/// final fields = mode == FormMode.create
///   ? MetadataFieldConfigFactory.forCreate('user')
///   : MetadataFieldConfigFactory.forEdit('user');
///
/// // Modal title adapts
/// final title = mode == FormMode.create ? 'Create User' : 'Edit User';
///
/// // Button label adapts
/// final buttonLabel = mode.actionLabel; // "Create" or "Save"
/// ```
library;

/// Form operation mode
enum FormMode {
  /// Creating a new entity
  create,

  /// Editing an existing entity
  edit,

  /// View-only mode (no edits allowed)
  view,
}

/// Extension methods for FormMode
extension FormModeExtension on FormMode {
  /// Get the action label for this mode
  String get actionLabel => switch (this) {
    FormMode.create => 'Create',
    FormMode.edit => 'Save',
    FormMode.view => 'Close',
  };

  /// Get the title prefix for this mode
  String get titlePrefix => switch (this) {
    FormMode.create => 'Create',
    FormMode.edit => 'Edit',
    FormMode.view => 'View',
  };

  /// Whether fields should be editable
  bool get isEditable => this != FormMode.view;

  /// Whether this is a create operation
  bool get isCreate => this == FormMode.create;

  /// Whether this is an edit operation
  bool get isEdit => this == FormMode.edit;

  /// Whether this is a view-only operation
  bool get isView => this == FormMode.view;
}
