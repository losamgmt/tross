/// Silent Error Service for Testing
///
/// Replaces ErrorService during tests to prevent console pollution.
/// Captures logs for assertion instead of printing them.
///
/// Usage:
/// ```dart
/// import 'package:tross_app/test/helpers/silent_error_service.dart';
///
/// void main() {
///   late SilentErrorService errorService;
///
///   setUp(() {
///     errorService = SilentErrorService();
///     // Optionally replace global ErrorService if needed
///   });
///
///   test('error logging', () {
///     errorService.logError('Test error', context: {'key': 'value'});
///
///     expect(errorService.errorLogs, hasLength(1));
///     expect(errorService.errorLogs.first.message, equals('Test error'));
///     expect(errorService.errorLogs.first.context?['key'], equals('value'));
///   });
///
///   tearDown(() {
///     errorService.clear();
///   });
/// }
/// ```
library;

/// Captured log entry
class LogEntry {
  final String message;
  final Map<String, dynamic>? context;
  final Object? error;
  final StackTrace? stackTrace;
  final DateTime timestamp;
  final LogLevel level;

  LogEntry({
    required this.message,
    this.context,
    this.error,
    this.stackTrace,
    required this.level,
  }) : timestamp = DateTime.now();

  @override
  String toString() {
    return '[${level.name.toUpperCase()}] $message'
        '${context != null ? ' | Context: $context' : ''}'
        '${error != null ? ' | Error: $error' : ''}';
  }
}

/// Log levels
enum LogLevel { error, warning, info }

/// Silent error service that captures logs instead of printing
class SilentErrorService {
  final List<LogEntry> _logs = [];

  // Getters for different log levels
  List<LogEntry> get errorLogs =>
      _logs.where((l) => l.level == LogLevel.error).toList();
  List<LogEntry> get warningLogs =>
      _logs.where((l) => l.level == LogLevel.warning).toList();
  List<LogEntry> get infoLogs =>
      _logs.where((l) => l.level == LogLevel.info).toList();
  List<LogEntry> get allLogs => List.unmodifiable(_logs);

  /// Log an error (captured, not printed)
  void logError(
    String message, {
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _logs.add(
      LogEntry(
        message: message,
        context: context,
        error: error,
        stackTrace: stackTrace,
        level: LogLevel.error,
      ),
    );
  }

  /// Log a warning (captured, not printed)
  void logWarning(String message, {Map<String, dynamic>? context}) {
    _logs.add(
      LogEntry(message: message, context: context, level: LogLevel.warning),
    );
  }

  /// Log info (captured, not printed)
  void logInfo(String message, {Map<String, dynamic>? context}) {
    _logs.add(
      LogEntry(message: message, context: context, level: LogLevel.info),
    );
  }

  /// Clear all captured logs (call in tearDown)
  void clear() {
    _logs.clear();
  }

  /// Check if a specific message was logged
  bool hasMessage(String message) {
    return _logs.any((log) => log.message.contains(message));
  }

  /// Check if a specific error was logged
  bool hasError(Type errorType) {
    return _logs.any((log) => log.error?.runtimeType == errorType);
  }

  /// Get last log entry
  LogEntry? get lastLog => _logs.isEmpty ? null : _logs.last;

  /// Get log count
  int get logCount => _logs.length;

  /// Print all logs (for debugging failed tests)
  void printAll() {
    // Using debugPrint to avoid lint warning in production
    for (final log in _logs) {
      // ignore: avoid_print
      print(log);
    }
  }
}
