/// ErrorDisplay Organism Tests
///
/// Tests the unified error handling UI component.
/// Follows behavioral testing patterns - verifies user-facing behavior.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/error_display.dart';
import 'package:tross_app/config/constants.dart';
import 'package:tross_app/core/routing/app_routes.dart';
import '../../helpers/helpers.dart';

void main() {
  group('ErrorDisplay Widget', () {
    group('Factory: notFound (404)', () {
      testWidgets('displays 404 error code and title', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.notFound());

        expect(find.text('404'), findsOneWidget);
        expect(find.text(AppConstants.error404Title), findsOneWidget);
        expect(find.text(AppConstants.error404Description), findsOneWidget);
      });

      testWidgets('shows search_off icon', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.notFound());

        expect(find.byIcon(Icons.search_off_rounded), findsOneWidget);
      });

      testWidgets('shows requested path when provided', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(requestedPath: '/bad/route'),
        );

        expect(find.text('Path: /bad/route'), findsOneWidget);
      });

      testWidgets('shows "Go Home" button only when authenticated', (
        tester,
      ) async {
        // Not authenticated - no Go Home button
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(isAuthenticated: false),
        );
        expect(find.text(AppConstants.actionGoHome), findsNothing);
        expect(find.text(AppConstants.actionGoToLogin), findsOneWidget);

        // Authenticated - shows Go Home button
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(isAuthenticated: true),
        );
        expect(find.text(AppConstants.actionGoHome), findsOneWidget);
        expect(find.text(AppConstants.actionBackToLogin), findsOneWidget);
      });

      testWidgets('shows auth status with user email', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(
            isAuthenticated: true,
            userEmail: 'test@example.com',
          ),
        );

        expect(find.textContaining('test@example.com'), findsOneWidget);
        expect(
          find.textContaining(AppConstants.statusAuthenticated),
          findsOneWidget,
        );
      });

      testWidgets('shows not authenticated status when logged out', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(isAuthenticated: false),
        );

        expect(
          find.textContaining(AppConstants.statusNotAuthenticated),
          findsOneWidget,
        );
      });
    });

    group('Factory: unauthorized (403)', () {
      testWidgets('displays 403 error code and title', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.unauthorized());

        expect(find.text('403'), findsOneWidget);
        expect(find.text(AppConstants.error403Title), findsOneWidget);
      });

      testWidgets('shows lock icon', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.unauthorized());

        expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);
      });

      testWidgets('accepts custom message', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.unauthorized(message: 'Custom access denied message'),
        );

        expect(find.text('Custom access denied message'), findsOneWidget);
      });

      testWidgets('shows Go Home for authenticated users', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.unauthorized(isAuthenticated: true),
        );

        expect(find.text(AppConstants.actionGoHome), findsOneWidget);
      });
    });

    group('Factory: error (500)', () {
      testWidgets('displays 500 error code and default title', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.error());

        expect(find.text('500'), findsOneWidget);
        expect(find.text(AppConstants.error500Title), findsOneWidget);
      });

      testWidgets('shows error icon', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.error());

        expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
      });

      testWidgets('accepts custom title and message', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.error(
            title: 'Custom Error Title',
            message: 'Something went wrong',
          ),
        );

        expect(find.text('Custom Error Title'), findsOneWidget);
        expect(find.text('Something went wrong'), findsOneWidget);
      });

      testWidgets('shows retry button when onRetry provided', (tester) async {
        bool retryCalled = false;

        await pumpTestWidget(
          tester,
          ErrorDisplay.error(
            onRetry: (_) async {
              retryCalled = true;
            },
          ),
        );

        expect(find.text(AppConstants.actionRetry), findsOneWidget);
        expect(find.byIcon(Icons.refresh), findsOneWidget);

        // Tap retry button
        await tester.tap(find.text(AppConstants.actionRetry));
        await tester.pumpAndSettle();

        expect(retryCalled, isTrue);
      });

      testWidgets('shows contact support button', (tester) async {
        await pumpTestWidget(tester, ErrorDisplay.error());

        expect(find.byIcon(Icons.support_agent), findsOneWidget);
      });
    });

    group('Navigation Callbacks', () {
      testWidgets('calls onNavigate callback when action tapped', (
        tester,
      ) async {
        String? navigatedRoute;

        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(
            isAuthenticated: true,
            onNavigate: (route) {
              navigatedRoute = route;
            },
          ),
        );

        // Tap the "Go Home" button
        await tester.tap(find.text(AppConstants.actionGoHome));
        await tester.pumpAndSettle();

        expect(navigatedRoute, AppRoutes.home);
      });

      testWidgets('navigates to login when login button tapped', (
        tester,
      ) async {
        String? navigatedRoute;

        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(
            isAuthenticated: false,
            onNavigate: (route) {
              navigatedRoute = route;
            },
          ),
        );

        await tester.tap(find.text(AppConstants.actionGoToLogin));
        await tester.pumpAndSettle();

        expect(navigatedRoute, AppRoutes.login);
      });
    });

    group('ErrorAction Configuration', () {
      testWidgets('ErrorAction.navigate creates navigation action', (
        tester,
      ) async {
        String? navigatedRoute;

        await pumpTestWidget(
          tester,
          ErrorDisplay(
            errorCode: 'TEST',
            title: 'Test Error',
            description: 'Test description',
            icon: Icons.warning,
            actions: [
              ErrorAction.navigate(
                label: 'Go Somewhere',
                route: '/test-route',
                icon: Icons.arrow_forward,
              ),
            ],
            onNavigate: (route) => navigatedRoute = route,
          ),
        );

        expect(find.text('Go Somewhere'), findsOneWidget);

        await tester.tap(find.text('Go Somewhere'));
        await tester.pumpAndSettle();

        expect(navigatedRoute, '/test-route');
      });

      testWidgets('ErrorAction.retry creates async action', (tester) async {
        bool retryCalled = false;

        await pumpTestWidget(
          tester,
          ErrorDisplay(
            errorCode: 'RETRY',
            title: 'Retry Error',
            description: 'Can be retried',
            icon: Icons.cloud_off,
            actions: [
              ErrorAction.retry(
                onRetry: (_) async {
                  retryCalled = true;
                },
                label: 'Try Again',
              ),
            ],
          ),
        );

        expect(find.text('Try Again'), findsOneWidget);

        await tester.tap(find.text('Try Again'));
        await tester.pumpAndSettle();

        expect(retryCalled, isTrue);
      });

      testWidgets('ErrorAction.contactSupport creates support action', (
        tester,
      ) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay(
            errorCode: 'SUPPORT',
            title: 'Need Help',
            description: 'Contact support',
            icon: Icons.help,
            actions: [ErrorAction.contactSupport(label: 'Get Help')],
          ),
        );

        expect(find.text('Get Help'), findsOneWidget);
        expect(find.byIcon(Icons.support_agent), findsOneWidget);
      });
    });

    group('Widget Structure', () {
      testWidgets('renders in a Scaffold with centered content', (
        tester,
      ) async {
        await pumpTestWidget(tester, ErrorDisplay.notFound());

        expect(find.byType(Scaffold), findsWidgets);
        expect(find.byType(Center), findsWidgets);
      });

      testWidgets('uses ErrorMessage molecule for title/description', (
        tester,
      ) async {
        await pumpTestWidget(tester, ErrorDisplay.error());

        // ErrorMessage molecule should be present
        expect(find.text(AppConstants.error500Title), findsOneWidget);
        expect(find.text(AppConstants.error500Description), findsOneWidget);
      });

      testWidgets('uses ButtonGroup molecule for actions', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay.notFound(isAuthenticated: true),
        );

        // Should have multiple action buttons
        expect(find.text(AppConstants.actionGoHome), findsOneWidget);
        expect(find.text(AppConstants.actionBackToLogin), findsOneWidget);
      });
    });

    group('actionsBuilder vs actions', () {
      testWidgets('actionsBuilder receives isAuthenticated state', (
        tester,
      ) async {
        bool receivedAuthState = false;

        await pumpTestWidget(
          tester,
          ErrorDisplay(
            errorCode: 'TEST',
            title: 'Test',
            description: 'Test',
            icon: Icons.info,
            isAuthenticated: true,
            actionsBuilder: (isAuth) {
              receivedAuthState = isAuth;
              return [
                ErrorAction.navigate(
                  label: isAuth ? 'Authenticated Action' : 'Guest Action',
                  route: '/test',
                ),
              ];
            },
          ),
        );

        expect(receivedAuthState, isTrue);
        expect(find.text('Authenticated Action'), findsOneWidget);
      });

      testWidgets('static actions work without actionsBuilder', (tester) async {
        await pumpTestWidget(
          tester,
          ErrorDisplay(
            errorCode: 'STATIC',
            title: 'Static Actions',
            description: 'Uses static list',
            icon: Icons.list,
            actions: [
              ErrorAction.navigate(label: 'Static Button', route: '/static'),
            ],
          ),
        );

        expect(find.text('Static Button'), findsOneWidget);
      });
    });
  });
}
