/// Dashboard Configuration Service - Static Pattern
///
/// Loads dashboard-config.json and provides static access.
/// Follows the same pattern as PermissionService.
///
/// USAGE:
/// ```dart
/// // Initialize at app startup (after PermissionService)
/// await DashboardConfigService.initialize();
///
/// // Get config
/// final config = DashboardConfigService.config;
/// final entities = config.getEntitiesForRole('technician');
/// ```
library;

import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../models/dashboard_config.dart';
import 'error_service.dart';

/// Dashboard configuration service - Static class pattern
///
/// Matches PermissionService pattern: private constructor, static methods.
abstract final class DashboardConfigService {
  static DashboardConfig? _config;
  static bool _initialized = false;

  /// Whether the service has been initialized
  static bool get isInitialized => _initialized;

  /// Get the loaded config (throws if not initialized)
  static DashboardConfig get config {
    if (_config == null) {
      throw StateError(
        'DashboardConfigService not initialized. '
        'Call DashboardConfigService.initialize() first.',
      );
    }
    return _config!;
  }

  /// Initialize by loading config from assets
  ///
  /// Uses rootBundle to load JSON. Fallback path only executes if asset
  /// is missing - tested via loadFromJson() instead.
  // coverage:ignore-start
  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      ErrorService.logDebug('[DashboardConfig] Loading dashboard config...');

      final jsonString = await rootBundle.loadString(
        'assets/config/dashboard-config.json',
      );
      final json = jsonDecode(jsonString) as Map<String, dynamic>;

      _config = DashboardConfig.fromJson(json);
      _initialized = true;

      ErrorService.logDebug(
        '[DashboardConfig] Loaded ${_config!.entities.length} entities',
      );
    } catch (e) {
      ErrorService.logError(
        '[DashboardConfig] Failed to load dashboard config',
        error: e,
      );
      // Load defaults
      _loadDefaults();
      _initialized = true;
    }
  }
  // coverage:ignore-end

  /// Load from JSON directly (for testing)
  static void loadFromJson(Map<String, dynamic> json) {
    _config = DashboardConfig.fromJson(json);
    _initialized = true;
  }

  /// Reset service (for testing)
  static void reset() {
    _config = null;
    _initialized = false;
  }

  // coverage:ignore-start
  // Fallback when rootBundle.loadString fails - cannot be tested without mocking
  /// Load default configuration when JSON not available
  static void _loadDefaults() {
    _config = const DashboardConfig(
      version: '1.0.0',
      entities: [
        DashboardEntityConfig(
          entity: 'work_order',
          minRole: 'customer',
          groupBy: 'status',
          order: 1,
        ),
      ],
    );

    ErrorService.logDebug('[DashboardConfig] Loaded default configuration');
  }

  // coverage:ignore-end
}
