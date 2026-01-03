/// Tests for EntityFileAttachments molecule
///
/// **BEHAVIORAL FOCUS:**
/// - Displays files with correct metadata
/// - Shows loading, error, and empty states
/// - Handles upload/download/delete callbacks
/// - Respects readOnly mode
/// - Shows upload progress indicator
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/molecules/display/entity_file_attachments.dart';
import 'package:tross_app/models/file_attachment.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  // Test data factory
  FileAttachment createTestFile({
    int id = 1,
    String filename = 'document.pdf',
    String mimeType = 'application/pdf',
    int fileSize = 1024 * 100, // 100KB
    String category = 'attachment',
  }) {
    return FileAttachment(
      id: id,
      entityType: 'work_order',
      entityId: 42,
      originalFilename: filename,
      mimeType: mimeType,
      fileSize: fileSize,
      category: category,
      createdAt: DateTime(2024, 1, 15),
    );
  }

  group('EntityFileAttachments', () {
    group('basic display', () {
      testWidgets('displays default title "Attachments"', (tester) async {
        await tester.pumpTestWidget(const EntityFileAttachments());

        expect(find.text('Attachments'), findsOneWidget);
      });

      testWidgets('displays custom title when provided', (tester) async {
        await tester.pumpTestWidget(
          const EntityFileAttachments(title: 'Documents'),
        );

        expect(find.text('Documents'), findsOneWidget);
      });

      testWidgets('displays attach icon in header', (tester) async {
        await tester.pumpTestWidget(const EntityFileAttachments());

        expect(find.byIcon(Icons.attach_file), findsOneWidget);
      });
    });

    group('loading state', () {
      testWidgets('shows loading indicator when loading=true', (tester) async {
        await tester.pumpTestWidget(const EntityFileAttachments(loading: true));

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('does not show file list when loading', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(loading: true, files: [createTestFile()]),
        );

        expect(find.text('document.pdf'), findsNothing);
      });
    });

    group('error state', () {
      testWidgets('shows error message when error is provided', (tester) async {
        await tester.pumpTestWidget(
          const EntityFileAttachments(error: 'Network error'),
        );

        expect(find.text('Failed to load files'), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
      });

      testWidgets('shows retry button when error and onRetry provided', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(error: 'Failed', onRetry: () {}),
        );

        expect(find.text('Try Again'), findsOneWidget);
      });

      testWidgets('calls onRetry when retry button tapped', (tester) async {
        bool retryCalled = false;

        await tester.pumpTestWidget(
          EntityFileAttachments(
            error: 'Failed',
            onRetry: () => retryCalled = true,
          ),
        );

        await tester.tap(find.text('Try Again'));
        expect(retryCalled, isTrue);
      });
    });

    group('empty state', () {
      testWidgets('shows empty message when files is empty', (tester) async {
        await tester.pumpTestWidget(const EntityFileAttachments(files: []));

        expect(find.text('No files attached'), findsOneWidget);
        expect(find.byIcon(Icons.folder_open), findsOneWidget);
      });

      testWidgets('shows empty message when files is null and not loading', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const EntityFileAttachments(files: null, loading: false),
        );

        expect(find.text('No files attached'), findsOneWidget);
      });
    });

    group('file list display', () {
      testWidgets('displays file name', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [createTestFile(filename: 'report.pdf')],
          ),
        );

        expect(find.text('report.pdf'), findsOneWidget);
      });

      testWidgets('displays formatted file size', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(files: [createTestFile(fileSize: 2048)]),
        );

        expect(find.textContaining('2.0 KB'), findsOneWidget);
      });

      testWidgets('displays file category', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(files: [createTestFile(category: 'receipt')]),
        );

        expect(find.textContaining('Receipt'), findsOneWidget);
      });

      testWidgets('displays multiple files', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [
              createTestFile(id: 1, filename: 'file1.pdf'),
              createTestFile(id: 2, filename: 'file2.pdf'),
              createTestFile(id: 3, filename: 'file3.pdf'),
            ],
          ),
        );

        expect(find.text('file1.pdf'), findsOneWidget);
        expect(find.text('file2.pdf'), findsOneWidget);
        expect(find.text('file3.pdf'), findsOneWidget);
      });

      testWidgets('shows PDF icon for PDF files', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [createTestFile(mimeType: 'application/pdf')],
          ),
        );

        expect(find.byIcon(Icons.picture_as_pdf), findsOneWidget);
      });

      testWidgets('shows image icon for image files', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [
              createTestFile(filename: 'photo.jpg', mimeType: 'image/jpeg'),
            ],
          ),
        );

        expect(find.byIcon(Icons.image), findsOneWidget);
      });
    });

    group('upload button', () {
      testWidgets('shows upload button when not readOnly', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(readOnly: false, onUpload: () {}),
        );

        expect(find.byIcon(Icons.add), findsOneWidget);
      });

      testWidgets('hides upload button when readOnly=true', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(readOnly: true, onUpload: () {}),
        );

        expect(find.byIcon(Icons.add), findsNothing);
      });

      testWidgets('calls onUpload when upload button tapped', (tester) async {
        bool uploadCalled = false;

        await tester.pumpTestWidget(
          EntityFileAttachments(onUpload: () => uploadCalled = true),
        );

        await tester.tap(find.byIcon(Icons.add));
        expect(uploadCalled, isTrue);
      });

      testWidgets('shows spinner when uploading=true', (tester) async {
        await tester.pumpTestWidget(
          const EntityFileAttachments(uploading: true, readOnly: false),
        );

        // Should show a small spinner instead of the add button
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.byIcon(Icons.add), findsNothing);
      });
    });

    group('download action', () {
      testWidgets('shows download button for each file', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(files: [createTestFile()], onDownload: (_) {}),
        );

        expect(find.byIcon(Icons.download), findsOneWidget);
      });

      testWidgets('calls onDownload with correct file when tapped', (
        tester,
      ) async {
        FileAttachment? downloadedFile;
        final testFile = createTestFile(id: 42, filename: 'test.pdf');

        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [testFile],
            onDownload: (file) => downloadedFile = file,
          ),
        );

        await tester.tap(find.byIcon(Icons.download));
        expect(downloadedFile?.id, 42);
        expect(downloadedFile?.originalFilename, 'test.pdf');
      });
    });

    group('delete action', () {
      testWidgets('shows delete button when not readOnly', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [createTestFile()],
            readOnly: false,
            onDelete: (_) {},
          ),
        );

        expect(find.byIcon(Icons.delete_outline), findsOneWidget);
      });

      testWidgets('hides delete button when readOnly=true', (tester) async {
        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [createTestFile()],
            readOnly: true,
            onDelete: (_) {},
          ),
        );

        expect(find.byIcon(Icons.delete_outline), findsNothing);
      });

      testWidgets('calls onDelete with correct file when tapped', (
        tester,
      ) async {
        FileAttachment? deletedFile;
        final testFile = createTestFile(id: 99, filename: 'delete-me.pdf');

        await tester.pumpTestWidget(
          EntityFileAttachments(
            files: [testFile],
            onDelete: (file) => deletedFile = file,
          ),
        );

        await tester.tap(find.byIcon(Icons.delete_outline));
        expect(deletedFile?.id, 99);
        expect(deletedFile?.originalFilename, 'delete-me.pdf');
      });
    });

    group('FileListTile widget', () {
      testWidgets('renders correctly', (tester) async {
        await tester.pumpTestWidget(
          FileListTile(
            file: createTestFile(filename: 'standalone.pdf'),
            onDownload: () {},
          ),
        );

        expect(find.text('standalone.pdf'), findsOneWidget);
      });

      testWidgets('download callback works', (tester) async {
        bool downloadCalled = false;

        await tester.pumpTestWidget(
          FileListTile(
            file: createTestFile(),
            onDownload: () => downloadCalled = true,
          ),
        );

        await tester.tap(find.byIcon(Icons.download));
        expect(downloadCalled, isTrue);
      });

      testWidgets('delete callback works', (tester) async {
        bool deleteCalled = false;

        await tester.pumpTestWidget(
          FileListTile(
            file: createTestFile(),
            onDelete: () => deleteCalled = true,
          ),
        );

        await tester.tap(find.byIcon(Icons.delete_outline));
        expect(deleteCalled, isTrue);
      });
    });
  });
}
