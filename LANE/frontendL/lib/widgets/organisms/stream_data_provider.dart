/// StreamDataProvider - Generic organism for real-time stream data management
///
/// **SOLE RESPONSIBILITY:** Manage stream data lifecycle (waiting → data/error states)
///
/// This is an ORGANISM - it orchestrates molecules and manages stream state.
/// - Composes: ErrorCard molecule, loading indicators
/// - Manages: Stream subscription, state transitions
/// - Generic: Works with ANY data type T
///
/// Why this is an organism:
/// - Has state management (waiting, error, data)
/// - Orchestrates multiple molecules (ErrorCard, loading, content)
/// - Manages stream subscription lifecycle
/// - Context-aware error handling
///
/// Usage:
/// ```dart
/// StreamDataProvider<List<Message>>(
///   stream: messageService.messagesStream,
///   builder: (context, messages) => MessageList(messages: messages),
///   errorTitle: 'Connection Lost',
///   initialData: <Message>[],
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';
import '../molecules/error_card.dart';
import '../atoms/indicators/loading_indicator.dart';

/// Generic stream data provider organism
class StreamDataProvider<T> extends StatelessWidget {
  /// The stream to listen to
  final Stream<T> stream;

  /// Builder for success state with data
  final Widget Function(BuildContext context, T data) builder;

  /// Optional initial data (shows immediately while waiting for stream)
  final T? initialData;

  /// Optional custom loading widget (overrides default)
  final Widget? loadingWidget;

  /// Optional custom error widget builder (overrides default ErrorCard)
  final Widget Function(Object error)? errorBuilder;

  /// Error card title (used with default error display)
  final String? errorTitle;

  /// Error card message override (default: error.toString())
  final String? errorMessage;

  /// Whether to center the loading/error widgets (default: true)
  final bool centered;

  const StreamDataProvider({
    super.key,
    required this.stream,
    required this.builder,
    this.initialData,
    this.loadingWidget,
    this.errorBuilder,
    this.errorTitle,
    this.errorMessage,
    this.centered = true,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<T>(
      stream: stream,
      initialData: initialData,
      builder: (context, snapshot) {
        // === ERROR STATE ===
        if (snapshot.hasError) {
          final error = snapshot.error!;

          // Custom error builder if provided
          if (errorBuilder != null) {
            return errorBuilder!(error);
          }

          // Default: ErrorCard molecule composition
          final errorCard = Padding(
            padding: context.spacing.paddingMD,
            child: ErrorCard(
              title: errorTitle ?? 'Stream Error',
              message: errorMessage ?? error.toString(),
            ),
          );

          return centered ? Center(child: errorCard) : errorCard;
        }

        // === LOADING STATE (waiting for first data) ===
        if (!snapshot.hasData) {
          final loading = loadingWidget ?? const LoadingIndicator.inline();
          return centered ? Center(child: loading) : loading;
        }

        // === SUCCESS STATE (has data) ===
        return builder(context, snapshot.data as T);
      },
    );
  }
}
