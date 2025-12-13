// Organism: Error Display - Unified error handling UI for all error states
// Part of the Error Display System - provides graceful error recovery UX
//
// **PURE COMPOSITION:** Receives all data as props
// - isAuthenticated: controls which actions to show
// - userEmail: optional display for auth status
// - onNavigate: callback for navigation actions
import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../core/routing/app_routes.dart';
import '../molecules/error_message.dart';
import '../molecules/buttons/button_group.dart';

/// Configuration for error action buttons
///
/// Used by ErrorDisplay organism to define available actions.
/// Supports navigation, async callbacks (retry), and auth-gated visibility.
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

  /// Convert to ButtonConfig for rendering in ButtonGroup molecule
  ButtonConfig toButtonConfig({required VoidCallback? onTap}) {
    return ButtonConfig(
      label: label,
      icon: icon,
      onPressed: onTap,
      isPrimary: isPrimary,
    );
  }
}

/// Error Display - Single, flexible, data-driven error UI
///
/// Supports multiple display modes:
/// - Full-page error (404, 403, 500)
/// - Inline error card (component-level failures)
/// - With retry/recovery actions
///
/// Usage:
/// ```dart
/// // Full page via factory
/// ErrorDisplay.notFound(requestedPath: '/bad-route');
///
/// // Custom error with retry
/// ErrorDisplay(
///   errorCode: 'LOAD_FAILED',
///   title: 'Failed to Load Data',
///   description: error.message,
///   icon: Icons.cloud_off,
///   actions: [ErrorAction.retry(onRetry: _loadData)],
///   isAuthenticated: authProvider.isAuthenticated,
///   onNavigate: (route) => Navigator.pushNamed(context, route),
/// );
/// ```
class ErrorDisplay extends StatelessWidget {
  final String errorCode;
  final String title;
  final String description;
  final IconData icon;
  final Color? iconColor;
  final List<ErrorAction>? actions;
  final List<ErrorAction> Function(bool isAuthenticated)? actionsBuilder;
  final bool showAuthStatus;
  final String? requestedPath;

  /// Whether user is authenticated (controls which actions to show)
  /// Defaults to false if not provided
  final bool isAuthenticated;

  /// User email for auth status display (optional)
  final String? userEmail;

  /// Callback for navigation actions
  /// If not provided, uses Navigator.pushNamed
  final void Function(String route)? onNavigate;

  const ErrorDisplay({
    super.key,
    required this.errorCode,
    required this.title,
    required this.description,
    required this.icon,
    this.isAuthenticated = false,
    this.onNavigate,
    this.iconColor,
    this.actions,
    this.actionsBuilder,
    this.showAuthStatus = false,
    this.requestedPath,
    this.userEmail,
  }) : assert(
         actions != null || actionsBuilder != null,
         'Either actions or actionsBuilder must be provided',
       );

  /// Internal navigation that falls back to Navigator if no callback provided
  void _navigate(BuildContext context, String route) {
    if (onNavigate != null) {
      onNavigate!(route);
    } else {
      Navigator.of(context).pushNamed(route);
    }
  }

  /// Factory: 404 Not Found
  /// Shows "Go Home" only if user is authenticated
  factory ErrorDisplay.notFound({
    bool isAuthenticated = false,
    void Function(String route)? onNavigate,
    String? requestedPath,
    String? userEmail,
  }) {
    return ErrorDisplay(
      errorCode: '404',
      title: AppConstants.error404Title,
      description: AppConstants.error404Description,
      icon: Icons.search_off_rounded,
      iconColor: AppColors.warning,
      showAuthStatus: true,
      isAuthenticated: isAuthenticated,
      onNavigate: onNavigate,
      userEmail: userEmail,
      requestedPath: requestedPath,
      actionsBuilder: (isAuth) => [
        if (isAuth)
          ErrorAction.navigate(
            label: AppConstants.actionGoHome,
            route: AppRoutes.home,
            icon: Icons.home_rounded,
            isPrimary: true,
            requiresAuth: true,
          ),
        ErrorAction.navigate(
          label: isAuth
              ? AppConstants.actionBackToLogin
              : AppConstants.actionGoToLogin,
          route: AppRoutes.login,
          icon: Icons.login_rounded,
          isPrimary: !isAuth,
        ),
      ],
    );
  }

  /// Factory: 403 Unauthorized/Access Denied
  /// This means user IS authenticated but lacks permission - show Home button
  factory ErrorDisplay.unauthorized({
    bool isAuthenticated = false,
    void Function(String route)? onNavigate,
    String? message,
    String? userEmail,
  }) {
    return ErrorDisplay(
      errorCode: '403',
      title: AppConstants.error403Title,
      description: message ?? AppConstants.error403Description,
      icon: Icons.lock_outline_rounded,
      iconColor: AppColors.error,
      showAuthStatus: true,
      isAuthenticated: isAuthenticated,
      onNavigate: onNavigate,
      userEmail: userEmail,
      actionsBuilder: (isAuth) => [
        if (isAuth)
          ErrorAction.navigate(
            label: AppConstants.actionGoHome,
            route: AppRoutes.home,
            icon: Icons.home_rounded,
            isPrimary: true,
            requiresAuth: true,
          ),
        ErrorAction.navigate(
          label: AppConstants.actionBackToLogin,
          route: AppRoutes.login,
          icon: Icons.login_rounded,
          isPrimary: !isAuth,
        ),
      ],
    );
  }

  /// Factory: 500 Error / Generic Error
  /// Shows "Go Home" only if user is authenticated
  /// Supports optional retry callback
  factory ErrorDisplay.error({
    bool isAuthenticated = false,
    void Function(String route)? onNavigate,
    String? title,
    String? message,
    String? userEmail,
    Future<void> Function(BuildContext)? onRetry,
  }) {
    return ErrorDisplay(
      errorCode: '500',
      title: title ?? AppConstants.error500Title,
      description: message ?? AppConstants.error500Description,
      icon: Icons.error_outline_rounded,
      iconColor: AppColors.errorDark,
      isAuthenticated: isAuthenticated,
      onNavigate: onNavigate,
      userEmail: userEmail,
      showAuthStatus: true,
      actionsBuilder: (isAuthenticated) => [
        if (onRetry != null)
          ErrorAction.retry(onRetry: onRetry, label: AppConstants.actionRetry),
        if (isAuthenticated)
          ErrorAction.navigate(
            label: AppConstants.actionGoHome,
            route: AppRoutes.home,
            icon: Icons.home_rounded,
            isPrimary: onRetry == null,
            requiresAuth: true,
          ),
        ErrorAction.navigate(
          label: isAuthenticated
              ? AppConstants.actionBackToLogin
              : AppConstants.actionGoToLogin,
          route: AppRoutes.login,
          icon: Icons.login_rounded,
          isPrimary: !isAuthenticated && onRetry == null,
        ),
        ErrorAction.contactSupport(supportEmail: AppConstants.supportEmail),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spacing = context.spacing;

    // Build actions dynamically based on auth state (prop-driven)
    final builtActions = actionsBuilder?.call(isAuthenticated) ?? actions!;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(spacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Error Code
              Text(
                errorCode,
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: iconColor ?? theme.colorScheme.error,
                  letterSpacing: 2,
                ),
              ),

              SizedBox(height: spacing.md),

              // Icon
              Icon(
                icon,
                color: iconColor ?? theme.colorScheme.error,
                size: 100,
              ),

              SizedBox(height: spacing.lg),

              // Title + Description (molecule)
              ErrorMessage(title: title, description: description),

              // Optional: Requested Path (selectable)
              if (requestedPath != null) ...[
                SizedBox(height: spacing.md),
                SelectableText(
                  'Path: $requestedPath',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],

              // Optional: Auth Status (prop-driven)
              if (showAuthStatus) ...[
                SizedBox(height: spacing.md),
                Text(
                  isAuthenticated && userEmail != null
                      ? '✅ ${AppConstants.statusAuthenticated}: $userEmail'
                      : '🔓 ${AppConstants.statusNotAuthenticated}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],

              SizedBox(height: spacing.xl),

              // Action Buttons - convert ErrorActions to ButtonConfigs
              ButtonGroup.horizontal(
                buttons: builtActions
                    .map(
                      (action) => action.toButtonConfig(
                        onTap: () async {
                          if (action.route != null) {
                            _navigate(context, action.route!);
                          } else if (action.onPressed != null) {
                            await action.onPressed!(context);
                          }
                        },
                      ),
                    )
                    .toList(),
                alignment: MainAxisAlignment.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
