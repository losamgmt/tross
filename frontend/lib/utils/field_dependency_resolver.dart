/// Field Dependency Resolver
///
/// Applies metadata-driven field derivations on the client as the user edits a form.
///
/// A field declares `derived: { from, via, params }` in its metadata. This resolver
/// applies the derivation methods the frontend implements (currently `timeOffset`)
/// **reactively**: when the `from` source field just changed and the target field is
/// still blank, the target is filled — mirroring the previous, per-widget hardcoded
/// scheduled_start/scheduled_end logic, now generic and metadata-driven.
///
/// Backend-only methods (e.g. `lookup`, which needs a DB round-trip) are ignored here;
/// the server resolves those on save.
///
/// This replaces the duplicated `_applyFieldDependencies` copies in EntityFormModal and
/// GenericTableActionBuilders.
library;

import '../services/entity_metadata.dart'; // EntityMetadata + FieldDefinition/FieldDerived (re-exported)
import 'datetime_utils.dart';

/// A synchronous, same-record derivation method: produces the target's value from the
/// source value + params, or null to decline.
typedef DerivationMethod =
    String? Function(dynamic sourceValue, Map<String, dynamic>? params);

class FieldDependencyResolver {
  FieldDependencyResolver._();

  /// Client-side derivation methods, keyed by `derived.via`. Only synchronous, same-record
  /// methods belong here; async/cross-entity methods (e.g. `lookup`) are backend-only.
  static final Map<String, DerivationMethod> methods = {
    'timeOffset': (sourceValue, params) {
      final base = DateTimeUtils.parseAny(sourceValue);
      if (base == null) return null;
      final hours = (params?['hours'] as num?)?.toInt() ?? 0;
      return DateTimeUtils.toApiString(base.add(Duration(hours: hours)));
    },
  };

  static bool _isBlank(dynamic v) => v == null || v == '';

  /// Returns a map with derived defaults applied.
  ///
  /// [value] is the incoming form value; [previous] is the prior value (for change
  /// detection). A derivation fires only when a field's `from` source just changed and the
  /// target is blank, so an explicit value is never clobbered. Source values are read from
  /// [value] (not the in-progress result) so paired rules cannot cascade within one pass.
  /// Returns [value] unchanged when nothing derives.
  static Map<String, dynamic> apply({
    required EntityMetadata? metadata,
    required Map<String, dynamic> value,
    required Map<String, dynamic> previous,
  }) {
    if (metadata == null) return value;

    Map<String, dynamic>? result;

    metadata.fields.forEach((fieldName, field) {
      final derived = field.derived;
      if (derived == null) return;

      final method = methods[derived.via];
      if (method == null) return; // e.g. lookup — resolved on the backend

      final sourceChanged = value[derived.from] != previous[derived.from];
      final targetBlank = _isBlank(value[fieldName]);
      if (!sourceChanged || !targetBlank) return;

      final derivedValue = method(value[derived.from], derived.params);
      if (derivedValue == null) return;

      result ??= Map<String, dynamic>.from(value);
      result![fieldName] = derivedValue;
    });

    return result ?? value;
  }
}
