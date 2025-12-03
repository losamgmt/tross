/// Environment Service Integration Tests
///
/// Tests EnvironmentService with real backend calls
/// Note: These tests require a running backend server
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_config.dart';
import 'package:tross_app/services/environment_service.dart';

void main() {
  const testToken = 'integration-test-token';

  group('EnvironmentService Integration Tests', () {
    // These tests make real HTTP calls to the backend
    // They will fail if backend is not running

    group('Integration - Real Backend Calls', () {
      test('respects AppConfig settings', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        // Verify it uses AppConfig values
        expect(info.backendUrl, AppConfig.backendUrl);
        expect(AppConfig.baseUrl, isNotEmpty);
        expect(AppConfig.httpTimeout, isNotNull);
      });

      test('returns consistent backend URL', () async {
        final info1 = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );
        final info2 = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info1.backendUrl, info2.backendUrl);
      });

      test('returns valid auth mode', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info.authMode, isNotEmpty);
        expect(
          [
            'mock',
            'Mock',
            'auth0', // Auth0 provider
            'Auth0',
            'jwt',
            'JWT',
            'development', // Dev auth provider
            'unknown', // Unknown provider (lowercase - from AppConstants.authProviderUnknown)
            'Unknown',
          ].contains(info.authMode),
          isTrue,
          reason: 'Got unexpected auth mode: ${info.authMode}',
        );
      });

      test('returns valid health status', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info.apiHealth, isNotEmpty);
      });

      test('includes phase information', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info.phase, isNotEmpty);
        expect(info.phase, contains('Phase'));
        expect(info.phase.toLowerCase(), contains('mvp'));
      });
    });
  });
}
