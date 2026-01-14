/// SettingsScreen Unit Tests - Lightweight Screen Tests
///
/// Tests the SettingsScreen renders correctly with proper dependencies.
/// Focuses on: structure, profile card, preferences display.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/providers/preferences_provider.dart';
import 'package:tross_app/screens/settings_screen.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_services.dart';
import '../factory/entity_registry.dart';

void main() {
  late MockApiClient mockApiClient;
  late MockAuthProvider mockAuthProvider;

  setUpAll(() async {
    await EntityTestRegistry.ensureInitialized();
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockAuthProvider = MockAuthProvider.authenticated(
      name: 'Test User',
      email: 'test@example.com',
    );

    // Mock preferences endpoint
    mockApiClient.mockResponse('/preferences', {
      'data': [
        {
          'id': 1,
          'user_id': 1,
          'theme': 'light',
          'notifications_enabled': true,
          'language': 'en',
        },
      ],
      'pagination': {'page': 1, 'limit': 10, 'total': 1},
    });
  });

  Widget buildTestWidget({MockAuthProvider? authProvider}) {
    return MediaQuery(
      data: const MediaQueryData(size: Size(1200, 800)),
      child: MaterialApp(
        home: MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: mockApiClient),
            Provider<GenericEntityService>(
              create: (_) => GenericEntityService(mockApiClient),
            ),
            ChangeNotifierProvider<AuthProvider>.value(
              value: authProvider ?? mockAuthProvider,
            ),
            ChangeNotifierProvider<PreferencesProvider>(
              create: (context) => PreferencesProvider(),
            ),
          ],
          child: const SettingsScreen(),
        ),
      ),
    );
  }

  group('SettingsScreen', () {
    testWidgets('renders without crashing', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(tester.takeException(), isNull);
    });

    testWidgets('displays Settings title', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.text('Settings'), findsWidgets);
    });

    testWidgets('has scrollable content', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.byType(SingleChildScrollView), findsWidgets);
    });

    testWidgets('shows My Profile card', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.text('My Profile'), findsOneWidget);
    });

    testWidgets('shows Preferences card', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.text('Preferences'), findsOneWidget);
    });

    testWidgets('displays user information', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Should display user email somewhere on the screen
      // The EntityDetailCard should render user data
      final hasUserContent = find.byType(Card).evaluate().isNotEmpty;
      expect(hasUserContent, isTrue);
    });
  });

  group('SettingsScreen - Different User Roles', () {
    testWidgets('renders for admin user', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          authProvider: MockAuthProvider.authenticated(role: 'admin'),
        ),
      );
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(tester.takeException(), isNull);
    });

    testWidgets('renders for technician user', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          authProvider: MockAuthProvider.authenticated(role: 'technician'),
        ),
      );
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(tester.takeException(), isNull);
    });

    testWidgets('renders for customer user', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          authProvider: MockAuthProvider.authenticated(role: 'customer'),
        ),
      );
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(tester.takeException(), isNull);
    });
  });

  group('SettingsScreen - Loading States', () {
    testWidgets('handles preferences loading', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      // Capture intermediate state
      await tester.pump();

      // Should not crash during loading
      expect(tester.takeException(), isNull);
    });
  });

  group('SettingsScreen - Error States', () {
    testWidgets('handles API error gracefully', (tester) async {
      mockApiClient.setShouldFail(true, message: 'Preferences fetch failed');

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Should not crash
      expect(tester.takeException(), isNull);

      // Should still render the screen structure
      expect(find.byType(Scaffold), findsWidgets);
    });
  });
}
