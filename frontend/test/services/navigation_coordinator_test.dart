/// Tests for NavigationCoordinator service
///
/// **BEHAVIORAL FOCUS:**
/// - Static methods delegate to Navigator correctly
/// - All navigation operations work as expected
/// - canPop returns correct boolean
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/navigation_coordinator.dart';

void main() {
  group('NavigationCoordinator', () {
    group('navigateTo', () {
      testWidgets('pushes named route onto navigation stack', (tester) async {
        String? pushedRoute;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  NavigationCoordinator.navigateTo(context, '/settings');
                },
                child: const Text('Navigate'),
              ),
            ),
            onGenerateRoute: (settings) {
              pushedRoute = settings.name;
              return MaterialPageRoute(
                builder: (_) => const Scaffold(body: Text('Settings')),
              );
            },
          ),
        );

        await tester.tap(find.text('Navigate'));
        await tester.pumpAndSettle();

        expect(pushedRoute, '/settings');
        expect(find.text('Settings'), findsOneWidget);
      });
    });

    group('navigateAndReplace', () {
      testWidgets('replaces current route with new route', (tester) async {
        String? replacedRoute;

        await tester.pumpWidget(
          MaterialApp(
            initialRoute: '/initial',
            onGenerateRoute: (settings) {
              if (settings.name == '/initial') {
                return MaterialPageRoute(
                  builder: (context) => Scaffold(
                    body: ElevatedButton(
                      onPressed: () {
                        NavigationCoordinator.navigateAndReplace(
                          context,
                          '/replaced',
                        );
                      },
                      child: const Text('Replace'),
                    ),
                  ),
                );
              }
              replacedRoute = settings.name;
              return MaterialPageRoute(
                builder: (_) => const Scaffold(body: Text('Replaced Page')),
              );
            },
          ),
        );

        await tester.tap(find.text('Replace'));
        await tester.pumpAndSettle();

        expect(replacedRoute, '/replaced');
        expect(find.text('Replaced Page'), findsOneWidget);
      });
    });

    group('navigateAndRemoveAll', () {
      testWidgets('clears stack and pushes new route', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            initialRoute: '/first',
            onGenerateRoute: (settings) {
              if (settings.name == '/first') {
                return MaterialPageRoute(
                  builder: (context) => Scaffold(
                    body: ElevatedButton(
                      onPressed: () {
                        NavigationCoordinator.navigateAndRemoveAll(
                          context,
                          '/home',
                        );
                      },
                      child: const Text('Clear and Go Home'),
                    ),
                  ),
                );
              }
              return MaterialPageRoute(
                builder: (context) => Scaffold(
                  body: Column(
                    children: [
                      const Text('Home'),
                      Text('Can pop: ${NavigationCoordinator.canPop(context)}'),
                    ],
                  ),
                ),
              );
            },
          ),
        );

        await tester.tap(find.text('Clear and Go Home'));
        await tester.pumpAndSettle();

        expect(find.text('Home'), findsOneWidget);
        // After removing all routes, canPop should be false
        expect(find.text('Can pop: false'), findsOneWidget);
      });

      testWidgets('respects custom predicate', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            initialRoute: '/first',
            onGenerateRoute: (settings) {
              if (settings.name == '/first') {
                return MaterialPageRoute(
                  settings: settings,
                  builder: (context) => Scaffold(
                    body: ElevatedButton(
                      onPressed: () {
                        NavigationCoordinator.navigateTo(context, '/second');
                      },
                      child: const Text('Go to Second'),
                    ),
                  ),
                );
              }
              if (settings.name == '/second') {
                return MaterialPageRoute(
                  settings: settings,
                  builder: (context) => Scaffold(
                    body: ElevatedButton(
                      onPressed: () {
                        NavigationCoordinator.navigateAndRemoveAll(
                          context,
                          '/home',
                          predicate: (route) => route.isFirst,
                        );
                      },
                      child: const Text('Go Home, Keep First'),
                    ),
                  ),
                );
              }
              return MaterialPageRoute(
                settings: settings,
                builder: (context) => Scaffold(
                  body: Text(
                    'Home - Can pop: ${NavigationCoordinator.canPop(context)}',
                  ),
                ),
              );
            },
          ),
        );

        await tester.tap(find.text('Go to Second'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Go Home, Keep First'));
        await tester.pumpAndSettle();

        // With predicate keeping first route, we should be able to pop
        expect(find.textContaining('Can pop: true'), findsOneWidget);
      });
    });

    group('pop', () {
      testWidgets('removes current route from stack', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (innerContext) => Scaffold(
                          body: ElevatedButton(
                            onPressed: () {
                              NavigationCoordinator.pop(innerContext);
                            },
                            child: const Text('Go Back'),
                          ),
                        ),
                      ),
                    );
                  },
                  child: const Text('Go Forward'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Go Forward'));
        await tester.pumpAndSettle();

        expect(find.text('Go Back'), findsOneWidget);

        await tester.tap(find.text('Go Back'));
        await tester.pumpAndSettle();

        expect(find.text('Go Forward'), findsOneWidget);
        expect(find.text('Go Back'), findsNothing);
      });

      testWidgets('passes result to previous route', (tester) async {
        String? receivedResult;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: Column(
                  children: [
                    ElevatedButton(
                      onPressed: () async {
                        final result = await Navigator.of(context).push<String>(
                          MaterialPageRoute(
                            builder: (innerContext) => Scaffold(
                              body: ElevatedButton(
                                onPressed: () {
                                  NavigationCoordinator.pop(
                                    innerContext,
                                    result: 'success',
                                  );
                                },
                                child: const Text('Return Result'),
                              ),
                            ),
                          ),
                        );
                        receivedResult = result;
                      },
                      child: const Text('Open Dialog'),
                    ),
                    if (receivedResult != null) Text('Result: $receivedResult'),
                  ],
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Open Dialog'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Return Result'));
        await tester.pumpAndSettle();

        expect(receivedResult, 'success');
      });
    });

    group('popUntil', () {
      testWidgets('pops routes until predicate matches', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (ctx2) => Scaffold(
                          body: ElevatedButton(
                            onPressed: () {
                              Navigator.of(ctx2).push(
                                MaterialPageRoute(
                                  builder: (ctx3) => Scaffold(
                                    body: ElevatedButton(
                                      onPressed: () {
                                        NavigationCoordinator.popUntil(
                                          ctx3,
                                          (route) => route.isFirst,
                                        );
                                      },
                                      child: const Text('Pop to First'),
                                    ),
                                  ),
                                ),
                              );
                            },
                            child: const Text('Go to Third'),
                          ),
                        ),
                      ),
                    );
                  },
                  child: const Text('First Page'),
                ),
              ),
            ),
          ),
        );

        // Navigate to third page
        await tester.tap(find.text('First Page'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Go to Third'));
        await tester.pumpAndSettle();

        expect(find.text('Pop to First'), findsOneWidget);

        // Pop back to first
        await tester.tap(find.text('Pop to First'));
        await tester.pumpAndSettle();

        expect(find.text('First Page'), findsOneWidget);
      });
    });

    group('canPop', () {
      testWidgets('returns false when only one route exists', (tester) async {
        late bool canPopResult;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) {
                canPopResult = NavigationCoordinator.canPop(context);
                return Text('Can pop: $canPopResult');
              },
            ),
          ),
        );

        expect(canPopResult, isFalse);
      });

      testWidgets('returns true when multiple routes exist', (tester) async {
        late bool canPopResult;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (innerContext) {
                          canPopResult = NavigationCoordinator.canPop(
                            innerContext,
                          );
                          return Text('Can pop: $canPopResult');
                        },
                      ),
                    );
                  },
                  child: const Text('Push'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Push'));
        await tester.pumpAndSettle();

        expect(canPopResult, isTrue);
      });
    });
  });
}
