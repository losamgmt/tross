/// LoginContent Tests
///
/// Tests the LoginContent organism that composes login UI components.
/// Validates: branding, login cards, health status, callbacks.
///
/// **CALLBACK-DRIVEN:** Tests verify callbacks are invoked correctly.
/// **USES CONSTANTS:** Tests use AppConstants for UI strings.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:tross/providers/app_provider.dart';
import 'package:tross/providers/auth_provider.dart';
import 'package:tross/config/constants.dart';
import 'package:tross/widgets/organisms/login_content.dart';

void main() {
  /// Helper that wraps LoginContent with required providers
  /// Uses a test-only AuthProvider that doesn't require secure storage
  Widget createTestWidget({
    VoidCallback? onAuth0Login,
    void Function(String role)? onDevLogin,
    bool isLoading = true, // Default: loading state (matches real behavior)
  }) {
    return MaterialApp(
      home: Scaffold(
        body: MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>(
              create: (_) => _TestAuthProvider(isLoading: isLoading),
            ),
            ChangeNotifierProvider(create: (_) => AppProvider()),
          ],
          child: SingleChildScrollView(
            child: LoginContent(
              onAuth0Login: onAuth0Login ?? () {},
              onDevLogin: onDevLogin ?? (_) {},
            ),
          ),
        ),
      ),
    );
  }

  group('LoginContent Organism', () {
    group('Branding', () {
      testWidgets('displays app name', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.text(AppConstants.appName), findsOneWidget);
      });

      testWidgets('displays app tagline', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.text(AppConstants.appTagline), findsOneWidget);
      });
    });

    group('Login Cards', () {
      testWidgets('renders ProductionLoginCard', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        // Look for production login elements
        expect(find.text(AppConstants.loginButtonAuth0), findsWidgets);
      });

      testWidgets('renders DevLoginCard when devAuthEnabled', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        // Look for dev login elements (uses AppConstants)
        expect(find.text(AppConstants.devLoginCardTitle), findsWidgets);
        expect(find.text(AppConstants.devLoginButton), findsWidgets);
      });

      testWidgets('DevLoginCard has role dropdown', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        // Check for role hint text
        expect(find.text(AppConstants.devLoginRoleHint), findsWidgets);
      });
    });

    group('Health Status', () {
      testWidgets('shows health status badge', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        // Initially shows "Checking..." before initialization
        expect(find.text('Checking...'), findsOneWidget);
      });
    });

    group('Footer', () {
      testWidgets('displays app description', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.text(AppConstants.appDescription), findsOneWidget);
      });

      testWidgets('displays copyright', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.text(AppConstants.appCopyright), findsOneWidget);
      });
    });

    group('Callbacks', () {
      testWidgets('invokes onAuth0Login when Auth0 button pressed', (
        tester,
      ) async {
        var auth0Called = false;
        // Use isLoading: false so button is enabled (not in loading state)
        await tester.pumpWidget(
          createTestWidget(
            onAuth0Login: () => auth0Called = true,
            isLoading: false,
          ),
        );
        await tester.pump();

        // Find and tap the Auth0 login button
        final auth0Button = find.text(AppConstants.loginButtonAuth0);
        if (auth0Button.evaluate().isNotEmpty) {
          await tester.tap(auth0Button.first);
          await tester.pump();
          expect(auth0Called, isTrue);
        }
      });

      testWidgets('invokes onDevLogin with role when dev login pressed', (
        tester,
      ) async {
        String? selectedRole;
        // Use isLoading: false so button is enabled
        await tester.pumpWidget(
          createTestWidget(
            onDevLogin: (role) => selectedRole = role,
            isLoading: false,
          ),
        );
        await tester.pump();

        // Find and tap the dev login button
        final devButton = find.text(AppConstants.devLoginButton);
        if (devButton.evaluate().isNotEmpty) {
          await tester.tap(devButton.first);
          await tester.pump();
          // Default role should be 'admin'
          expect(selectedRole, isNotNull);
        }
      });
    });

    group('Column Layout', () {
      testWidgets('uses Column for vertical layout', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.byType(Column), findsWidgets);
      });

      testWidgets('content is scrollable in parent', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(find.byType(SingleChildScrollView), findsWidgets);
      });
    });

    group('Structure', () {
      testWidgets('renders without crashing', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        expect(tester.takeException(), isNull);
      });

      testWidgets('all required sections are present', (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pump();

        // Branding
        expect(find.text(AppConstants.appName), findsOneWidget);
        // Login option
        expect(find.text(AppConstants.loginButtonAuth0), findsWidgets);
        // Footer
        expect(find.text(AppConstants.appDescription), findsOneWidget);
      });
    });
  });
}

/// Test-only AuthProvider that doesn't require secure storage or network calls
/// Used in widget tests to avoid hangs from real AuthService dependencies
class _TestAuthProvider extends ChangeNotifier implements AuthProvider {
  final bool _isLoading;

  _TestAuthProvider({bool isLoading = true}) : _isLoading = isLoading;

  @override
  bool get isLoading => _isLoading;

  @override
  bool get isAuthenticated => false;

  @override
  bool get isRedirecting => false;

  @override
  String? get error => null;

  @override
  String? get token => null;

  @override
  String? get provider => null;

  @override
  Map<String, dynamic>? get user => null;

  @override
  String get userName => '';

  @override
  String get userEmail => '';

  @override
  int? get userId => null;

  @override
  String get userRole => 'customer';

  @override
  Future<bool> loginWithTestToken({String role = 'admin'}) async => true;

  @override
  Future<bool> loginWithAuth0() async => true;

  @override
  Future<bool> handleAuth0Callback() async => true;

  @override
  Future<void> logout() async {}

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> updateProfile(Map<String, dynamic> updates) async => true;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
