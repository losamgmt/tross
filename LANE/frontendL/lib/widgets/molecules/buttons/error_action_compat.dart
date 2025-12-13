/// ErrorAction - Compatibility wrapper for ButtonConfig
///
/// DEPRECATED: Use ButtonConfig directly in new code
/// This exists only for backward compatibility with error_display.dart organism
///
/// Organisms can coordinate async actions - they handle the context and async logic,
/// then pass simple ButtonConfig to molecules for rendering.
library;

import 'package:flutter/material.dart';
import 'button_group.dart';

class ErrorAction {
  final String label;
  final String? route;
  final Future<void> Function(BuildContext)? onPressed;
  final IconData? icon;
  final bool isPrimary;
  final bool requiresAuth;

  const ErrorAction({
    required this.label,
    this.route,
    this.onPressed,
    this.icon,
    this.isPrimary = false,
    this.requiresAuth = false,
  });

  factory ErrorAction.navigate({
    required String label,
    required String route,
    IconData? icon,
    bool isPrimary = false,
    bool requiresAuth = false,
  }) {
    return ErrorAction(
      label: label,
      route: route,
      icon: icon,
      isPrimary: isPrimary,
      requiresAuth: requiresAuth,
    );
  }

  factory ErrorAction.retry({
    required Future<void> Function(BuildContext) onRetry,
    String label = 'Retry',
    IconData? icon,
  }) {
    return ErrorAction(
      label: label,
      onPressed: onRetry,
      icon: icon ?? Icons.refresh,
      isPrimary: true,
    );
  }

  factory ErrorAction.contactSupport({
    String label = 'Contact Support',
    String? supportEmail,
  }) {
    return ErrorAction(label: label, icon: Icons.support_agent);
  }

  /// Convert to ButtonConfig for rendering in molecules
  /// Organism must handle async/navigation logic before passing to molecule
  ButtonConfig toButtonConfig({required VoidCallback? onTap}) {
    return ButtonConfig(
      label: label,
      icon: icon,
      onPressed: onTap,
      isPrimary: isPrimary,
    );
  }
}
