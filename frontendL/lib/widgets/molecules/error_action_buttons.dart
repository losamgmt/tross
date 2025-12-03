// Molecule: Error Action Buttons
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_spacing.dart';
import '../atoms/atoms.dart';
import '../../services/notification_service.dart';

/// Represents a single action on an error page
/// Supports both navigation and async callbacks (e.g., retry)
class ErrorAction {
  final String label;
  final String? route; // Nullable - use route OR onPressed
  final Future<void> Function(BuildContext)? onPressed; // Async action
  final IconData? icon;
  final bool isPrimary;
  final bool requiresAuth; // Only show if user is authenticated

  const ErrorAction({
    required this.label,
    this.route,
    this.onPressed,
    this.icon,
    this.isPrimary = false,
    this.requiresAuth = false,
  }) : assert(
         route != null || onPressed != null,
         'Either route or onPressed must be provided',
       );

  /// Factory: Navigate to route
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

  /// Factory: Retry action (async callback)
  factory ErrorAction.retry({
    required Future<void> Function(BuildContext) onRetry,
    String label = 'Retry',
    IconData? icon,
  }) {
    return ErrorAction(
      label: label,
      onPressed: onRetry,
      icon: icon ?? Icons.refresh_rounded,
      isPrimary: true,
      requiresAuth: false,
    );
  }

  /// Factory: Contact support
  factory ErrorAction.contactSupport({
    required String supportEmail,
    String label = 'Contact Support',
  }) {
    return ErrorAction(
      label: label,
      onPressed: (context) async {
        final uri = Uri(
          scheme: 'mailto',
          path: supportEmail,
          query: 'subject=TrossApp Support Request',
        );

        try {
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri);
          } else {
            // Fallback: Show email in notification if can't launch email client
            if (context.mounted) {
              NotificationService.showInfo(
                context,
                'Email us at: $supportEmail',
              );
            }
          }
        } catch (e) {
          if (context.mounted) {
            NotificationService.showInfo(
              context,
              'Contact us at: $supportEmail',
            );
          }
        }
      },
      icon: Icons.support_agent_rounded,
      isPrimary: false,
      requiresAuth: false,
    );
  }
}

/// Displays action buttons for error pages
/// Supports async actions with loading states
class ErrorActionButtons extends StatelessWidget {
  final List<ErrorAction> actions;

  const ErrorActionButtons({super.key, required this.actions});

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Wrap(
      spacing: spacing.md,
      runSpacing: spacing.sm,
      alignment: WrapAlignment.center,
      children: actions.map((action) => _ActionButton(action: action)).toList(),
    );
  }
}

/// Individual action button with loading state support
class _ActionButton extends StatefulWidget {
  final ErrorAction action;

  const _ActionButton({required this.action});

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool _isLoading = false;

  Future<void> _handlePress(BuildContext context) async {
    // Handle navigation
    if (widget.action.route != null) {
      Navigator.pushNamed(context, widget.action.route!);
      return;
    }

    // Handle async action
    if (widget.action.onPressed != null) {
      setState(() => _isLoading = true);

      final messenger = ScaffoldMessenger.of(context);
      try {
        await widget.action.onPressed!(context);
      } catch (error) {
        if (mounted) {
          setState(() => _isLoading = false);
          messenger.showSnackBar(
            ErrorSnackBar(message: 'Action failed: $error'),
          );
        }
        return;
      }

      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    Widget child;
    if (_isLoading) {
      child = SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(
            widget.action.isPrimary
                ? Colors.white
                : Theme.of(context).colorScheme.primary,
          ),
        ),
      );
    } else if (widget.action.icon != null) {
      child = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(widget.action.icon, size: 18),
          SizedBox(width: spacing.xs),
          Text(widget.action.label),
        ],
      );
    } else {
      child = Text(widget.action.label);
    }

    if (widget.action.isPrimary) {
      return ElevatedButton(
        onPressed: _isLoading ? null : () => _handlePress(context),
        child: child,
      );
    } else {
      return OutlinedButton(
        onPressed: _isLoading ? null : () => _handlePress(context),
        child: child,
      );
    }
  }
}
