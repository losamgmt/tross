/// NavigationCoordinator - Centralized navigation service
///
/// ZERO business logic - routing coordination ONLY
/// Context-insensitive - receives BuildContext as parameter
/// SRP: Navigation execution ONLY
library;

import 'package:flutter/material.dart';

/// Navigation coordination service
class NavigationCoordinator {
  NavigationCoordinator._(); // Private constructor - static class only

  /// Navigate to named route
  ///
  /// Pushes named route onto navigation stack
  /// Returns Future that completes when route is popped
  ///
  /// Example:
  ///   NavigationCoordinator.navigateTo(context, '/settings')
  static Future<T?> navigateTo<T>(BuildContext context, String routeName) {
    return Navigator.of(context).pushNamed<T>(routeName);
  }

  /// Navigate to named route and replace current route
  ///
  /// Replaces current route with named route
  /// Returns Future that completes when route is popped
  ///
  /// Example:
  ///   NavigationCoordinator.navigateAndReplace(context, '/login')
  static Future<T?> navigateAndReplace<T, TO>(
    BuildContext context,
    String routeName,
  ) {
    return Navigator.of(context).pushReplacementNamed<T, TO>(routeName);
  }

  /// Navigate to named route and remove all previous routes
  ///
  /// Clears navigation stack and pushes named route
  /// Optional predicate to keep specific routes
  /// Returns Future that completes when route is popped
  ///
  /// Example:
  ///   NavigationCoordinator.navigateAndRemoveAll(context, '/home')
  static Future<T?> navigateAndRemoveAll<T>(
    BuildContext context,
    String routeName, {
    bool Function(Route<dynamic>)? predicate,
  }) {
    return Navigator.of(
      context,
    ).pushNamedAndRemoveUntil<T>(routeName, predicate ?? (route) => false);
  }

  /// Pop current route
  ///
  /// Removes current route from navigation stack
  /// Optional result to return to previous route
  ///
  /// Example:
  ///   NavigationCoordinator.pop(context)
  ///   NavigationCoordinator.pop(context, result: true)
  static void pop<T>(BuildContext context, {T? result}) {
    Navigator.of(context).pop<T>(result);
  }

  /// Pop until predicate returns true
  ///
  /// Removes routes until predicate matches
  ///
  /// Example:
  ///   NavigationCoordinator.popUntil(context, (route) => route.isFirst)
  static void popUntil(
    BuildContext context,
    bool Function(Route<dynamic>) predicate,
  ) {
    Navigator.of(context).popUntil(predicate);
  }

  /// Check if can pop current route
  ///
  /// Returns true if there are routes to pop
  ///
  /// Example:
  ///   if (NavigationCoordinator.canPop(context)) { ... }
  static bool canPop(BuildContext context) {
    return Navigator.of(context).canPop();
  }
}
