// Backend Service Health Manager for Flutter
// KISS principle: Frontend works independently, gracefully handles backend unavailability

import 'dart:convert';
import 'package:http/http.dart' as http;

enum ServiceStatus { healthy, degraded, critical, unknown, offline }

class ServiceHealthManager {
  static const String _baseUrl = 'http://localhost:3001';
  static const Duration _timeout = Duration(seconds: 3);

  // Service isolation: Default to offline mode
  ServiceStatus _backendStatus = ServiceStatus.offline;
  Map<String, dynamic> _lastHealthData = {};
  DateTime? _lastCheck;

  // Singleton pattern
  static final ServiceHealthManager _instance =
      ServiceHealthManager._internal();
  factory ServiceHealthManager() => _instance;
  ServiceHealthManager._internal();

  /// Get current backend status without making network call
  ServiceStatus get backendStatus => _backendStatus;

  /// Get last known health data
  Map<String, dynamic> get lastHealthData => Map.from(_lastHealthData);

  /// Check if backend is available
  bool get isBackendAvailable => _backendStatus != ServiceStatus.offline;

  /// Check backend health with timeout and graceful failure
  Future<ServiceStatus> checkBackendHealth() async {
    try {
      final response = await http
          .get(
            Uri.parse('$_baseUrl/api/health'),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(_timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        _lastHealthData = data;
        _lastCheck = DateTime.now();

        // Parse backend status
        switch (data['status'] as String?) {
          case 'healthy':
            _backendStatus = ServiceStatus.healthy;
          case 'degraded':
            _backendStatus = ServiceStatus.degraded;
          case 'critical':
            _backendStatus = ServiceStatus.critical;
          default:
            _backendStatus = ServiceStatus.unknown;
        }

        return _backendStatus;
      } else {
        _backendStatus = ServiceStatus.offline;
        return ServiceStatus.offline;
      }
    } catch (e) {
      // Network error, timeout, or server unavailable
      _backendStatus = ServiceStatus.offline;
      _lastHealthData = {
        'status': 'offline',
        'error': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
        'mode': 'frontend_standalone',
      };
      return ServiceStatus.offline;
    }
  }

  /// Get user-friendly status message
  String getStatusMessage() {
    switch (_backendStatus) {
      case ServiceStatus.healthy:
        return 'All services operational';
      case ServiceStatus.degraded:
        return 'Limited functionality available';
      case ServiceStatus.critical:
        return 'Core services unavailable';
      case ServiceStatus.unknown:
        return 'Service status unknown';
      case ServiceStatus.offline:
        return 'Working offline';
    }
  }

  /// Get diagnostic information for users
  Map<String, dynamic> getDiagnostics() {
    return {
      'backend_status': _backendStatus.toString().split('.').last,
      'backend_url': _baseUrl,
      'last_check': _lastCheck?.toIso8601String() ?? 'Never',
      'frontend_mode': 'standalone',
      'offline_capable': true,
      'message': getStatusMessage(),
      'troubleshooting': _getTroubleshootingTips(),
    };
  }

  List<String> _getTroubleshootingTips() {
    switch (_backendStatus) {
      case ServiceStatus.offline:
        return [
          'Check if backend server is running on port 3001',
          'Verify network connectivity',
          'Try refreshing the page',
          'App works in offline mode with limited features',
        ];
      case ServiceStatus.critical:
        return [
          'Core services are down',
          'Try again in a few moments',
          'Contact support if issue persists',
        ];
      case ServiceStatus.degraded:
        return [
          'Some features may be unavailable',
          'Data synchronization may be delayed',
          'Full functionality will return automatically',
        ];
      default:
        return ['All systems operational'];
    }
  }

  /// Auto-refresh health status (call periodically)
  Future<void> startHealthMonitoring() async {
    // Check immediately
    await checkBackendHealth();

    // Then check every 30 seconds
    // Note: In a real app, you'd use a timer or stream
    // For now, this is just the implementation structure
  }
}
