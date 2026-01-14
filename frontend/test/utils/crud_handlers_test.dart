/// CrudHandlers Tests
///
/// Tests the CRUD orchestration functions.
/// Uses widget tests to verify dialog/snackbar/callback coordination.
///
/// Coverage targets:
/// - handleDelete: confirm flow, cancel flow, error handling
/// - _transformErrorMessage: various error message transformations
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/crud_handlers.dart';

void main() {
  /// Helper to find the confirm button in the dialog (not the trigger button)
  Finder findDialogConfirmButton() {
    return find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(ElevatedButton),
    );
  }

  group('CrudHandlers', () {
    group('handleDelete', () {
      testWidgets('returns false when dialog is cancelled', (tester) async {
        bool successCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    final result = await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'user',
                      entityName: 'John Doe',
                      deleteOperation: () async => true,
                      onSuccess: () => successCalled = true,
                    );
                    expect(result, isFalse);
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        // Tap the button to trigger handleDelete
        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();

        // Dialog should appear - tap Cancel
        expect(find.text('Delete user?'), findsOneWidget);
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();

        // onSuccess should NOT have been called
        expect(successCalled, isFalse);
      });

      testWidgets(
        'returns true and calls onSuccess when confirmed and succeeds',
        (tester) async {
          bool successCalled = false;
          bool deleteOperationCalled = false;

          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                body: Builder(
                  builder: (context) => TextButton(
                    onPressed: () async {
                      final result = await CrudHandlers.handleDelete(
                        context: context,
                        entityType: 'user',
                        entityName: 'John Doe',
                        deleteOperation: () async {
                          deleteOperationCalled = true;
                          return true;
                        },
                        onSuccess: () => successCalled = true,
                      );
                      expect(result, isTrue);
                    },
                    child: const Text('Trigger'),
                  ),
                ),
              ),
            ),
          );

          // Tap the button to trigger handleDelete
          await tester.tap(find.text('Trigger'));
          await tester.pumpAndSettle();

          // Dialog should appear - tap Delete (confirm) in dialog
          expect(find.text('Delete user?'), findsOneWidget);
          await tester.tap(findDialogConfirmButton());
          await tester.pumpAndSettle();

          // Verify delete was called
          expect(deleteOperationCalled, isTrue);

          // Success snackbar should appear
          expect(find.text('user deleted successfully'), findsOneWidget);

          // Let post-frame callback execute
          await tester.pump();
          expect(successCalled, isTrue);
        },
      );

      testWidgets('calls additional refresh callbacks on success', (
        tester,
      ) async {
        bool primaryCalled = false;
        bool additional1Called = false;
        bool additional2Called = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async => true,
                      onSuccess: () => primaryCalled = true,
                      additionalRefreshCallbacks: [
                        () => additional1Called = true,
                        () => additional2Called = true,
                      ],
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();

        // Confirm delete
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Let post-frame callbacks execute
        await tester.pump();

        expect(primaryCalled, isTrue);
        expect(additional1Called, isTrue);
        expect(additional2Called, isTrue);
      });

      testWidgets('returns false when delete operation returns false', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    final result = await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'user',
                      entityName: 'John',
                      deleteOperation: () async => false,
                      onSuccess: () {},
                    );
                    expect(result, isFalse);
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();

        // Confirm delete
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Error snackbar should appear
        expect(find.text('Failed to delete user'), findsOneWidget);
      });

      testWidgets('shows error snackbar when delete throws exception', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    final result = await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'user',
                      entityName: 'John',
                      deleteOperation: () async {
                        throw Exception('Network error');
                      },
                      onSuccess: () {},
                    );
                    expect(result, isFalse);
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();

        // Confirm delete
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Error snackbar should appear (without "Exception: " prefix)
        expect(find.text('Network error'), findsOneWidget);
      });
    });

    group('Error Message Transformation', () {
      testWidgets('transforms "Use force=true" messages', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async {
                        throw Exception(
                          'Cannot delete role. Use force=true to override.',
                        );
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Should strip "Use force=true..." part
        expect(find.textContaining('Use force=true'), findsNothing);
        expect(find.text('Cannot delete role'), findsOneWidget);
      });

      testWidgets('transforms user count grammar', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async {
                        throw Exception('Cannot delete: 3 user(s) assigned');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Should transform "3 user(s)" to "3 users are"
        expect(find.textContaining('3 users are'), findsOneWidget);
      });

      testWidgets('transforms single user count grammar', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async {
                        throw Exception('Cannot delete: 1 user(s) assigned');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        // Should transform "1 user(s)" to "1 user is"
        expect(find.textContaining('1 user is'), findsOneWidget);
      });

      testWidgets('transforms protected role message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async {
                        throw Exception('Cannot delete protected role: admin');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        expect(
          find.text('This is a protected system role and cannot be deleted.'),
          findsOneWidget,
        );
      });

      testWidgets('transforms not found message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'user',
                      entityName: 'John',
                      deleteOperation: () async {
                        throw Exception('User not found');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        expect(
          find.text(
            'This user no longer exists. It may have been deleted by another user.',
          ),
          findsOneWidget,
        );
      });

      testWidgets('transforms unauthorized message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'user',
                      entityName: 'John',
                      deleteOperation: () async {
                        throw Exception('Unauthorized');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        expect(
          find.text('You do not have permission to delete this user.'),
          findsOneWidget,
        );
      });

      testWidgets('transforms 403 message', (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    await CrudHandlers.handleDelete(
                      context: context,
                      entityType: 'role',
                      entityName: 'Admin',
                      deleteOperation: () async {
                        throw Exception('403 Forbidden');
                      },
                      onSuccess: () {},
                    );
                  },
                  child: const Text('Trigger'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger'));
        await tester.pumpAndSettle();
        await tester.tap(findDialogConfirmButton());
        await tester.pumpAndSettle();

        expect(
          find.text('You do not have permission to delete this role.'),
          findsOneWidget,
        );
      });
    });
  });
}
