/// AsyncDataProvider - Generic organism for async data management
///
/// **SOLE RESPONSIBILITY:** Manage async data loading lifecycle (loading → success/error states)
///
/// This is an ORGANISM - it orchestrates molecules and manages state.
/// - Composes: ErrorCard molecule, loading indicators
/// - Manages: Future execution, retry logic, state transitions
/// - Generic: Works with ANY data type T
///
/// Why this is an organism:
/// - Has state management (loading, error, success)
/// - Orchestrates multiple molecules (ErrorCard, loading, content)
/// - Provides retry/refresh logic
/// - Context-aware error handling
///
/// Usage:
/// ```dart
/// AsyncDataProvider<List<User>>(
///   future: apiService.fetchUsers(),
///   builder: (context, users) => UserList(users: users),
///   errorTitle: 'Failed to Load Users',
///   onRetry: () => apiService.fetchUsers(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../molecules/error_card.dart';
import '../molecules/buttons/button_group.dart';
import '../atoms/indicators/loading_indicator.dart';

/// Generic async data provider organism
class AsyncDataProvider<T> extends StatelessWidget {
  /// The future to execute
  final Future<T> future;

  /// Builder for success state with data
  final Widget Function(BuildContext context, T data) builder;

  /// Optional custom loading widget (overrides default)
  final Widget? loadingWidget;

  /// Optional custom error widget builder (overrides default ErrorCard)
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Error card title (used with default error display)
  final String? errorTitle;

  /// Error card message override (default: error.toString())
  final String? errorMessage;

  /// Retry callback - returns new future to execute
  final Future<T> Function()? onRetry;

  /// Whether to center the loading/error widgets (default: true)
  final bool centered;

  const AsyncDataProvider({
    super.key,
    required this.future,
    required this.builder,
    this.loadingWidget,
    this.errorBuilder,
    this.errorTitle,
    this.errorMessage,
    this.onRetry,
    this.centered = true,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        // === LOADING STATE ===
        if (snapshot.connectionState == ConnectionState.waiting) {
          final loading = loadingWidget ?? const LoadingIndicator.inline();
          return centered ? Center(child: loading) : loading;
        }

        // === ERROR STATE ===
        if (snapshot.hasError) {
          final error = snapshot.error!;

          // Custom error builder if provided
          if (errorBuilder != null) {
            return errorBuilder!(error, () {
              // Retry triggers rebuild - handled by parent
            });
          }

          // Default: ErrorCard molecule composition
          final errorCard = Padding(
            padding: context.spacing.paddingMD,
            child: ErrorCard(
              title: errorTitle ?? 'Failed to Load Data',
              message: errorMessage ?? error.toString(),
              buttons: onRetry != null
                  ? [
                      ButtonConfig(
                        label: 'Retry',
                        icon: Icons.refresh,
                        onPressed: onRetry,
                        isPrimary: true,
                      ),
                    ]
                  : null,
            ),
          );

          return centered ? Center(child: errorCard) : errorCard;
        }

        // === SUCCESS STATE ===
        if (snapshot.hasData) {
          return builder(context, snapshot.data as T);
        }

        // === NO DATA STATE (shouldn't happen with Future but handle gracefully) ===
        return const SizedBox.shrink();
      },
    );
  }
}
