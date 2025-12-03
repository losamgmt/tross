/// Permission Guard - Declarative permission-based rendering
///
/// Conditionally renders child widgets based on user permissions.
/// Provides clean, maintainable way to hide/show UI elements.
///
/// Example:
/// ```dart
/// PermissionGuard(
///   resource: ResourceType.users,
///   operation: CrudOperation.delete,
///   child: DeleteButton(),
///   fallback: Text('Insufficient permissions'),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/permission.dart';

/// Permission Guard Widget
///
/// Shows `child` if user has permission, otherwise shows `fallback` (or nothing)
///
/// PHILOSOPHY:
/// - Declarative over imperative
/// - Single Responsibility (permission check only)
/// - Composable (nest multiple guards)
/// - Testable (inject mock AuthProvider)
class PermissionGuard extends StatelessWidget {
  /// The resource being accessed (users, roles, etc.)
  final ResourceType resource;

  /// The operation being performed (create, read, update, delete)
  final CrudOperation operation;

  /// Widget to show if user has permission
  final Widget child;

  /// Widget to show if user lacks permission (default: nothing)
  final Widget? fallback;

  /// Whether to listen to AuthProvider changes (default: true)
  /// Set to false for static checks that don't need reactivity
  final bool listen;

  const PermissionGuard({
    super.key,
    required this.resource,
    required this.operation,
    required this.child,
    this.fallback,
    this.listen = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = listen
        ? context.watch<AuthProvider>()
        : context.read<AuthProvider>();

    final hasPermission = authProvider.hasPermission(resource, operation);

    if (hasPermission) {
      return child;
    }

    return fallback ?? const SizedBox.shrink();
  }
}

/// Permission Guard with Custom Check
///
/// For complex permission logic not covered by standard CRUD operations
///
/// Example:
/// ```dart
/// PermissionGuardCustom(
///   check: (authProvider) => authProvider.userId == item.ownerId,
///   child: EditButton(),
///   fallback: Text('Only owner can edit'),
/// )
/// ```
class PermissionGuardCustom extends StatelessWidget {
  /// Custom permission check function
  final bool Function(AuthProvider) check;

  /// Widget to show if check returns true
  final Widget child;

  /// Widget to show if check returns false
  final Widget? fallback;

  /// Whether to listen to AuthProvider changes (default: true)
  final bool listen;

  const PermissionGuardCustom({
    super.key,
    required this.check,
    required this.child,
    this.fallback,
    this.listen = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = listen
        ? context.watch<AuthProvider>()
        : context.read<AuthProvider>();

    final hasPermission = check(authProvider);

    if (hasPermission) {
      return child;
    }

    return fallback ?? const SizedBox.shrink();
  }
}

/// Multiple Permission Guard (AND logic)
///
/// Shows child only if user has ALL specified permissions
///
/// Example:
/// ```dart
/// PermissionGuardMultiple(
///   permissions: [
///     (ResourceType.users, CrudOperation.read),
///     (ResourceType.roles, CrudOperation.read),
///   ],
///   child: AdminDashboard(),
/// )
/// ```
class PermissionGuardMultiple extends StatelessWidget {
  /// List of (resource, operation) tuples - ALL must be allowed
  final List<(ResourceType, CrudOperation)> permissions;

  /// Widget to show if user has all permissions
  final Widget child;

  /// Widget to show if user lacks any permission
  final Widget? fallback;

  /// Whether to listen to AuthProvider changes (default: true)
  final bool listen;

  const PermissionGuardMultiple({
    super.key,
    required this.permissions,
    required this.child,
    this.fallback,
    this.listen = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = listen
        ? context.watch<AuthProvider>()
        : context.read<AuthProvider>();

    final hasAllPermissions = permissions.every(
      (perm) => authProvider.hasPermission(perm.$1, perm.$2),
    );

    if (hasAllPermissions) {
      return child;
    }

    return fallback ?? const SizedBox.shrink();
  }
}

/// Minimum Role Guard
///
/// Shows child only if user meets minimum role requirement
///
/// Example:
/// ```dart
/// MinimumRoleGuard(
///   requiredRole: 'admin',
///   child: AdminPanel(),
///   fallback: Text('Admin access required'),
/// )
/// ```
class MinimumRoleGuard extends StatelessWidget {
  /// Minimum required role ('admin', 'manager', etc.)
  final String requiredRole;

  /// Widget to show if user meets requirement
  final Widget child;

  /// Widget to show if user doesn't meet requirement
  final Widget? fallback;

  /// Whether to listen to AuthProvider changes (default: true)
  final bool listen;

  const MinimumRoleGuard({
    super.key,
    required this.requiredRole,
    required this.child,
    this.fallback,
    this.listen = true,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = listen
        ? context.watch<AuthProvider>()
        : context.read<AuthProvider>();

    final hasMinimumRole = authProvider.hasMinimumRole(requiredRole);

    if (hasMinimumRole) {
      return child;
    }

    return fallback ?? const SizedBox.shrink();
  }
}
