/// NavigationCoordinator - Centralized navigation service
///
/// Uses go_router for all navigation operations.
/// Context-insensitive - receives BuildContext as parameter.
/// SRP: Navigation execution ONLY
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigation coordination service
///
/// Provides a unified API for navigation using go_router.
/// All methods are static for easy access throughout the app.
class NavigationCoordinator {
  NavigationCoordinator._(); // Private constructor - static class only

  /// Navigate to route (replaces current location in history)
  ///
  /// Uses go_router's go() which navigates to the route and replaces
  /// the current location in the browser history.
  ///
  /// Example:
  ///   NavigationCoordinator.go(context, '/settings')
  static void go(BuildContext context, String route) {
    context.go(route);
  }

  /// Navigate to route (adds to history stack)
  ///
  /// Uses go_router's push() which pushes the route onto the stack.
  /// Use this when you want back navigation to return to current page.
  ///
  /// Example:
  ///   NavigationCoordinator.push(context, '/details')
  static void push(BuildContext context, String route) {
    context.push(route);
  }

  /// Navigate to named route with parameters
  ///
  /// Uses go_router's goNamed() for type-safe navigation.
  ///
  /// Example:
  ///   NavigationCoordinator.goNamed(context, 'user', pathParameters: {'id': '123'})
  static void goNamed(
    BuildContext context,
    String name, {
    Map<String, String> pathParameters = const {},
    Map<String, dynamic> queryParameters = const {},
    Object? extra,
  }) {
    context.goNamed(
      name,
      pathParameters: pathParameters,
      queryParameters: queryParameters,
      extra: extra,
    );
  }

  /// Pop current route
  ///
  /// Removes current route from navigation stack.
  /// Optional result to return to previous route.
  ///
  /// Example:
  ///   NavigationCoordinator.pop(context)
  ///   NavigationCoordinator.pop(context, result: true)
  static void pop<T>(BuildContext context, {T? result}) {
    context.pop<T>(result);
  }

  /// Check if can pop current route
  ///
  /// Returns true if there are routes to pop.
  ///
  /// Example:
  ///   if (NavigationCoordinator.canPop(context)) { ... }
  static bool canPop(BuildContext context) {
    return context.canPop();
  }

  /// Replace current route with new route
  ///
  /// Uses go_router's pushReplacement() to replace current route.
  ///
  /// Example:
  ///   NavigationCoordinator.replace(context, '/home')
  static void replace(BuildContext context, String route) {
    context.pushReplacement(route);
  }
}
