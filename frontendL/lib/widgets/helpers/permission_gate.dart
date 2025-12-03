/// PermissionGate Widget
///
/// Conditionally renders children based on user permissions
/// Integrates with PermissionService and AuthProvider
///
/// PHILOSOPHY:
/// - Declarative permission checks in UI
/// - DRY - Single source of permission logic
/// - Graceful degradation - hides unauthorized UI elements
///
/// USAGE:
/// ```dart
/// PermissionGate(
///   resource: 'users',
///   operation: 'delete',
///   child: DeleteButton(),
///   fallback: SizedBox.shrink(), // Optional
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/permissions.dart';
import '../../providers/auth_provider.dart';

/// Permission gate types - different ways to check permissions
enum PermissionGateType {
  /// Check specific resource + operation permission
  permission,

  /// Check if user meets minimum role requirement
  minimumRole,

  /// Check if user has specific role (exact match)
  exactRole,
}

/// PermissionGate - Conditionally render UI based on permissions
///
/// Shows child if user has required permission, otherwise shows fallback
class PermissionGate extends StatelessWidget {
  /// The widget to show if permission check passes
  final Widget child;

  /// The widget to show if permission check fails (default: empty)
  final Widget fallback;

  /// Type of permission check to perform
  final PermissionGateType type;

  /// For type.permission: Resource name (e.g., 'users', 'roles')
  final String? resource;

  /// For type.permission: Operation (e.g., 'create', 'read', 'update', 'delete')
  final String? operation;

  /// For type.minimumRole or type.exactRole: Required role name
  final String? role;

  /// Whether to show loading indicator while checking auth state
  final bool showLoadingIndicator;

  const PermissionGate({
    super.key,
    this.fallback = const SizedBox.shrink(),
    this.type = PermissionGateType.permission,
    this.resource,
    this.operation,
    this.role,
    this.showLoadingIndicator = false,
    required this.child,
  });

  /// Factory: Check resource + operation permission
  factory PermissionGate.permission({
    Key? key,
    required String resource,
    required String operation,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.permission,
      resource: resource,
      operation: operation,
      fallback: fallback,
      child: child,
    );
  }

  /// Factory: Check minimum role requirement
  factory PermissionGate.minimumRole({
    Key? key,
    required String role,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.minimumRole,
      role: role,
      fallback: fallback,
      child: child,
    );
  }

  /// Factory: Check exact role match
  factory PermissionGate.exactRole({
    Key? key,
    required String role,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.exactRole,
      role: role,
      fallback: fallback,
      child: child,
    );
  }

  /// Factory: Admin only
  factory PermissionGate.adminOnly({
    Key? key,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.exactRole,
      role: 'admin',
      fallback: fallback,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userRole = authProvider.userRole;

    // If not authenticated, always show fallback
    if (!authProvider.isAuthenticated) {
      return fallback;
    }

    // Show loading indicator if requested and auth state is loading
    if (showLoadingIndicator && authProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Perform permission check based on type
    final hasPermission = _checkPermission(userRole);

    return hasPermission ? child : fallback;
  }

  /// Perform the actual permission check based on gate type
  bool _checkPermission(String? userRole) {
    switch (type) {
      case PermissionGateType.permission:
        if (resource == null || operation == null) {
          // Invalid configuration - deny by default
          return false;
        }
        return PermissionService.canPerform(userRole, resource!, operation!);

      case PermissionGateType.minimumRole:
        if (role == null) {
          // Invalid configuration - deny by default
          return false;
        }
        return PermissionService.meetsMinimumRole(userRole, role!);

      case PermissionGateType.exactRole:
        // Both role and userRole must be non-null for exact comparison
        final r = role;
        final ur = userRole;
        if (r == null || ur == null) {
          return false;
        }
        return ur.toLowerCase() == r.toLowerCase();
    }
  }
}

/// PermissionBuilder - Builder pattern for complex permission logic
///
/// Use when you need access to the permission check result in the builder
class PermissionBuilder extends StatelessWidget {
  final String? resource;
  final String? operation;
  final String? minimumRole;
  final Widget Function(BuildContext context, bool hasPermission) builder;

  const PermissionBuilder({
    super.key,
    this.resource,
    this.operation,
    this.minimumRole,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userRole = authProvider.userRole;

    if (!authProvider.isAuthenticated) {
      return builder(context, false);
    }

    final hasPermission = _checkPermission(userRole);
    return builder(context, hasPermission);
  }

  bool _checkPermission(String? userRole) {
    if (resource != null && operation != null) {
      return PermissionService.canPerform(userRole, resource!, operation!);
    }
    if (minimumRole != null) {
      return PermissionService.meetsMinimumRole(userRole, minimumRole!);
    }
    return false;
  }
}
