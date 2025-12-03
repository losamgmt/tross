import 'package:flutter/material.dart';
import 'package:tross_app/widgets/molecules/forms/field_config.dart';
import 'package:tross_app/widgets/molecules/details/detail_panel.dart';
import 'package:tross_app/widgets/organisms/modals/generic_modal.dart';
import 'package:tross_app/services/navigation_coordinator.dart';

/// DetailModal - Organism for read-only detail views via PURE COMPOSITION
///
/// **SOLE RESPONSIBILITY:** Compose GenericModal + DetailPanel for view operations
///
/// Architecture:
/// - NO implementation, ONLY composition
/// - Composes: GenericModal (organism) + DetailPanel (molecule)
/// - Handles read-only detail display
///
/// Usage:
/// ```dart
/// DetailModal.show<User>(
///   context: context,
///   title: 'User Details',
///   value: currentUser,
///   fields: [emailConfig, nameConfig, activeConfig],
/// )
/// ```
class DetailModal<T> extends StatelessWidget {
  final String title;
  final T value;
  final List<FieldConfig<T, dynamic>> fields;
  final List<Widget>? actions;

  const DetailModal({
    super.key,
    required this.title,
    required this.value,
    required this.fields,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    // Pure composition: GenericModal + DetailPanel
    return GenericModal(
      title: title,
      showCloseButton: true,
      content: DetailPanel<T>(value: value, fields: fields),
      actions:
          actions ??
          [
            TextButton(
              onPressed: () => NavigationCoordinator.pop(context),
              child: const Text('Close'),
            ),
          ],
    );
  }

  /// Helper method to show detail modal
  static Future<void> show<T>({
    required BuildContext context,
    required String title,
    required T value,
    required List<FieldConfig<T, dynamic>> fields,
    List<Widget>? actions,
  }) {
    return showDialog<void>(
      context: context,
      builder: (context) => DetailModal<T>(
        title: title,
        value: value,
        fields: fields,
        actions: actions,
      ),
    );
  }
}
