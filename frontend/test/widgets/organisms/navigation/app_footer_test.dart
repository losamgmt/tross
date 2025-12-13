/// Tests for AppFooter organism
///
/// **BEHAVIORAL FOCUS:**
/// - Displays copyright and version
/// - Renders links correctly
/// - Handles link taps
/// - Compact vs expanded layout
/// - Social links display
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/organisms/navigation/app_footer.dart';

import '../../../helpers/test_helpers.dart';

void main() {
  group('AppFooter', () {
    group('FooterLink', () {
      test('creates link with required fields', () {
        const link = FooterLink(id: 'privacy', label: 'Privacy');

        expect(link.id, 'privacy');
        expect(link.label, 'Privacy');
      });

      test('creates link with optional url', () {
        const link = FooterLink(id: 'terms', label: 'Terms', url: '/terms');

        expect(link.url, '/terms');
      });

      test('creates link with optional icon', () {
        const link = FooterLink(
          id: 'social',
          label: 'Twitter',
          icon: Icons.link,
        );

        expect(link.icon, Icons.link);
      });

      test('creates link with onTap callback', () {
        var tapped = false;
        final link = FooterLink(
          id: 'action',
          label: 'Action',
          onTap: () => tapped = true,
        );

        link.onTap!();
        expect(tapped, isTrue);
      });
    });

    group('FooterLinkGroup', () {
      test('creates group with title and links', () {
        const group = FooterLinkGroup(
          title: 'Resources',
          links: [
            FooterLink(id: 'docs', label: 'Documentation'),
            FooterLink(id: 'api', label: 'API'),
          ],
        );

        expect(group.title, 'Resources');
        expect(group.links.length, 2);
      });
    });

    group('copyright display', () {
      testWidgets('displays copyright text when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppFooter(copyrightText: '© 2025 TrossApp'),
        );

        expect(find.text('© 2025 TrossApp'), findsOneWidget);
      });

      testWidgets('no copyright shown when null', (tester) async {
        await tester.pumpTestWidget(const AppFooter());

        expect(find.textContaining('©'), findsNothing);
      });
    });

    group('version display', () {
      testWidgets('displays version when provided', (tester) async {
        await tester.pumpTestWidget(const AppFooter(version: 'v1.0.0'));

        expect(find.text('v1.0.0'), findsOneWidget);
      });

      testWidgets('shows copyright and version together', (tester) async {
        await tester.pumpTestWidget(
          const AppFooter(copyrightText: '© 2025 TrossApp', version: 'v1.2.3'),
        );

        expect(find.text('© 2025 TrossApp'), findsOneWidget);
        expect(find.text('v1.2.3'), findsOneWidget);
      });
    });

    group('links display', () {
      testWidgets('displays links when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppFooter(
            links: [
              FooterLink(id: 'privacy', label: 'Privacy'),
              FooterLink(id: 'terms', label: 'Terms'),
            ],
          ),
        );

        expect(find.text('Privacy'), findsOneWidget);
        expect(find.text('Terms'), findsOneWidget);
      });

      testWidgets('links are tappable', (tester) async {
        FooterLink? tappedLink;
        await tester.pumpTestWidget(
          AppFooter(
            links: const [FooterLink(id: 'privacy', label: 'Privacy')],
            onLinkTap: (link) => tappedLink = link,
          ),
        );

        await tester.tap(find.text('Privacy'));
        await tester.pumpAndSettle();

        expect(tappedLink?.id, 'privacy');
      });
    });

    group('compact vs expanded layout', () {
      testWidgets('compact is true by default', (tester) async {
        await tester.pumpTestWidget(const AppFooter(copyrightText: '© 2025'));

        // Should render compact footer (uses Row)
        expect(find.byType(Row), findsWidgets);
      });

      testWidgets('compact layout shows copyright and links in row', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const AppFooter(
            copyrightText: '© 2025',
            links: [FooterLink(id: 'test', label: 'Test')],
            compact: true,
          ),
        );

        expect(find.text('© 2025'), findsOneWidget);
        expect(find.text('Test'), findsOneWidget);
      });

      testWidgets('expanded layout renders different structure', (
        tester,
      ) async {
        await tester.pumpTestWidget(
          const AppFooter(copyrightText: '© 2025', compact: false),
        );

        // Should render expanded footer
        expect(find.text('© 2025'), findsOneWidget);
      });
    });

    group('custom content', () {
      testWidgets('displays custom content when provided', (tester) async {
        await tester.pumpTestWidget(
          const AppFooter(customContent: Text('Custom Footer Content')),
        );

        expect(find.text('Custom Footer Content'), findsOneWidget);
      });
    });

    group('background color', () {
      testWidgets('applies custom background color', (tester) async {
        await tester.pumpTestWidget(
          const AppFooter(
            copyrightText: '© 2025',
            backgroundColor: Colors.blue,
          ),
        );

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        final decoration = container.decoration as BoxDecoration?;
        expect(decoration?.color, Colors.blue);
      });
    });

    group('widget structure', () {
      testWidgets('uses Container for styling', (tester) async {
        await tester.pumpTestWidget(const AppFooter(copyrightText: '© 2025'));

        expect(find.byType(Container), findsWidgets);
      });

      testWidgets('has top border decoration', (tester) async {
        await tester.pumpTestWidget(const AppFooter(copyrightText: '© 2025'));

        final container = tester.widget<Container>(
          find.byType(Container).first,
        );
        final decoration = container.decoration as BoxDecoration?;
        expect(decoration?.border, isNotNull);
      });
    });

    group('full configuration', () {
      testWidgets('renders with all options', (tester) async {
        FooterLink? lastTapped;

        await tester.pumpTestWidget(
          AppFooter(
            copyrightText: '© 2025 TrossApp',
            version: 'v1.0.0',
            links: const [
              FooterLink(id: 'privacy', label: 'Privacy'),
              FooterLink(id: 'terms', label: 'Terms'),
            ],
            onLinkTap: (link) => lastTapped = link,
            compact: true,
            backgroundColor: Colors.grey.shade100,
          ),
        );

        expect(find.text('© 2025 TrossApp'), findsOneWidget);
        expect(find.text('v1.0.0'), findsOneWidget);
        expect(find.text('Privacy'), findsOneWidget);
        expect(find.text('Terms'), findsOneWidget);

        await tester.tap(find.text('Terms'));
        await tester.pumpAndSettle();

        expect(lastTapped?.id, 'terms');
      });
    });
  });
}
