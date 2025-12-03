/// RefreshableDataProvider - Stateful organism for refreshable async data
///
/// **SOLE RESPONSIBILITY:** Manage async data with refresh/retry capability
///
/// This is an ORGANISM - it manages stateful async operations.
/// - Composes: AsyncDataProvider organism
/// - Manages: Refresh state, retry logic, data reloading
/// - Generic: Works with ANY data type T
/// - Provides: Refresh trigger for parent widgets
///
/// Why this is an organism:
/// - Has internal state (current future)
/// - Orchestrates AsyncDataProvider
/// - Manages refresh lifecycle
/// - Exposes refresh method to parents
///
/// Usage:
/// ```dart
/// final refreshKey = GlobalKey<RefreshableDataProviderState<List<User>>>();
///
/// RefreshableDataProvider<List<User>>(
///   key: refreshKey,
///   loadData: () => apiService.fetchUsers(),
///   builder: (context, users) => UserList(users: users),
///   errorTitle: 'Failed to Load Users',
/// )
///
/// // Trigger refresh from parent:
/// refreshKey.currentState?.refresh();
/// ```
library;

import 'package:flutter/material.dart';
import 'async_data_provider.dart';

/// Refreshable async data provider organism with state
class RefreshableDataProvider<T> extends StatefulWidget {
  /// Function that loads/reloads the data
  final Future<T> Function() loadData;

  /// Builder for success state with data
  final Widget Function(BuildContext context, T data) builder;

  /// Optional custom loading widget
  final Widget? loadingWidget;

  /// Optional custom error widget builder
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Error card title
  final String? errorTitle;

  /// Error card message override
  final String? errorMessage;

  /// Whether to center loading/error widgets
  final bool centered;

  /// Optional callback when data loads successfully
  final void Function(T data)? onDataLoaded;

  /// Optional callback when error occurs
  final void Function(Object error)? onError;

  const RefreshableDataProvider({
    super.key,
    required this.loadData,
    required this.builder,
    this.loadingWidget,
    this.errorBuilder,
    this.errorTitle,
    this.errorMessage,
    this.centered = true,
    this.onDataLoaded,
    this.onError,
  });

  @override
  RefreshableDataProviderState<T> createState() =>
      RefreshableDataProviderState<T>();
}

/// Public state class to expose refresh method
class RefreshableDataProviderState<T>
    extends State<RefreshableDataProvider<T>> {
  late Future<T> _future;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _future = _loadDataWithCallbacks();
  }

  /// Public method to trigger refresh from parent
  Future<void> refresh() async {
    if (_isRefreshing) return; // Prevent concurrent refreshes

    setState(() {
      _isRefreshing = true;
      _future = _loadDataWithCallbacks();
    });

    try {
      await _future;
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  /// Wraps loadData with success/error callbacks
  Future<T> _loadDataWithCallbacks() async {
    try {
      final data = await widget.loadData();
      widget.onDataLoaded?.call(data);
      return data;
    } catch (error) {
      widget.onError?.call(error);
      rethrow; // Re-throw so AsyncDataProvider handles error state
    }
  }

  /// Internal retry handler
  Future<T> _retry() async {
    setState(() {
      _future = _loadDataWithCallbacks();
    });
    return _future;
  }

  @override
  Widget build(BuildContext context) {
    // Compose AsyncDataProvider organism
    return AsyncDataProvider<T>(
      future: _future,
      builder: widget.builder,
      loadingWidget: widget.loadingWidget,
      errorBuilder: widget.errorBuilder,
      errorTitle: widget.errorTitle,
      errorMessage: widget.errorMessage,
      onRetry: _retry,
      centered: widget.centered,
    );
  }
}
