// Helper: AsyncDataWidget - Flutter-native async data loading with built-in error handling
// Wraps FutureBuilder pattern with ErrorCard, loading states, and retry logic

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../molecules/error_card.dart';
import '../molecules/buttons/button_group.dart';

/// AsyncDataWidget - Idiomatic Flutter async data loading
///
/// This is THE Flutter way to handle async data with errors.
/// Uses FutureBuilder internally with proper error states.
///
/// **NOT** an "error boundary" (that's React) - this is Flutter's
/// FutureBuilder pattern with convenience methods.
///
/// Usage:
/// ```dart
/// AsyncDataWidget<List<User>>(
///   future: _loadUsers(),
///   builder: (context, users) => UserList(users: users),
///   errorTitle: 'Failed to Load Users',
/// );
/// ```
class AsyncDataWidget<T> extends StatelessWidget {
  /// The future to execute
  final Future<T> future;

  /// Builder for success state
  final Widget Function(BuildContext context, T data) builder;

  /// Optional custom loading widget
  final Widget? loadingWidget;

  /// Optional custom error widget builder
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Error card title (if using default error display)
  final String? errorTitle;

  /// Retry callback - called when retry button pressed
  final Future<T> Function()? onRetry;

  const AsyncDataWidget({
    super.key,
    required this.future,
    required this.builder,
    this.loadingWidget,
    this.errorBuilder,
    this.errorTitle,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        // Loading state
        if (snapshot.connectionState == ConnectionState.waiting) {
          return loadingWidget ??
              const Center(child: CircularProgressIndicator());
        }

        // Error state - THE FLUTTER WAY!
        if (snapshot.hasError) {
          final error = snapshot.error!;

          // Custom error builder if provided
          if (errorBuilder != null) {
            return errorBuilder!(error, () {
              // Force rebuild with new future on retry
              // This is idiomatic Flutter!
            });
          }

          // Default: Show ErrorCard
          return Center(
            child: Padding(
              padding: context.spacing.paddingMD,
              child: ErrorCard(
                title: errorTitle ?? 'Failed to Load Data',
                message: error.toString(),
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
            ),
          );
        }

        // Success state
        if (snapshot.hasData) {
          return builder(context, snapshot.data as T);
        }

        // No data yet (shouldn't happen with FutureBuilder but handle it)
        return const SizedBox.shrink();
      },
    );
  }
}

/// StreamDataWidget - For real-time data streams
///
/// Flutter-native StreamBuilder pattern with error handling.
///
/// Usage:
/// ```dart
/// StreamDataWidget<List<Message>>(
///   stream: _messageStream,
///   builder: (context, messages) => MessageList(messages: messages),
///   errorTitle: 'Connection Lost',
/// );
/// ```
class StreamDataWidget<T> extends StatelessWidget {
  /// The stream to listen to
  final Stream<T> stream;

  /// Builder for success state with data
  final Widget Function(BuildContext context, T data) builder;

  /// Optional initial data
  final T? initialData;

  /// Optional custom loading widget
  final Widget? loadingWidget;

  /// Optional custom error widget builder
  final Widget Function(Object error)? errorBuilder;

  /// Error card title (if using default error display)
  final String? errorTitle;

  const StreamDataWidget({
    super.key,
    required this.stream,
    required this.builder,
    this.initialData,
    this.loadingWidget,
    this.errorBuilder,
    this.errorTitle,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<T>(
      stream: stream,
      initialData: initialData,
      builder: (context, snapshot) {
        // Error state
        if (snapshot.hasError) {
          final error = snapshot.error!;

          // Custom error builder if provided
          if (errorBuilder != null) {
            return errorBuilder!(error);
          }

          // Default: Show ErrorCard
          return Center(
            child: Padding(
              padding: context.spacing.paddingMD,
              child: ErrorCard(
                title: errorTitle ?? 'Stream Error',
                message: error.toString(),
              ),
            ),
          );
        }

        // Loading state (waiting for first data)
        if (!snapshot.hasData) {
          return loadingWidget ??
              const Center(child: CircularProgressIndicator());
        }

        // Success state with data
        return builder(context, snapshot.data as T);
      },
    );
  }
}

/// StatefulAsyncWidget - For complex async operations with state
///
/// Use this when you need retry logic, refresh, or state management.
///
/// Usage:
/// ```dart
/// class UserListWidget extends StatefulAsyncWidget<List<User>> {
///   @override
///   Future<List<User>> loadData() => _apiService.fetchUsers();
///
///   @override
///   Widget buildData(BuildContext context, List<User> users) {
///     return UserList(users: users);
///   }
/// }
/// ```
abstract class StatefulAsyncWidget<T> extends StatefulWidget {
  const StatefulAsyncWidget({super.key});

  /// Override this to load your data
  Future<T> loadData();

  /// Override this to build UI with loaded data
  Widget buildData(BuildContext context, T data);

  /// Optional: Custom error title
  String get errorTitle => 'Failed to Load Data';

  /// Optional: Custom loading widget
  Widget buildLoading(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }

  /// Optional: Custom error widget
  Widget buildError(BuildContext context, Object error, VoidCallback retry) {
    return Center(
      child: Padding(
        padding: context.spacing.paddingMD,
        child: ErrorCard(
          title: errorTitle,
          message: error.toString(),
          buttons: [
            ButtonConfig(
              label: 'Retry',
              icon: Icons.refresh,
              onPressed: retry,
              isPrimary: true,
            ),
          ],
        ),
      ),
    );
  }

  @override
  State<StatefulAsyncWidget<T>> createState() => _StatefulAsyncWidgetState<T>();
}

class _StatefulAsyncWidgetState<T> extends State<StatefulAsyncWidget<T>> {
  late Future<T> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.loadData();
  }

  void _retry() {
    setState(() {
      _future = widget.loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return widget.buildLoading(context);
        }

        if (snapshot.hasError) {
          return widget.buildError(context, snapshot.error!, _retry);
        }

        if (snapshot.hasData) {
          return widget.buildData(context, snapshot.data as T);
        }

        return const SizedBox.shrink();
      },
    );
  }
}
