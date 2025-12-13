import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

void main() {
  group('ErrorSnackBar', () {
    testWidgets('renders with correct message', (tester) async {
      const message = 'Test error message';
      final snackBar = ErrorSnackBar(message: message);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(snackBar);
                  },
                  child: const Text('Show'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text(message), findsOneWidget);
    });

    testWidgets('has correct styling', (tester) async {
      const message = 'Error';
      final snackBar = ErrorSnackBar(message: message);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(snackBar);
                  },
                  child: const Text('Show'),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final snackBarWidget = tester.widget<SnackBar>(find.byType(SnackBar));

      expect(snackBarWidget.backgroundColor, Colors.red);
      expect(snackBarWidget.behavior, SnackBarBehavior.floating);
      expect(snackBarWidget.duration, const Duration(seconds: 4));

      // Verify content text style
      final content = snackBarWidget.content as Text;
      expect(content.style?.color, Colors.white);
    });
  });
}
