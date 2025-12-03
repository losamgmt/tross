/// AppSizes - Centralized responsive component sizing system
///
/// Defines standard sizes for UI components (buttons, inputs, avatars, etc.)
/// Uses relative units based on theme and screen size for responsive design.
///
/// Separation of Concerns:
/// - AppSpacing: Padding, margins, gaps between components + Icon sizes
/// - AppSizes: Component dimensions (width, height, radius)
/// - Theme: Visual styling (colors, typography, shadows)
///
/// IMPORTANT: Icon sizes live in AppSpacing, NOT here!
/// Use context.spacing.iconSizeXS/SM/MD/LG/XL for all icon sizing.
///
/// Hard-coded icon size migration guide:
/// - size: 12 → context.spacing.iconSizeXS
/// - size: 14 → context.spacing.iconSizeSM
/// - size: 16 → context.spacing.iconSizeMD
/// - size: 20 → context.spacing.iconSizeLG
/// - size: 22 → context.spacing.iconSizeLG (rounds to 20)
/// - size: 24 → context.spacing.iconSizeXL
///
/// Usage:
/// ```dart
/// // Responsive approach (recommended):
/// SizedBox(
///   width: context.sizes.inputWidthStandard,
///   height: context.sizes.buttonHeightMedium,
/// )
///
/// // Static approach (use sparingly):
/// Container(width: AppSizes.staticAvatarMedium)
/// ```
library;

import 'package:flutter/material.dart';

/// Extension on BuildContext for easy access to sizes
extension SizesExtension on BuildContext {
  AppSizes get sizes => AppSizes.of(this);
}

class AppSizes {
  final BuildContext context;

  AppSizes.of(this.context);

  // Base unit - scales with text scale factor
  double get _baseUnit {
    final textScaleFactor = MediaQuery.textScalerOf(context).scale(1.0);
    return 8.0 * textScaleFactor; // 8dp base unit
  }

  // ============================================================================
  // BUTTONS - Standard button heights
  // ============================================================================

  /// Compact button height (28dp) - Dense UIs
  double get buttonHeightCompact => _baseUnit * 3.5;

  /// Small button height (32dp) - Secondary actions
  double get buttonHeightSmall => _baseUnit * 4;

  /// Medium button height (40dp) - Standard buttons
  double get buttonHeightMedium => _baseUnit * 5;

  /// Large button height (48dp) - Primary actions
  double get buttonHeightLarge => _baseUnit * 6;

  /// Extra large button height (56dp) - Hero CTAs
  double get buttonHeightXLarge => _baseUnit * 7;

  // ============================================================================
  // INPUTS - Form field heights and widths
  // ============================================================================

  /// Compact input height (32dp) - Dense forms
  double get inputHeightCompact => _baseUnit * 4;

  /// Standard input height (40dp) - Normal forms
  double get inputHeightStandard => _baseUnit * 5;

  /// Large input height (48dp) - Touch-friendly forms
  double get inputHeightLarge => _baseUnit * 6;

  /// Narrow input width (120dp) - Short fields (zip, age)
  double get inputWidthNarrow => _baseUnit * 15;

  /// Standard input width (200dp) - Normal fields
  double get inputWidthStandard => _baseUnit * 25;

  /// Wide input width (320dp) - Long fields (email, address)
  double get inputWidthWide => _baseUnit * 40;

  /// Full width input - Responsive to container
  double get inputWidthFull => double.infinity;

  // ============================================================================
  // AVATARS - User profile images
  // ============================================================================

  /// Extra small avatar (24dp) - Inline mentions
  double get avatarSizeXS => _baseUnit * 3;

  /// Small avatar (32dp) - List items
  double get avatarSizeSmall => _baseUnit * 4;

  /// Medium avatar (48dp) - Cards, headers
  double get avatarSizeMedium => _baseUnit * 6;

  /// Large avatar (64dp) - Profile views
  double get avatarSizeLarge => _baseUnit * 8;

  /// Extra large avatar (96dp) - Profile headers
  double get avatarSizeXL => _baseUnit * 12;

  /// Huge avatar (128dp) - Full profile pages
  double get avatarSizeHuge => _baseUnit * 16;

  // ============================================================================
  // CARDS - Card dimensions
  // ============================================================================

  /// Minimum card height (80dp)
  double get cardMinHeight => _baseUnit * 10;

  /// Standard card height (120dp)
  double get cardStandardHeight => _baseUnit * 15;

  /// Large card height (200dp)
  double get cardLargeHeight => _baseUnit * 25;

  /// Card max width for centered layouts (600dp)
  double get cardMaxWidth => _baseUnit * 75;

  // ============================================================================
  // MODALS & DIALOGS - Modal dimensions
  // ============================================================================

  /// Small modal width (400dp)
  double get modalWidthSmall => _baseUnit * 50;

  /// Medium modal width (600dp)
  double get modalWidthMedium => _baseUnit * 75;

  /// Large modal width (800dp)
  double get modalWidthLarge => _baseUnit * 100;

  /// Modal max height (80% of screen)
  double get modalMaxHeight => MediaQuery.of(context).size.height * 0.8;

  // ============================================================================
  // DIVIDERS & SEPARATORS - Line thicknesses
  // ============================================================================

  /// Thin divider (1dp)
  double get dividerThin => 1.0;

  /// Standard divider (2dp)
  double get dividerStandard => 2.0;

  /// Thick divider (4dp)
  double get dividerThick => 4.0;

  // ============================================================================
  // BADGES & CHIPS - Small UI elements
  // ============================================================================

  /// Small badge size (16dp)
  double get badgeSizeSmall => _baseUnit * 2;

  /// Medium badge size (20dp)
  double get badgeSizeMedium => _baseUnit * 2.5;

  /// Large badge size (24dp)
  double get badgeSizeLarge => _baseUnit * 3;

  /// Chip height (28dp)
  double get chipHeight => _baseUnit * 3.5;

  // ============================================================================
  // STATIC SIZES - Common fixed sizes (use sparingly, prefer responsive)
  // ============================================================================

  /// Standard avatar (static fallback) - 48dp
  static const double staticAvatarMedium = 48.0;

  /// Standard button height (static fallback) - 40dp
  static const double staticButtonHeight = 40.0;

  /// Standard input height (static fallback) - 40dp
  static const double staticInputHeight = 40.0;
}
