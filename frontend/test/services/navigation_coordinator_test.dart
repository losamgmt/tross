/// Tests for NavigationCoordinator service (go_router based)
///
/// **BEHAVIORAL FOCUS:**
/// - Static methods delegate to go_router correctly
/// - All navigation operations work as expected
/// - canPop returns correct boolean
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:tross/services/navigation_coordinator.dart';

void main() {
  group('NavigationCoordinator', () {
    late GoRouter router;

    /// Helper to create a test router with given routes
    GoRouter createTestRouter({
      String initialLocation = '/',
      required List<RouteBase> routes,
    }) {
      return GoRouter(initialLocation: initialLocation, routes: routes);
    }

    group('go', () {
      testWidgets('navigates to route (replaces history)', (tester) async {
        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () =>
                      NavigationCoordinator.go(context, '/settings'),
                  child: const Text('Go to Settings'),
                ),
              ),
            ),
            GoRoute(
              path: '/settings',
              builder: (context, state) =>
                  const Scaffold(body: Text('Settings Page')),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('Go to Settings'));
        await tester.pumpAndSettle();

        expect(find.text('Settings Page'), findsOneWidget);
        expect(find.text('Go to Settings'), findsNothing);
      });
    });

    group('push', () {
      testWidgets('pushes route onto stack (adds to history)', (tester) async {
        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () =>
                      NavigationCoordinator.push(context, '/details'),
                  child: const Text('Push Details'),
                ),
              ),
            ),
            GoRoute(
              path: '/details',
              builder: (context, state) => Scaffold(
                body: Column(
                  children: [
                    const Text('Details Page'),
                    ElevatedButton(
                      onPressed: () => NavigationCoordinator.pop(context),
                      child: const Text('Go Back'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('Push Details'));
        await tester.pumpAndSettle();

        expect(find.text('Details Page'), findsOneWidget);

        // Should be able to pop back
        await tester.tap(find.text('Go Back'));
        await tester.pumpAndSettle();

        expect(find.text('Push Details'), findsOneWidget);
      });
    });

    group('goNamed', () {
      testWidgets('navigates to named route with parameters', (tester) async {
        router = GoRouter(
          initialLocation: '/',
          routes: [
            GoRoute(
              path: '/',
              name: 'home',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => NavigationCoordinator.goNamed(
                    context,
                    'user',
                    pathParameters: {'id': '123'},
                  ),
                  child: const Text('View User'),
                ),
              ),
            ),
            GoRoute(
              path: '/user/:id',
              name: 'user',
              builder: (context, state) => Scaffold(
                body: Text('User ID: ${state.pathParameters['id']}'),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('View User'));
        await tester.pumpAndSettle();

        expect(find.text('User ID: 123'), findsOneWidget);
      });

      testWidgets('passes query parameters', (tester) async {
        router = GoRouter(
          initialLocation: '/',
          routes: [
            GoRoute(
              path: '/',
              name: 'home',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => NavigationCoordinator.goNamed(
                    context,
                    'search',
                    queryParameters: {'q': 'flutter', 'page': '1'},
                  ),
                  child: const Text('Search'),
                ),
              ),
            ),
            GoRoute(
              path: '/search',
              name: 'search',
              builder: (context, state) => Scaffold(
                body: Text(
                  'Query: ${state.uri.queryParameters['q']}, '
                  'Page: ${state.uri.queryParameters['page']}',
                ),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('Search'));
        await tester.pumpAndSettle();

        expect(find.text('Query: flutter, Page: 1'), findsOneWidget);
      });
    });

    group('pop', () {
      testWidgets('pops current route from stack', (tester) async {
        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () =>
                      NavigationCoordinator.push(context, '/page2'),
                  child: const Text('Page 1'),
                ),
              ),
            ),
            GoRoute(
              path: '/page2',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => NavigationCoordinator.pop(context),
                  child: const Text('Page 2 - Pop'),
                ),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        // Push to page 2
        await tester.tap(find.text('Page 1'));
        await tester.pumpAndSettle();

        expect(find.text('Page 2 - Pop'), findsOneWidget);

        // Pop back to page 1
        await tester.tap(find.text('Page 2 - Pop'));
        await tester.pumpAndSettle();

        expect(find.text('Page 1'), findsOneWidget);
      });

      testWidgets('passes result when popping', (tester) async {
        String? receivedResult;

        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: Column(
                  children: [
                    ElevatedButton(
                      onPressed: () async {
                        final result = await context.push<String>('/dialog');
                        receivedResult = result;
                      },
                      child: const Text('Open Dialog'),
                    ),
                    if (receivedResult != null) Text('Result: $receivedResult'),
                  ],
                ),
              ),
            ),
            GoRoute(
              path: '/dialog',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () =>
                      NavigationCoordinator.pop(context, result: 'success'),
                  child: const Text('Return Result'),
                ),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('Open Dialog'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Return Result'));
        await tester.pumpAndSettle();

        // Rebuild to show result
        await tester.pump();

        expect(receivedResult, 'success');
      });
    });

    group('canPop', () {
      testWidgets('returns false when at root', (tester) async {
        late bool canPopResult;

        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) {
                canPopResult = NavigationCoordinator.canPop(context);
                return Text('Can pop: $canPopResult');
              },
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        expect(canPopResult, isFalse);
      });

      testWidgets('returns true after push', (tester) async {
        late bool canPopResult;

        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => context.push('/page2'),
                  child: const Text('Push'),
                ),
              ),
            ),
            GoRoute(
              path: '/page2',
              builder: (context, state) {
                canPopResult = NavigationCoordinator.canPop(context);
                return Text('Can pop: $canPopResult');
              },
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        await tester.tap(find.text('Push'));
        await tester.pumpAndSettle();

        expect(canPopResult, isTrue);
      });
    });

    group('replace', () {
      testWidgets('replaces current route with new route', (tester) async {
        router = createTestRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => context.push('/page2'),
                  child: const Text('Page 1'),
                ),
              ),
            ),
            GoRoute(
              path: '/page2',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () =>
                      NavigationCoordinator.replace(context, '/page3'),
                  child: const Text('Page 2 - Replace'),
                ),
              ),
            ),
            GoRoute(
              path: '/page3',
              builder: (context, state) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => NavigationCoordinator.pop(context),
                  child: const Text('Page 3 - Pop'),
                ),
              ),
            ),
          ],
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));

        // Go to page 2
        await tester.tap(find.text('Page 1'));
        await tester.pumpAndSettle();

        // Replace with page 3
        await tester.tap(find.text('Page 2 - Replace'));
        await tester.pumpAndSettle();

        expect(find.text('Page 3 - Pop'), findsOneWidget);

        // Pop should go back to page 1 (page 2 was replaced)
        await tester.tap(find.text('Page 3 - Pop'));
        await tester.pumpAndSettle();

        expect(find.text('Page 1'), findsOneWidget);
      });
    });
  });
}
