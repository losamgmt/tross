// Organism: Error Display - Unified error handling UI for all error states
// Part of the Error Display System - provides graceful error recovery UX
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_spacing.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../core/routing/app_routes.dart';
import '../../providers/auth_provider.dart';
import '../../services/navigation_coordinator.dart';
import '../atoms/icons/error_icon.dart';
import '../atoms/text/error_code_text.dart';
import '../molecules/error_message.dart';
import '../molecules/buttons/error_action_compat.dart';
import '../molecules/buttons/button_group.dart';

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

  const ErrorDisplay({
    super.key,
    required this.errorCode,
    required this.title,
    required this.description,
    required this.icon,
    this.iconColor,
    this.actions,
    this.actionsBuilder,
    this.showAuthStatus = false,
    this.requestedPath,
  }) : assert(
         actions != null || actionsBuilder != null,
         'Either actions or actionsBuilder must be provided',
       );

  /// Factory: 404 Not Found
  /// Shows "Go Home" only if user is authenticated
  factory ErrorDisplay.notFound({String? requestedPath}) {
    return ErrorDisplay(
      errorCode: '404',
      title: AppConstants.error404Title,
      description: AppConstants.error404Description,
      icon: Icons.search_off_rounded,
      iconColor: AppColors.warning,
      showAuthStatus: true,
      requestedPath: requestedPath,
      actionsBuilder: (isAuthenticated) => [
        if (isAuthenticated)
          ErrorAction.navigate(
            label: AppConstants.actionGoHome,
            route: AppRoutes.home,
            icon: Icons.home_rounded,
            isPrimary: true,
            requiresAuth: true,
          ),
        ErrorAction.navigate(
          label: isAuthenticated
              ? AppConstants.actionBackToLogin
              : AppConstants.actionGoToLogin,
          route: AppRoutes.login,
          icon: Icons.login_rounded,
          isPrimary: !isAuthenticated,
        ),
      ],
    );
  }

  /// Factory: 403 Unauthorized/Access Denied
  /// This means user IS authenticated but lacks permission - show Home button
  factory ErrorDisplay.unauthorized({String? message}) {
    return ErrorDisplay(
      errorCode: '403',
      title: AppConstants.error403Title,
      description: message ?? AppConstants.error403Description,
      icon: Icons.lock_outline_rounded,
      iconColor: AppColors.error,
      showAuthStatus: true,
      actionsBuilder: (isAuthenticated) => [
        if (isAuthenticated)
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
          isPrimary: !isAuthenticated,
        ),
      ],
    );
  }

  /// Factory: 500 Error / Generic Error
  /// Shows "Go Home" only if user is authenticated
  /// Supports optional retry callback
  factory ErrorDisplay.error({
    String? title,
    String? message,
    Future<void> Function(BuildContext)? onRetry,
  }) {
    return ErrorDisplay(
      errorCode: '500',
      title: title ?? AppConstants.error500Title,
      description: message ?? AppConstants.error500Description,
      icon: Icons.error_outline_rounded,
      iconColor: AppColors.errorDark,
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

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(spacing.lg),
          child: Consumer<AuthProvider>(
            builder: (context, authProvider, _) {
              final isAuthenticated = authProvider.isAuthenticated;

              // Build actions dynamically based on auth state
              final builtActions =
                  actionsBuilder?.call(isAuthenticated) ?? actions!;

              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Error Code (atom)
                  ErrorCodeText(code: errorCode, color: iconColor),

                  SizedBox(height: spacing.md),

                  // Icon (atom)
                  ErrorIcon(icon: icon, color: iconColor, size: 100),

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
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.6,
                        ),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],

                  // Optional: Auth Status
                  if (showAuthStatus) ...[
                    SizedBox(height: spacing.md),
                    Text(
                      isAuthenticated && authProvider.user?['email'] != null
                          ? '✅ ${AppConstants.statusAuthenticated}: ${authProvider.user!['email']}'
                          : '🔓 ${AppConstants.statusNotAuthenticated}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.6,
                        ),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],

                  SizedBox(height: spacing.xl),

                  // Action Buttons - convert ErrorActions to ButtonConfigs
                  // Organism handles async/navigation, molecule just renders
                  ButtonGroup.horizontal(
                    buttons: builtActions
                        .map(
                          (action) => action.toButtonConfig(
                            onTap: () async {
                              if (action.route != null) {
                                NavigationCoordinator.navigateTo(
                                  context,
                                  action.route!,
                                );
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
              );
            },
          ),
        ),
      ),
    );
  }
}
