/// Spacing Test Helpers
///
/// Provides access to AppSpacing constants for testing
/// and utilities for verifying spacing in widgets
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/app_spacing.dart';

/// Access to all AppSpacing constant values for testing
///
/// Use this in tests instead of hardcoded pixel values
/// to ensure tests match actual component spacing
///
/// Example:
/// ```dart
/// expect(
///   container.padding,
///   EdgeInsets.all(TestSpacing.sm),
/// );
/// ```
class TestSpacing {
  /// No spacing (0dp)
  static const double none = 0.0;

  /// Extra extra small spacing (3dp at default scale)
  static const double xxs = AppSpacingConst.xxs;

  /// Extra small spacing (4.5dp at default scale)
  static const double xs = AppSpacingConst.xs;

  /// Small spacing (6dp at default scale)
  static const double sm = AppSpacingConst.sm;

  /// Medium spacing (9dp at default scale)
  static const double md = AppSpacingConst.md;

  /// Large spacing (12dp at default scale)
  static const double lg = AppSpacingConst.lg;

  /// Extra large spacing (18dp at default scale)
  static const double xl = AppSpacingConst.xl;

  /// Extra extra large spacing (24dp at default scale)
  static const double xxl = AppSpacingConst.xxl;

  /// Extra extra extra large spacing (36dp at default scale)
  static const double xxxl = AppSpacingConst.xxxl;
}

/// Common spacing patterns for widget tests
class SpacingPatterns {
  /// Compact badge padding (used in StatusBadge)
  static EdgeInsets get compactBadge => EdgeInsets.symmetric(
    horizontal: TestSpacing.sm,
    vertical: TestSpacing.xxs,
  );

  /// Normal badge padding (used in StatusBadge)
  static EdgeInsets get normalBadge => EdgeInsets.symmetric(
    horizontal: TestSpacing.md,
    vertical: TestSpacing.xs,
  );

  /// Card padding (used in various card components)
  static EdgeInsets get card => EdgeInsets.all(TestSpacing.lg);

  /// Small card padding
  static EdgeInsets get cardSmall => EdgeInsets.all(TestSpacing.md);

  /// Table cell padding
  static EdgeInsets get tableCell => EdgeInsets.symmetric(
    horizontal: TestSpacing.sm,
    vertical: TestSpacing.sm,
  );

  /// Button padding
  static EdgeInsets get button => EdgeInsets.symmetric(
    horizontal: TestSpacing.lg,
    vertical: TestSpacing.sm,
  );

  /// Section padding (for screen sections)
  static EdgeInsets get section => EdgeInsets.all(TestSpacing.xl);

  /// Small gap between elements
  static SizedBox get gapSmall => SizedBox(height: TestSpacing.sm);

  /// Medium gap between elements
  static SizedBox get gapMedium => SizedBox(height: TestSpacing.md);

  /// Large gap between sections
  static SizedBox get gapLarge => SizedBox(height: TestSpacing.lg);
}

/// Utilities for verifying spacing in tests
class SpacingTestUtils {
  /// Verify EdgeInsets matches expected spacing constant
  static void expectSpacing(
    EdgeInsetsGeometry actual,
    EdgeInsets expected, {
    String? reason,
  }) {
    expect(
      actual,
      expected,
      reason: reason ?? 'Expected spacing to match AppSpacing constants',
    );
  }

  /// Verify padding uses AppSpacing system
  static void expectAppSpacing(
    EdgeInsetsGeometry actual,
    double all, {
    String? reason,
  }) {
    expect(
      actual,
      EdgeInsets.all(all),
      reason: reason ?? 'Expected padding to use AppSpacing: $all',
    );
  }

  /// Verify symmetric padding uses AppSpacing system
  static void expectSymmetricSpacing(
    EdgeInsetsGeometry actual, {
    required double horizontal,
    required double vertical,
    String? reason,
  }) {
    expect(
      actual,
      EdgeInsets.symmetric(horizontal: horizontal, vertical: vertical),
      reason:
          reason ?? 'Expected symmetric padding: h=$horizontal, v=$vertical',
    );
  }

  /// Verify gap widget height
  static void expectGapHeight(SizedBox gap, double expectedHeight) {
    expect(
      gap.height,
      expectedHeight,
      reason: 'Expected gap height to match AppSpacing constant',
    );
  }

  /// Verify gap widget width
  static void expectGapWidth(SizedBox gap, double expectedWidth) {
    expect(
      gap.width,
      expectedWidth,
      reason: 'Expected gap width to match AppSpacing constant',
    );
  }
}
