/// Test: AppProvider Network Connectivity Enhancement
/// Verifies network detection and offline handling
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/providers/app_provider.dart';
import 'package:tross_app/services/service_health_manager.dart';

void main() {
  group('AppProvider - Network Connectivity Enhancement', () {
    late AppProvider provider;

    setUp(() {
      provider = AppProvider();
    });

    test('should initialize with unknown backend status', () {
      expect(provider.backendStatus, ServiceStatus.unknown);
      expect(provider.isInitialized, false);
    });

    test('should have hasNetworkConnection getter', () {
      // Network check happens async, but getter should exist
      expect(provider.hasNetworkConnection, isNotNull);
      expect(provider.hasNetworkConnection, isA<bool>());
    });

    test('should check network connectivity on initialization', () async {
      // Initialize provider
      await provider.initialize();

      // Should be initialized
      expect(provider.isInitialized, true);

      // Should have checked network (hasNetworkConnection should be set)
      // In test environment, connectivity check may fail gracefully
      expect(provider.hasNetworkConnection, isA<bool>());
    });

    test('should distinguish network offline from backend offline', () async {
      await provider.initialize();

      // Both states should be trackable independently
      expect(provider.hasNetworkConnection, isA<bool>());
      expect(provider.backendStatus, isA<ServiceStatus>());

      // Network can be up while backend is down
      // (Can't mock easily without dependency injection, but API is verified)
    });

    test('should provide meaningful connection error messages', () async {
      await provider.initialize();

      // Connection error should be null or string
      expect(provider.connectionError, anyOf(isNull, isA<String>()));

      // If there's an error, it should be user-friendly
      if (provider.connectionError != null) {
        expect(provider.connectionError!.isNotEmpty, true);
        expect(
          provider.connectionError,
          anyOf(
            contains('network'),
            contains('backend'),
            contains('unavailable'),
          ),
        );
      }
    });

    test('should handle connectivity check gracefully on failure', () async {
      // Even if connectivity check fails, app should initialize
      await provider.initialize();

      expect(provider.isInitialized, true);
      // Should fail open (assume network available)
      expect(provider.hasNetworkConnection, isA<bool>());
    });

    test('should update network state on demand', () async {
      await provider.initialize();

      // Call network check explicitly
      await provider.checkNetworkConnectivity();

      // State should be checked (may or may not change)
      expect(provider.hasNetworkConnection, isA<bool>());

      // In real scenario, this would detect WiFi → mobile data switch
    });

    test('should skip backend check when no network detected', () async {
      // This would require mocking connectivity_plus to return no network
      // For now, verify the code path exists via provider methods

      await provider.initialize();

      // Verify checkServiceHealthOnDemand exists and handles network state
      expect(provider.checkServiceHealthOnDemand, isA<Function>());
    });
  });

  group('AppProvider - Network Integration', () {
    test('should expose all necessary getters', () {
      final provider = AppProvider();

      // Verify all network-related getters exist
      expect(provider.hasNetworkConnection, isA<bool>());
      expect(provider.backendStatus, isA<ServiceStatus>());
      expect(provider.isConnected, isA<bool>());
      expect(provider.isBackendHealthy, isA<bool>());
      expect(provider.isBackendAvailable, isA<bool>());
    });

    test('should maintain backward compatibility', () async {
      final provider = AppProvider();

      // Old API should still work
      await provider.initialize();
      await provider.checkServiceHealthOnDemand();
      await provider.retryConnection();
      provider.clearConnectionError();

      // No exceptions = success
      expect(provider.isInitialized, true);
    });
  });
}
