/// Screen Test Helpers - Utilities for Testing Full Screens
///
/// Screens require more setup than widgets:
/// - Full provider tree (Auth, Services, etc.)
/// - Routing context (go_router)
/// - Navigation state
///
/// These helpers provide consistent setup for screen tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross_app/providers/auth_provider.dart';
import 'package:tross_app/services/api/api_client.dart';
import 'package:tross_app/services/generic_entity_service.dart';
import '../mocks/mock_api_client.dart';
import '../mocks/mock_services.dart';

/// Pumps a screen with full provider setup for testing
///
/// Provides:
/// - MockApiClient (configurable)
/// - GenericEntityService
/// - AuthProvider (authenticated by default)
/// - MaterialApp with routing support
///
/// Usage:
/// ```dart
/// await pumpScreen(
///   tester,
///   EntityScreen(entityName: 'customer'),
///   mockApiClient: mockApiClient,
/// );
/// ```
Future<MockApiClient> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  MockApiClient? mockApiClient,
  String? userRole,
  bool isAuthenticated = true,
  Size screenSize = const Size(1200, 800),
}) async {
  final mock = mockApiClient ?? MockApiClient();

  final authProvider = isAuthenticated
      ? MockAuthProvider.authenticated(role: userRole ?? 'admin')
      : MockAuthProvider();

  await tester.pumpWidget(
    MediaQuery(
      data: MediaQueryData(size: screenSize),
      child: MaterialApp(
        home: MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: mock),
            Provider<GenericEntityService>(
              create: (_) => GenericEntityService(mock),
            ),
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ],
          child: Scaffold(body: screen),
        ),
      ),
    ),
  );

  return mock;
}

/// Pumps a screen and waits for async operations to complete
///
/// Use when the screen loads data on init.
Future<MockApiClient> pumpScreenAndSettle(
  WidgetTester tester,
  Widget screen, {
  MockApiClient? mockApiClient,
  String? userRole,
  bool isAuthenticated = true,
  Duration? timeout,
}) async {
  final mock = await pumpScreen(
    tester,
    screen,
    mockApiClient: mockApiClient,
    userRole: userRole,
    isAuthenticated: isAuthenticated,
  );

  await tester.pumpAndSettle(timeout ?? const Duration(seconds: 5));

  return mock;
}

/// Standard screen test behaviors to verify
///
/// These are common behaviors all screens should exhibit.
class ScreenTestBehaviors {
  /// Verify screen renders without crashing
  static Future<void> verifyRenders(
    WidgetTester tester,
    Widget screen, {
    MockApiClient? mockApiClient,
  }) async {
    await pumpScreen(tester, screen, mockApiClient: mockApiClient);
    await tester.pump();
    // If we get here without exception, screen rendered
    expect(tester.takeException(), isNull);
  }

  /// Verify screen shows loading indicator initially
  static Future<void> verifyShowsLoading(
    WidgetTester tester,
    Widget screen,
  ) async {
    await pumpScreen(tester, screen);
    // Don't settle - check immediate state
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsWidgets);
  }

  /// Verify screen handles error state
  static Future<void> verifyHandlesError(
    WidgetTester tester,
    Widget screen,
    MockApiClient mockApiClient,
  ) async {
    mockApiClient.setShouldFail(true, message: 'Test error');
    await pumpScreen(tester, screen, mockApiClient: mockApiClient);
    await tester.pumpAndSettle();
    // Should show some error indicator
    expect(
      find.byIcon(Icons.error_outline).evaluate().isNotEmpty ||
          find.textContaining('error').evaluate().isNotEmpty ||
          find.textContaining('Error').evaluate().isNotEmpty ||
          find.textContaining('Failed').evaluate().isNotEmpty,
      isTrue,
    );
  }
}
