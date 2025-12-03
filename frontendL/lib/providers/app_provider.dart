import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../services/service_health_manager.dart';
import '../services/error_service.dart';

/// Application State Provider
///
/// Manages app-wide state including backend connectivity, network status,
/// and service health. Provides reactive state updates using ChangeNotifier.
///
/// **Key Responsibilities:**
/// - Backend service health monitoring
/// - Device network connectivity detection
/// - Distinguish "device offline" from "backend offline"
/// - Graceful error handling and recovery
///
/// **Architecture:**
/// - Extends ChangeNotifier for reactive state management
/// - Uses ServiceHealthManager for backend health checks
/// - Uses connectivity_plus package for network detection
/// - Fail-open strategy: Assumes network available if check fails
///
/// **State Management Pattern:**
/// - All state changes trigger `notifyListeners()`
/// - No subscriptions or streams (no dispose() needed)
/// - Test-aware: Handles "Binding not initialized" gracefully
///
/// **Usage Example:**
/// ```dart
/// // In widget tree root (main.dart):
/// ChangeNotifierProvider(create: (_) => AppProvider())
///
/// // In widgets:
/// Consumer<AppProvider>(
///   builder: (context, app, _) {
///     if (!app.hasNetworkConnection) {
///       return OfflineScreen();
///     }
///     if (!app.isBackendHealthy) {
///       return MaintenanceScreen();
///     }
///     return NormalApp();
///   }
/// )
/// ```
///
/// **Network vs Backend Distinction:**
/// - `hasNetworkConnection` - Is device connected to WiFi/cellular?
/// - `isBackendHealthy` - Is TrossApp backend responding?
/// - Device can be online while backend is offline (and vice versa)
///
/// **KISS Principle:**
/// - Simple boolean states (no complex state machines)
/// - Explicit checks (no automatic polling)
/// - Fail-open design (app usable even if checks fail)
/// - No dispose() needed (no resources to clean up)
class AppProvider extends ChangeNotifier {
  final ServiceHealthManager _healthManager = ServiceHealthManager();
  final Connectivity _connectivity = Connectivity();

  // State properties
  bool _isInitialized = false;
  ServiceStatus _backendStatus = ServiceStatus.unknown;
  Map<String, dynamic> _healthData = {};
  bool _isConnected = false;
  bool _hasNetworkConnection = true; // Device network connectivity
  String? _connectionError;

  // Public getters for reactive state access

  /// Whether app has completed initialization
  /// Set to true after first health check completes
  bool get isInitialized => _isInitialized;

  /// Current status of backend service
  /// Values: healthy, degraded, unhealthy, unknown
  ServiceStatus get backendStatus => _backendStatus;

  /// Detailed health data from backend
  /// Contains uptime, database status, memory usage, etc.
  Map<String, dynamic> get healthData => _healthData;

  /// Whether app is connected to backend
  /// Combination of network + backend health
  bool get isConnected => _isConnected;

  /// Whether device has network connection (WiFi/cellular/Ethernet)
  /// Independent of backend status
  bool get hasNetworkConnection => _hasNetworkConnection;

  /// Current connection error message, or null if no error
  String? get connectionError => _connectionError;

  /// Whether backend is healthy (not degraded or unhealthy)
  bool get isBackendHealthy => _backendStatus == ServiceStatus.healthy;

  /// Whether backend is available (may be degraded but still usable)
  bool get isBackendAvailable => _healthManager.isBackendAvailable;

  /// Initialize app state at startup
  ///
  /// Performs quick health check to provide immediate feedback on backend status.
  /// Called once in AuthWrapper.initState() when app starts.
  ///
  /// **KISS Design:**
  /// - Non-blocking: App continues even if health check fails
  /// - Quick check: Single HTTP request for immediate feedback
  /// - Fail-open: Assumes backend available if check fails
  /// - Sets isInitialized = true regardless of outcome
  ///
  /// **Initialization Steps:**
  /// 1. Check device network connectivity (WiFi/cellular/Ethernet)
  /// 2. Perform quick backend health check
  /// 3. Set isInitialized = true
  /// 4. Trigger notifyListeners() to update UI
  ///
  /// **Side Effects:**
  /// - Updates isInitialized, hasNetworkConnection, backendStatus
  /// - Triggers notifyListeners() for UI update
  /// - Logs initialization status
  ///
  /// **Example:**
  /// ```dart
  /// await appProvider.initialize(); // Called in AuthWrapper
  /// // App is now initialized, UI can show backend status
  /// ```
  Future<void> initialize() async {
    try {
      ErrorService.logInfo('Initializing app state...');

      // Mark as initialized first
      _isInitialized = true;

      // Check device network connectivity first
      await checkNetworkConnectivity();

      // Do quick health check for better UX (non-blocking if it fails)
      // This gives user immediate feedback on backend status
      await checkServiceHealthOnDemand();

      ErrorService.logInfo('App state initialized successfully');
    } catch (e) {
      ErrorService.logError('App initialization failed', error: e);
      // Don't block app startup even if health check fails
      _isInitialized = true;
      _isConnected = false;
      _backendStatus = ServiceStatus.unknown;
      notifyListeners();
    }
  }

  /// Check device network connectivity
  ///
  /// Detects if device is connected to WiFi, cellular data, or Ethernet.
  /// This check is independent of backend status.
  ///
  /// **Use Cases:**
  /// - Distinguish "device offline" from "backend offline"
  /// - Show appropriate error messages to users
  /// - Disable network-dependent features when offline
  /// - Provide offline mode guidance
  ///
  /// **Network Types Detected:**
  /// - WiFi
  /// - Mobile/Cellular (4G, 5G, etc.)
  /// - Ethernet (wired connection)
  /// - None (no connection)
  ///
  /// **Fail-Open Strategy:**
  /// - Test environments: Assumes network available
  /// - Check failures: Assumes network available (doesn't block app)
  /// - Better UX: App usable even if check fails
  ///
  /// **Side Effects:**
  /// - Updates hasNetworkConnection property
  /// - Triggers notifyListeners() for UI update
  /// - Logs connectivity status and types
  ///
  /// **Example:**
  /// ```dart
  /// await appProvider.checkNetworkConnectivity();
  /// if (!appProvider.hasNetworkConnection) {
  ///   showDialog(context, 'No internet connection');
  /// }
  /// ```
  Future<void> checkNetworkConnectivity() async {
    try {
      final List<ConnectivityResult> connectivityResult = await _connectivity
          .checkConnectivity();

      // Check if ANY network connection is available
      _hasNetworkConnection =
          connectivityResult.isNotEmpty &&
          !connectivityResult.contains(ConnectivityResult.none);

      ErrorService.logInfo(
        'Network connectivity check',
        context: {
          'hasConnection': _hasNetworkConnection,
          'types': connectivityResult.map((e) => e.name).join(', '),
        },
      );

      notifyListeners();
    } catch (e) {
      // In test environments, connectivity_plus throws "Binding has not yet been initialized"
      // This is expected and safe to ignore - assume network available in tests
      if (e.toString().contains('Binding has not yet been initialized')) {
        _hasNetworkConnection = true;
      } else {
        ErrorService.logError('Network connectivity check failed', error: e);
        // Fail open: assume network available if check fails
        _hasNetworkConnection = true;
      }
    }
  }

  /// Check backend service health on demand
  ///
  /// Performs HTTP health check to backend service. Intelligently skips
  /// backend check if device has no network connection.
  ///
  /// **Smart Two-Layer Check:**
  /// 1. **Device Network Check** - Is device online?
  /// 2. **Backend Health Check** - Is backend responding?
  ///
  /// **This prevents:**
  /// - Waiting for backend timeout when device is offline
  /// - Confusing error messages ("backend down" vs "no internet")
  /// - Unnecessary HTTP requests when device has no network
  ///
  /// **Backend Status Values:**
  /// - `healthy` - Backend responding normally
  /// - `degraded` - Backend partially functional (some services down)
  /// - `unhealthy` - Backend not responding properly
  /// - `offline` - Cannot reach backend
  /// - `unknown` - Not checked yet
  ///
  /// **Side Effects:**
  /// - Updates backendStatus, isConnected, healthData
  /// - Sets appropriate connectionError messages
  /// - Triggers notifyListeners() for UI update
  ///
  /// **User-Friendly Error Messages:**
  /// - "No network connection - Check WiFi or mobile data"
  /// - "Backend service unavailable"
  /// - "Connection failed: [specific error]"
  ///
  /// **Example:**
  /// ```dart
  /// await appProvider.checkServiceHealthOnDemand();
  /// if (appProvider.backendStatus == ServiceStatus.healthy) {
  ///   // Proceed with API calls
  /// } else if (!appProvider.hasNetworkConnection) {
  ///   // Show offline screen
  /// } else {
  ///   // Show maintenance screen
  /// }
  /// ```
  Future<void> checkServiceHealthOnDemand() async {
    try {
      // Check device network first
      await checkNetworkConnectivity();

      // If no network, don't even try backend
      if (!_hasNetworkConnection) {
        _backendStatus = ServiceStatus.offline;
        _isConnected = false;
        _connectionError = 'No network connection - Check WiFi or mobile data';
        ErrorService.logWarning('Backend check skipped - no network');
        notifyListeners();
        return;
      }

      final status = await _healthManager.checkBackendHealth();
      _backendStatus = status;
      _healthData = _healthManager.lastHealthData;
      _isConnected = status == ServiceStatus.healthy;
      _connectionError = _isConnected ? null : 'Backend service unavailable';

      ErrorService.logInfo(
        'Service health check completed',
        context: {'status': status.name, 'isConnected': _isConnected},
      );

      notifyListeners();
    } catch (e) {
      _backendStatus = ServiceStatus.offline;
      _isConnected = false;
      _connectionError =
          'Connection failed: ${ErrorService.getUserFriendlyMessage(e)}';
      ErrorService.logError('Service health check failed', error: e);
      notifyListeners();
    }
  }

  /// Retry connection to backend after failure
  ///
  /// Clears previous error and performs fresh health check.
  /// Used when user manually retries after connection failure.
  ///
  /// **Side Effects:**
  /// - Clears connectionError
  /// - Triggers health check (network + backend)
  /// - Updates all related state properties
  /// - Triggers notifyListeners() for UI update
  ///
  /// **Example:**
  /// ```dart
  /// // In error screen
  /// ElevatedButton(
  ///   onPressed: () => appProvider.retryConnection(),
  ///   child: Text('Retry Connection'),
  /// )
  /// ```
  Future<void> retryConnection() async {
    _connectionError = null;
    notifyListeners();
    await checkServiceHealthOnDemand();
  }

  /// Clear connection error message
  ///
  /// Resets error state without performing new health check.
  /// Useful for dismissing error banners when user acknowledges the issue.
  ///
  /// **Example:**
  /// ```dart
  /// // In error banner
  /// IconButton(
  ///   icon: Icon(Icons.close),
  ///   onPressed: () => appProvider.clearConnectionError(),
  /// )
  /// ```
  void clearConnectionError() {
    _connectionError = null;
    notifyListeners();
  }
}
