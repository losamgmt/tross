import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/atoms.dart';

void main() {
  group('SuccessSnackBar', () {
    testWidgets('renders with correct message', (tester) async {
      const message = 'Operation successful';
      final snackBar = SuccessSnackBar(message: message);

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
      const message = 'Success!';
      final snackBar = SuccessSnackBar(message: message);

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

      expect(snackBarWidget.backgroundColor, Colors.green);
      expect(snackBarWidget.behavior, SnackBarBehavior.floating);
      expect(snackBarWidget.duration, const Duration(seconds: 2));

      // Verify content text style
      final content = snackBarWidget.content as Text;
      expect(content.style?.color, Colors.white);
    });
  });
}
