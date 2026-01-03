/// EditableFormNotifier - Dirty State Tracking for Batch Save/Discard
///
/// Manages form dirty state for batch save/discard operations using Flutter's
/// ChangeNotifier pattern. This notifier tracks original vs current values
/// and provides computed dirty state for UI reactivity.
///
/// **Architecture:**
/// - Extends ChangeNotifier for reactive state management
/// - Pure state tracking - NO network calls, NO validation
/// - Caller injects initial values and save callback
/// - Deep equality checks for lists/maps/nulls
///
/// **State Management Pattern:**
/// - All state changes trigger `notifyListeners()` to update UI
/// - Immutable public getters (currentValues, originalValues)
/// - Loading states prevent concurrent save operations
/// - Error states provide user feedback
///
/// **Usage Example:**
/// ```dart
/// // Create with initial values and save callback:
/// final notifier = EditableFormNotifier(
///   initialValues: {'name': 'John', 'email': 'john@example.com'},
///   onSave: (changes) async => await api.updateSettings(changes),
/// );
///
/// // Update fields:
/// notifier.updateField('name', 'Jane');
///
/// // Check dirty state:
/// if (notifier.isDirty) {
///   // Show SaveDiscardBar
/// }
///
/// // Batch save:
/// await notifier.save();
///
/// // Or discard:
/// notifier.discard();
/// ```
///
/// **Key Features:**
/// - Dirty state detection with deep equality
/// - Per-field dirty checking
/// - Batch field updates (single notification)
/// - Full current state replacement via setCurrent()
/// - Save with success/error lifecycle states
/// - Automatic success-to-idle transition
/// - Discard to revert all changes
/// - Reset for fresh data loads
///
/// **KISS Principle:**
/// - Simple map-based storage (no complex models)
/// - Explicit notifyListeners() calls (predictable updates)
/// - No dispose() needed (delayed Future checks hasListeners)
/// - Direct callback delegation (thin provider layer)
library;

import 'package:flutter/foundation.dart';

/// Callback type for save operations
/// Returns the changed fields map, expects async completion
typedef SaveCallback = Future<void> Function(Map<String, dynamic> changes);

/// State enum for save operations
enum SaveState {
  /// No save in progress
  idle,

  /// Save operation is running
  saving,

  /// Save completed successfully
  success,

  /// Save failed with error
  error,
}

/// Notifier for tracking form dirty state and batch save/discard
///
/// Follows the existing provider patterns in this codebase:
/// - Immutable public getters
/// - Private state with notifyListeners()
/// - Clear separation of concerns
class EditableFormNotifier extends ChangeNotifier {
  /// Original values snapshot (set once, updated after save)
  Map<String, dynamic> _original;

  /// Current values as user edits
  Map<String, dynamic> _current;

  /// Callback to execute on save
  final SaveCallback? _onSave;

  /// Current save state
  SaveState _saveState = SaveState.idle;

  /// Error message from last failed save
  String? _saveError;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════

  /// Creates an editable form notifier
  ///
  /// [initialValues] - The original values to track against
  /// [onSave] - Optional callback executed when save() is called
  EditableFormNotifier({
    Map<String, dynamic> initialValues = const {},
    SaveCallback? onSave,
  }) : _original = Map<String, dynamic>.from(initialValues),
       _current = Map<String, dynamic>.from(initialValues),
       _onSave = onSave;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS - Dirty State
  // ═══════════════════════════════════════════════════════════════════════════

  /// Whether any field has been modified from original
  bool get isDirty => !_mapsEqual(_original, _current);

  /// Number of fields that have been changed
  int get changeCount {
    int count = 0;
    final allKeys = {..._original.keys, ..._current.keys};
    for (final key in allKeys) {
      if (!_valuesEqual(_original[key], _current[key])) {
        count++;
      }
    }
    return count;
  }

  /// Map of only the changed fields (key -> new value)
  Map<String, dynamic> get changedFields {
    final changes = <String, dynamic>{};
    final allKeys = {..._original.keys, ..._current.keys};
    for (final key in allKeys) {
      if (!_valuesEqual(_original[key], _current[key])) {
        changes[key] = _current[key];
      }
    }
    return changes;
  }

  /// List of field names that have been changed
  List<String> get changedFieldNames => changedFields.keys.toList();

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS - Values
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get current value for a field
  dynamic getValue(String key) => _current[key];

  /// Get original value for a field
  dynamic getOriginalValue(String key) => _original[key];

  /// Get all current values (immutable copy)
  Map<String, dynamic> get currentValues => Map.unmodifiable(_current);

  /// Get all original values (immutable copy)
  Map<String, dynamic> get originalValues => Map.unmodifiable(_original);

  /// Check if a specific field has been modified
  bool isFieldDirty(String key) {
    return !_valuesEqual(_original[key], _current[key]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC GETTERS - Save State
  // ═══════════════════════════════════════════════════════════════════════════

  /// Current save operation state
  SaveState get saveState => _saveState;

  /// Whether a save is currently in progress
  bool get isSaving => _saveState == SaveState.saving;

  /// Error message from last failed save (null if no error)
  String? get saveError => _saveError;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC METHODS - Field Updates
  // ═══════════════════════════════════════════════════════════════════════════

  /// Update a single field value
  ///
  /// Notifies listeners so UI can react to dirty state changes.
  void updateField(String key, dynamic value) {
    if (_valuesEqual(_current[key], value)) return;

    _current[key] = value;
    notifyListeners();
  }

  /// Update multiple fields at once
  ///
  /// More efficient than calling updateField multiple times.
  void updateFields(Map<String, dynamic> updates) {
    bool changed = false;
    for (final entry in updates.entries) {
      if (!_valuesEqual(_current[entry.key], entry.value)) {
        _current[entry.key] = entry.value;
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }

  /// Replace the entire current value
  ///
  /// Use when receiving full state from GenericForm.onChange.
  /// More efficient than updateFields when you have the complete state.
  void setCurrent(Map<String, dynamic> fullValue) {
    if (_mapsEqual(_current, fullValue)) return;

    _current = Map<String, dynamic>.from(fullValue);
    notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC METHODS - Save/Discard
  // ═══════════════════════════════════════════════════════════════════════════

  /// Save all changes
  ///
  /// Calls the onSave callback with changed fields.
  /// On success, updates original to match current.
  /// On failure, sets error state.
  Future<bool> save() async {
    if (!isDirty) return true;
    if (_saveState == SaveState.saving) return false;

    _saveState = SaveState.saving;
    _saveError = null;
    notifyListeners();

    try {
      if (_onSave != null) {
        await _onSave(changedFields);
      }

      // Success - update original to match current
      _original = Map<String, dynamic>.from(_current);
      _saveState = SaveState.success;
      notifyListeners();

      // Schedule reset to idle after brief success state
      // Note: If disposed before this fires, the callback will be a no-op
      // because hasListeners will be false
      _scheduleSuccessReset();

      return true;
    } catch (e) {
      _saveState = SaveState.error;
      _saveError = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Schedules a reset from success to idle state
  void _scheduleSuccessReset() {
    Future.delayed(const Duration(seconds: 2), () {
      // Only update if still in success state and not disposed
      if (_saveState == SaveState.success && hasListeners) {
        _saveState = SaveState.idle;
        notifyListeners();
      }
    });
  }

  /// Discard all changes, reverting to original values
  void discard() {
    if (!isDirty) return;

    _current = Map<String, dynamic>.from(_original);
    _saveState = SaveState.idle;
    _saveError = null;
    notifyListeners();
  }

  /// Reset with new initial values
  ///
  /// Use when loading fresh data from server.
  void reset(Map<String, dynamic> newValues) {
    _original = Map<String, dynamic>.from(newValues);
    _current = Map<String, dynamic>.from(newValues);
    _saveState = SaveState.idle;
    _saveError = null;
    notifyListeners();
  }

  /// Clear save error state
  void clearError() {
    if (_saveError != null) {
      _saveError = null;
      _saveState = SaveState.idle;
      notifyListeners();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Deep equality check for two maps
  bool _mapsEqual(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (!b.containsKey(key)) return false;
      if (!_valuesEqual(a[key], b[key])) return false;
    }
    return true;
  }

  /// Value equality check (handles null, lists, maps)
  bool _valuesEqual(dynamic a, dynamic b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    if (a is List && b is List) {
      return listEquals(a, b);
    }
    if (a is Map && b is Map) {
      return mapEquals(a, b);
    }
    return a == b;
  }
}
