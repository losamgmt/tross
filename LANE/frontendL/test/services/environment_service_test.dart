import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/environment_service.dart';
import 'package:tross_app/config/app_config.dart';

/// Tests for EnvironmentService
///
/// Integration-style tests that verify service behavior with real backend calls.
/// Tests cover data structure, calculations, and error handling.
void main() {
  group('EnvironmentService', () {
    const testToken = 'test-token-456';

    group('EnvironmentInfo', () {
      test('can be created with all fields', () {
        final info = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'Auth0',
          apiHealth: 'Healthy',
          databaseStatus: 'Connected',
          provenEndpoints: 9,
          totalEndpoints: 24,
          phase: 'MVP Phase - Read Operations Complete',
        );

        expect(info.backendUrl, 'http://localhost:3001');
        expect(info.authMode, 'Auth0');
        expect(info.apiHealth, 'Healthy');
        expect(info.databaseStatus, 'Connected');
        expect(info.provenEndpoints, 9);
        expect(info.totalEndpoints, 24);
        expect(info.phase, 'MVP Phase - Read Operations Complete');
      });

      test('has default values for optional fields', () {
        final info = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'mock',
          apiHealth: 'Healthy',
        );

        expect(info.provenEndpoints, 9);
        expect(info.totalEndpoints, 24);
        expect(info.phase, 'MVP Phase - Read Operations Complete');
        expect(info.databaseStatus, isNull);
      });

      test('calculates coverage percentage correctly', () {
        final info = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'mock',
          apiHealth: 'Healthy',
          provenEndpoints: 9,
          totalEndpoints: 24,
        );

        expect(info.coveragePercentage, closeTo(37.5, 0.01));
      });

      test('formats coverage display string correctly', () {
        final info = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'mock',
          apiHealth: 'Healthy',
          provenEndpoints: 9,
          totalEndpoints: 24,
        );

        expect(info.coverageDisplay, '9/24 (37.5%)');
      });

      test('handles different coverage scenarios', () {
        final testCases = [
          (10, 20, 50.0, '10/20 (50.0%)'),
          (1, 3, 33.3, '1/3 (33.3%)'),
          (24, 24, 100.0, '24/24 (100.0%)'),
          (0, 24, 0.0, '0/24 (0.0%)'),
        ];

        for (final (proven, total, expectedPercent, expectedDisplay)
            in testCases) {
          final info = EnvironmentInfo(
            backendUrl: 'http://localhost:3001',
            authMode: 'mock',
            apiHealth: 'Healthy',
            provenEndpoints: proven,
            totalEndpoints: total,
          );

          expect(
            info.coveragePercentage,
            closeTo(expectedPercent, 0.1),
            reason: 'Failed for $proven/$total',
          );
          expect(
            info.coverageDisplay,
            expectedDisplay,
            reason: 'Failed for $proven/$total',
          );
        }
      });

      test('database status is nullable', () {
        final infoWithDb = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'mock',
          apiHealth: 'Healthy',
          databaseStatus: 'Connected',
        );

        final infoWithoutDb = EnvironmentInfo(
          backendUrl: 'http://localhost:3001',
          authMode: 'mock',
          apiHealth: 'Healthy',
        );

        expect(infoWithDb.databaseStatus, 'Connected');
        expect(infoWithoutDb.databaseStatus, isNull);
      });
    });

    group('getEnvironmentInfo', () {
      test('requires token parameter', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info, isA<EnvironmentInfo>());
      });

      test('returns EnvironmentInfo with all required fields', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info.backendUrl, isNotEmpty);
        expect(info.authMode, isNotEmpty);
        expect(info.apiHealth, isNotEmpty);
        expect(info.phase, isNotEmpty);
        expect(info.provenEndpoints, greaterThan(0));
        expect(info.totalEndpoints, greaterThan(0));
      });

      test('uses AppConfig.backendUrl', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        // backendUrl is the URL without /api suffix
        expect(info.backendUrl, AppConfig.backendUrl);
      });

      test('returns coverage information', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: testToken,
        );

        expect(info.coverageDisplay, matches(RegExp(r'\d+/\d+ \(\d+\.\d+%\)')));
      });

      test('handles invalid token gracefully', () async {
        final info = await EnvironmentService.getEnvironmentInfo(
          token: 'invalid-token-xyz',
        );

        expect(info, isA<EnvironmentInfo>());
        expect(info.backendUrl, isNotEmpty);
        expect(info.authMode, isNotEmpty);
        expect(info.apiHealth, isNotEmpty);
      });

      test('handles empty token gracefully', () async {
        final info = await EnvironmentService.getEnvironmentInfo(token: '');

        expect(info, isA<EnvironmentInfo>());
        expect(info.backendUrl, isNotEmpty);
      });
    });
  });
}
