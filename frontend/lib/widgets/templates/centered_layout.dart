/// CenteredLayout - Simple centered content template for pre-auth pages
///
/// Provides a clean, centered layout without sidebar/navigation.
/// Used for: Login, Registration, Password Reset, Error pages
///
/// Features:
/// - Responsive max-width constraint
/// - Centered content with scroll support
/// - Optional footer
/// - No app bar or sidebar (pre-auth context)
///
/// Complements AdaptiveShell:
/// - AdaptiveShell: Authenticated pages with sidebar navigation
/// - CenteredLayout: Pre-auth/standalone pages without navigation
///
/// Usage:
/// ```dart
/// CenteredLayout(
///   maxWidth: 500,
///   child: LoginContent(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../config/app_spacing.dart';

/// Centered layout template for pre-auth pages
class CenteredLayout extends StatelessWidget {
  /// The main body content
  final Widget child;

  /// Maximum width for the centered container
  final double maxWidth;

  /// Optional footer widget
  final Widget? footer;

  /// Padding around the content
  final EdgeInsetsGeometry? padding;

  /// Whether to wrap content in SafeArea
  final bool useSafeArea;

  const CenteredLayout({
    super.key,
    required this.child,
    this.maxWidth = 500,
    this.footer,
    this.padding,
    this.useSafeArea = true,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    Widget content = Center(
      child: Container(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: SingleChildScrollView(
          padding: padding ?? spacing.paddingXL,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              child,
              if (footer != null) ...[SizedBox(height: spacing.xl), footer!],
            ],
          ),
        ),
      ),
    );

    if (useSafeArea) {
      content = SafeArea(child: content);
    }

    return Scaffold(body: content);
  }

  /// Static factory for login-style pages with responsive width
  static Widget responsive({
    Key? key,
    required Widget child,
    Widget? footer,
    EdgeInsetsGeometry? padding,
  }) {
    return _ResponsiveCenteredLayout(
      key: key,
      footer: footer,
      padding: padding,
      child: child,
    );
  }
}

/// Responsive variant that adjusts width based on screen size
class _ResponsiveCenteredLayout extends StatelessWidget {
  final Widget child;
  final Widget? footer;
  final EdgeInsetsGeometry? padding;

  const _ResponsiveCenteredLayout({
    super.key,
    required this.child,
    this.footer,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWideScreen = AppBreakpoints.isDesktop(constraints.maxWidth);
            final maxWidth = isWideScreen ? 500.0 : constraints.maxWidth * 0.9;

            return Center(
              child: Container(
                constraints: BoxConstraints(maxWidth: maxWidth),
                child: SingleChildScrollView(
                  padding: padding ?? spacing.paddingXL,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      child,
                      if (footer != null) ...[
                        SizedBox(height: spacing.xl),
                        footer!,
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
