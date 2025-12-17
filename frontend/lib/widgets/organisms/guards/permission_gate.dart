/// PermissionGate Widget
///
/// Conditionally renders children based on user permissions
/// Integrates with PermissionService and AuthProvider
///
/// PHILOSOPHY:
/// - Declarative permission checks in UI
/// - DRY - Single source of permission logic (dynamic JSON-based)
/// - Type-safe - Uses enums, not strings
/// - Graceful degradation - hides unauthorized UI elements
///
/// USAGE:
/// ```dart
/// PermissionGate(
///   resource: ResourceType.users,
///   operation: CrudOperation.delete,
///   child: DeleteButton(),
///   fallback: SizedBox.shrink(), // Optional
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/permission.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/permission_service_dynamic.dart';

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

  /// For type.permission: Resource type (users, roles, etc.)
  final ResourceType? resource;

  /// For type.permission: CRUD operation (create, read, update, delete)
  final CrudOperation? operation;

  /// For type.minimumRole: Minimum required role
  final UserRole? minimumRole;

  /// For type.exactRole: Required role (exact match)
  final UserRole? exactRole;

  /// Whether to show loading indicator while checking auth state
  final bool showLoadingIndicator;

  const PermissionGate({
    super.key,
    this.fallback = const SizedBox.shrink(),
    this.type = PermissionGateType.permission,
    this.resource,
    this.operation,
    this.minimumRole,
    this.exactRole,
    this.showLoadingIndicator = false,
    required this.child,
  });

  /// Factory: Check resource + operation permission
  factory PermissionGate.permission({
    Key? key,
    required ResourceType resource,
    required CrudOperation operation,
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
    required UserRole role,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.minimumRole,
      minimumRole: role,
      fallback: fallback,
      child: child,
    );
  }

  /// Factory: Check exact role match
  factory PermissionGate.exactRole({
    Key? key,
    required UserRole role,
    required Widget child,
    Widget fallback = const SizedBox.shrink(),
  }) {
    return PermissionGate(
      key: key,
      type: PermissionGateType.exactRole,
      exactRole: role,
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
      exactRole: UserRole.admin,
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
        return PermissionService.hasPermission(userRole, resource!, operation!);

      case PermissionGateType.minimumRole:
        if (minimumRole == null) {
          // Invalid configuration - deny by default
          return false;
        }
        return PermissionService.hasMinimumRole(userRole, minimumRole!);

      case PermissionGateType.exactRole:
        if (exactRole == null || userRole == null) {
          return false;
        }
        return userRole.toLowerCase() == exactRole!.name.toLowerCase();
    }
  }
}

/// PermissionBuilder - Builder pattern for complex permission logic
///
/// Use when you need access to the permission check result in the builder
class PermissionBuilder extends StatelessWidget {
  final ResourceType? resource;
  final CrudOperation? operation;
  final UserRole? minimumRole;
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
      return PermissionService.hasPermission(userRole, resource!, operation!);
    }
    if (minimumRole != null) {
      return PermissionService.hasMinimumRole(userRole, minimumRole!);
    }
    return false;
  }
}
