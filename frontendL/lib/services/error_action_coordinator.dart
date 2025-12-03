/// ErrorActionCoordinator - Coordinates error recovery actions
///
/// SINGLE RESPONSIBILITY: Handle error action side effects
/// Coordinates navigation, notifications, external URLs
///
/// This is a SERVICE - it performs side effects!
/// Molecules should NOT call this - organisms coordinate actions!
library;

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/notification_service.dart';

/// Configuration for an error action button
class ErrorActionConfig {
  final String id;
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final Future<void> Function(BuildContext)? onTapAsync;
  final bool isPrimary;

  const ErrorActionConfig({
    required this.id,
    required this.label,
    required this.icon,
    this.onTap,
    this.onTapAsync,
    this.isPrimary = false,
  });
}

class ErrorActionCoordinator {
  /// Navigate to home page
  static Future<void> goHome(BuildContext context) async {
    Navigator.of(context).pushReplacementNamed('/');
  }

  /// Navigate back
  static void goBack(BuildContext context) {
    Navigator.of(context).pop();
  }

  /// Retry an async operation with loading state and error handling
  ///
  /// Returns true if successful, false if failed
  static Future<bool> retryOperation(
    BuildContext context,
    Future<void> Function(BuildContext) operation,
  ) async {
    try {
      await operation(context);
      return true;
    } catch (error) {
      // Check if context is still mounted before using it
      if (context.mounted) {
        NotificationService.showError(
          context,
          'Retry failed: ${error.toString()}',
        );
      }
      return false;
    }
  }

  /// Open support email with error details
  static Future<void> contactSupport(
    BuildContext context, {
    String? errorDetails,
  }) async {
    final subject = Uri.encodeComponent('Error Report');
    final body = errorDetails != null
        ? Uri.encodeComponent('Error details:\n\n$errorDetails')
        : '';

    final emailUri = Uri.parse(
      'mailto:support@trossapp.com?subject=$subject&body=$body',
    );

    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    } else {
      // Check if context is still valid before using it
      if (context.mounted) {
        NotificationService.showError(
          context,
          'Could not open email client. Please email support@trossapp.com',
        );
      }
    }
  }

  /// Open external help/documentation URL
  static Future<void> openHelp(
    BuildContext context, {
    String helpUrl = 'https://help.trossapp.com',
  }) async {
    final uri = Uri.parse(helpUrl);

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        NotificationService.showError(context, 'Could not open help page');
      }
    }
  }

  /// Show success notification after retry
  static void showRetrySuccess(BuildContext context) {
    NotificationService.showInfo(context, 'Operation completed successfully');
  }

  /// Create standard error action configs
  static List<ErrorActionConfig> getStandardActions({
    Future<void> Function(BuildContext)? onRetry,
    bool showHome = true,
    bool showBack = false,
    bool showSupport = false,
  }) {
    final actions = <ErrorActionConfig>[];

    if (onRetry != null) {
      actions.add(
        ErrorActionConfig(
          id: 'retry',
          label: 'Retry',
          icon: Icons.refresh,
          onTapAsync: onRetry,
          isPrimary: true,
        ),
      );
    }

    if (showHome) {
      actions.add(
        ErrorActionConfig(
          id: 'home',
          label: 'Go Home',
          icon: Icons.home,
          onTapAsync: goHome,
        ),
      );
    }

    if (showBack) {
      actions.add(
        ErrorActionConfig(
          id: 'back',
          label: 'Go Back',
          icon: Icons.arrow_back,
          onTap: () {}, // Context passed via organism
        ),
      );
    }

    if (showSupport) {
      actions.add(
        ErrorActionConfig(
          id: 'support',
          label: 'Contact Support',
          icon: Icons.support_agent,
          onTapAsync: (context) => contactSupport(context),
        ),
      );
    }

    return actions;
  }
}
