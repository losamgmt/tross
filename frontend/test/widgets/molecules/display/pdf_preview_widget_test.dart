/// Tests for PdfPreviewWidget stub (non-web platform)
///
/// **BEHAVIORAL FOCUS:**
/// - Displays PDF preview message
/// - Shows download prompt
/// - Renders correctly with required props
///
/// NOTE: This tests the STUB implementation since Flutter tests run in VM.
/// Web implementation with iframe cannot be unit tested directly.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross/widgets/molecules/display/pdf_preview_stub.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  group('PdfPreviewWidget (stub)', () {
    testWidgets('renders with required props', (tester) async {
      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 42,
        ),
      );

      // Should render without errors
      expect(find.byType(PdfPreviewWidget), findsOneWidget);
    });

    testWidgets('displays PDF preview title', (tester) async {
      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 1,
        ),
      );

      expect(find.text('PDF Preview'), findsOneWidget);
    });

    testWidgets('shows browser-only message', (tester) async {
      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 1,
        ),
      );

      expect(
        find.textContaining('only available in the browser'),
        findsOneWidget,
      );
    });

    testWidgets('shows download prompt', (tester) async {
      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 1,
        ),
      );

      expect(find.textContaining('download the file to view'), findsOneWidget);
    });

    testWidgets('displays PDF icon', (tester) async {
      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 1,
        ),
      );

      expect(find.byIcon(Icons.picture_as_pdf), findsOneWidget);
    });

    testWidgets('uses theme colors', (tester) async {
      final customTheme = ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      );

      await tester.pumpTestWidget(
        const PdfPreviewWidget(
          downloadUrl: 'https://example.com/file.pdf',
          fileId: 1,
        ),
        theme: customTheme,
      );

      // Widget should render with custom theme
      final container = tester.widget<Container>(
        find.descendant(
          of: find.byType(PdfPreviewWidget),
          matching: find.byType(Container),
        ),
      );

      expect(container.decoration, isNotNull);
    });
  });
}
