/// AppSpacing - Centralized responsive spacing system
///
/// Uses relative units based on theme and screen size
/// NO HARDCODED PIXEL VALUES - all spacing is theme-relative
library;

import 'package:flutter/material.dart';

/// Extension on BuildContext for easy access to spacing
extension SpacingExtension on BuildContext {
  AppSpacing get spacing => AppSpacing.of(this);
}

class AppSpacing {
  final BuildContext context;

  AppSpacing.of(this.context);

  // Base unit - scales with text scale factor
  double get _baseUnit {
    final textScaleFactor = MediaQuery.textScalerOf(context).scale(1.0);
    return 6.0 * textScaleFactor; // 6dp base unit (reduced from 8dp)
  }

  // Spacing scale (multiples of base unit) - REDUCED FOR HIGHER DENSITY
  double get none => 0;
  double get xxs => _baseUnit * 0.5; // 3dp (was 4dp)
  double get xs => _baseUnit * 0.75; // 4.5dp (was 6dp)
  double get sm => _baseUnit; // 6dp (was 8dp)
  double get md => _baseUnit * 1.5; // 9dp (was 12dp)
  double get lg => _baseUnit * 2; // 12dp (was 16dp)
  double get xl => _baseUnit * 3; // 18dp (was 24dp)
  double get xxl => _baseUnit * 4; // 24dp (was 32dp)
  double get xxxl => _baseUnit * 6; // 36dp (was 48dp)

  // Common spacing patterns
  EdgeInsets get paddingXS => EdgeInsets.all(xs);
  EdgeInsets get paddingSM => EdgeInsets.all(sm);
  EdgeInsets get paddingMD => EdgeInsets.all(md);
  EdgeInsets get paddingLG => EdgeInsets.all(lg);
  EdgeInsets get paddingXL => EdgeInsets.all(xl);

  EdgeInsets get paddingSymmetricSM =>
      EdgeInsets.symmetric(horizontal: sm, vertical: sm);
  EdgeInsets get paddingSymmetricMD =>
      EdgeInsets.symmetric(horizontal: md, vertical: md);
  EdgeInsets get paddingSymmetricLG =>
      EdgeInsets.symmetric(horizontal: lg, vertical: lg);

  // SizedBox helpers
  Widget get gapXS => SizedBox(width: xs, height: xs);
  Widget get gapSM => SizedBox(width: sm, height: sm);
  Widget get gapMD => SizedBox(width: md, height: md);
  Widget get gapLG => SizedBox(width: lg, height: lg);
  Widget get gapXL => SizedBox(width: xl, height: xl);
  Widget get gapXXL => SizedBox(width: xxl, height: xxl);
  Widget get gapXXXL => SizedBox(width: xxxl, height: xxxl);

  Widget gapH(double multiplier) => SizedBox(width: _baseUnit * multiplier);
  Widget gapV(double multiplier) => SizedBox(height: _baseUnit * multiplier);

  // Border radius - scales with base unit
  BorderRadius get radiusXS => BorderRadius.circular(xs * 0.5);
  BorderRadius get radiusSM => BorderRadius.circular(sm);
  BorderRadius get radiusMD => BorderRadius.circular(md);
  BorderRadius get radiusLG => BorderRadius.circular(lg);
  BorderRadius get radiusXL => BorderRadius.circular(xl);

  // Icon sizes - relative to text
  double get iconSizeXS =>
      Theme.of(context).textTheme.bodySmall?.fontSize ?? 12.0;
  double get iconSizeSM =>
      Theme.of(context).textTheme.bodyMedium?.fontSize ?? 14.0;
  double get iconSizeMD =>
      Theme.of(context).textTheme.bodyLarge?.fontSize ?? 16.0;
  double get iconSizeLG =>
      Theme.of(context).textTheme.titleMedium?.fontSize ?? 20.0;
  double get iconSizeXL =>
      Theme.of(context).textTheme.titleLarge?.fontSize ?? 24.0;
}

/// Static spacing constants for const contexts
/// Use these only when you MUST use const (build performance)
class AppSpacingConst {
  // Base 6dp spacing scale - REDUCED FOR HIGHER DENSITY
  static const double xxs = 3.0; // Reduced from 4.0
  static const double xs = 4.5; // Reduced from 6.0
  static const double sm = 6.0; // Reduced from 8.0
  static const double md = 9.0; // Reduced from 12.0
  static const double lg = 12.0; // Reduced from 16.0
  static const double xl = 18.0; // Reduced from 24.0
  static const double xxl = 24.0; // Reduced from 32.0
  static const double xxxl = 36.0; // Reduced from 48.0

  // Common padding patterns
  static const EdgeInsets paddingSM = EdgeInsets.all(sm);
  static const EdgeInsets paddingMD = EdgeInsets.all(md);
  static const EdgeInsets paddingLG = EdgeInsets.all(lg);
  static const EdgeInsets paddingXL = EdgeInsets.all(xl);

  // SizedBox helpers
  static const Widget gapXS = SizedBox(width: xs, height: xs);
  static const Widget gapSM = SizedBox(width: sm, height: sm);
  static const Widget gapMD = SizedBox(width: md, height: md);
  static const Widget gapLG = SizedBox(width: lg, height: lg);
  static const Widget gapXL = SizedBox(width: xl, height: xl);
}
