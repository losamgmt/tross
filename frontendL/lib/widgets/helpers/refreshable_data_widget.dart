/// RefreshableDataWidget - Helper for auto-refreshing async data
///
/// Wraps AsyncDataWidget with automatic refresh capability.
/// Handles timer management, refresh state, and prevents layout shift.
///
/// **SRP**: Single responsibility - manage refresh lifecycle
/// **Reusable**: Use across all organisms/pages needing auto-refresh
/// **Composable**: Wraps existing AsyncDataWidget (no duplication)
///
/// Usage:
/// ```dart
/// RefreshableDataWidget<DatabasesHealthResponse>(
///   fetchData: () => healthService.fetchHealth(),
///   autoRefresh: true,
///   refreshInterval: Duration(seconds: 30),
///   builder: (context, data, isRefreshing, onRefresh) {
///     return Column(
///       children: [
///         // Show refresh indicator in UI
///         if (isRefreshing) CircularProgressIndicator(),
///         // Render your data
///         YourDataDisplay(data: data),
///       ],
///     );
///   },
/// )
/// ```
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'async_data_widget.dart';

/// Builder function that receives data, refresh state, and refresh callback
typedef RefreshableBuilder<T> =
    Widget Function(
      BuildContext context,
      T data,
      bool isRefreshing,
      VoidCallback onRefresh,
    );

/// Helper widget for data that needs periodic refresh
///
/// Encapsulates:
/// - Auto-refresh timer management
/// - Manual refresh triggering
/// - Refresh state tracking (for UI indicators)
/// - Layout stability (no content replacement on refresh)
class RefreshableDataWidget<T> extends StatefulWidget {
  /// Function to fetch data
  final Future<T> Function() fetchData;

  /// Builder for rendering data with refresh capability
  final RefreshableBuilder<T> builder;

  /// Whether to enable automatic refresh
  final bool autoRefresh;

  /// Interval between auto-refreshes
  final Duration refreshInterval;

  /// Optional loading widget (initial load only)
  final Widget? loadingWidget;

  /// Optional error builder
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Callback when refresh is triggered (for logging, analytics, etc)
  final VoidCallback? onRefresh;

  const RefreshableDataWidget({
    super.key,
    required this.fetchData,
    required this.builder,
    this.autoRefresh = false,
    this.refreshInterval = const Duration(seconds: 30),
    this.loadingWidget,
    this.errorBuilder,
    this.onRefresh,
  });

  @override
  State<RefreshableDataWidget<T>> createState() =>
      _RefreshableDataWidgetState<T>();
}

class _RefreshableDataWidgetState<T> extends State<RefreshableDataWidget<T>> {
  Timer? _refreshTimer;
  Timer? _resetRefreshingTimer;
  bool _isRefreshing = false;
  late Future<T> _dataFuture;

  @override
  void initState() {
    super.initState();
    _dataFuture = widget.fetchData();
    if (widget.autoRefresh) {
      _startAutoRefresh();
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _resetRefreshingTimer?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(RefreshableDataWidget<T> oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Restart auto-refresh if settings changed
    if (widget.autoRefresh != oldWidget.autoRefresh ||
        widget.refreshInterval != oldWidget.refreshInterval) {
      _refreshTimer?.cancel();
      if (widget.autoRefresh) {
        _startAutoRefresh();
      }
    }
  }

  void _startAutoRefresh() {
    _refreshTimer = Timer.periodic(widget.refreshInterval, (_) {
      _handleRefresh();
    });
  }

  void _handleRefresh() {
    setState(() {
      _isRefreshing = true;
      _dataFuture = widget.fetchData();
    });
    widget.onRefresh?.call();

    // Reset refreshing state after data loads
    // (or after timeout to prevent stuck state)
    _resetRefreshingTimer?.cancel();
    _resetRefreshingTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() => _isRefreshing = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AsyncDataWidget<T>(
      future: _dataFuture,
      loadingWidget: widget.loadingWidget,
      errorBuilder: widget.errorBuilder,
      builder: (context, data) {
        return widget.builder(context, data, _isRefreshing, _handleRefresh);
      },
    );
  }
}
