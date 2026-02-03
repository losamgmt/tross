/// PlatformUtilities - Platform detection and adaptive behavior
///
/// Single source of truth for ALL platform-aware behavior:
/// - Platform detection (iOS, Android, Web, Desktop)
/// - Touch vs pointer device classification
/// - Scroll physics (bouncing iOS, clamping Android/Web)
/// - Keyboard dismiss behavior
/// - Modal sizing behavior
/// - Touch target sizing
///
/// CENTRALIZED: All platform checks flow through this class.
/// NO SCATTER: Components never check Platform/kIsWeb directly.
library;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'dart:io' show Platform;

/// Platform detection and adaptive utilities
class PlatformUtilities {
  PlatformUtilities._();

  // ============================================================================
  // PLATFORM DETECTION
  // ============================================================================

  static bool get isWeb => kIsWeb;

  static bool get isIOS {
    if (kIsWeb) return false;
    try {
      return Platform.isIOS;
    } catch (_) {
      return false;
    }
  }

  static bool get isAndroid {
    if (kIsWeb) return false;
    try {
      return Platform.isAndroid;
    } catch (_) {
      return false;
    }
  }

  static bool get isMobile {
    if (kIsWeb) return false;
    try {
      return Platform.isIOS || Platform.isAndroid;
    } catch (_) {
      return false;
    }
  }

  static bool get isDesktop {
    if (kIsWeb) return false;
    try {
      return Platform.isWindows || Platform.isMacOS || Platform.isLinux;
    } catch (_) {
      return false;
    }
  }

  /// Touch-primary (mobile) vs pointer-primary (web/desktop)
  static bool get isTouchDevice => isMobile;
  static bool get isPointerDevice => isWeb || isDesktop;

  // ============================================================================
  // TOUCH TARGET CONSTANTS (Material Design)
  // ============================================================================

  /// Minimum touch target (48dp)
  static const double minTouchTarget = 48.0;

  /// Minimum pointer target (24dp)
  static const double minPointerTarget = 24.0;

  /// Platform-appropriate minimum interactive size
  static double get minInteractiveSize =>
      isTouchDevice ? minTouchTarget : minPointerTarget;

  // ============================================================================
  // SCROLL PHYSICS
  // ============================================================================

  /// Platform-appropriate scroll physics
  /// - iOS: BouncingScrollPhysics (elastic overscroll)
  /// - Android/Web/Desktop: ClampingScrollPhysics (hard stop)
  static ScrollPhysics get scrollPhysics =>
      isIOS ? const BouncingScrollPhysics() : const ClampingScrollPhysics();

  /// Always-scrollable version of platform physics
  static ScrollPhysics get alwaysScrollablePhysics => isIOS
      ? const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics())
      : const ClampingScrollPhysics(parent: AlwaysScrollableScrollPhysics());

  // ============================================================================
  // KEYBOARD BEHAVIOR
  // ============================================================================

  /// Platform-appropriate keyboard dismiss behavior
  /// - Touch devices: Dismiss on drag (natural mobile UX)
  /// - Pointer devices: Manual (user clicks away)
  static ScrollViewKeyboardDismissBehavior get keyboardDismissBehavior =>
      isTouchDevice
      ? ScrollViewKeyboardDismissBehavior.onDrag
      : ScrollViewKeyboardDismissBehavior.manual;

  // ============================================================================
  // MODAL BEHAVIOR
  // ============================================================================

  /// Whether to use full-screen modals on current device
  /// Full-screen on phones, dialog on tablets/desktop
  static bool shouldUseFullScreenModal(double screenWidth) =>
      screenWidth < 600; // Compact breakpoint

  /// Get appropriate modal constraints
  static BoxConstraints modalConstraints(BuildContext context) {
    final size = MediaQuery.of(context).size;
    if (shouldUseFullScreenModal(size.width)) {
      return BoxConstraints(maxWidth: size.width, maxHeight: size.height);
    }
    return BoxConstraints(maxWidth: 600, maxHeight: size.height * 0.85);
  }

  // ============================================================================
  // ADAPTIVE HELPERS
  // ============================================================================

  /// Returns platform-appropriate value (touch vs pointer)
  static T adaptive<T>({required T pointer, required T touch}) =>
      isTouchDevice ? touch : pointer;

  /// Returns platform-appropriate size
  static double adaptiveSize({
    required double pointer,
    required double touch,
  }) => adaptive(pointer: pointer, touch: touch);

  /// Returns breakpoint-appropriate value (compact/medium/expanded)
  ///
  /// Uses Material Design 3 breakpoints:
  /// - Compact: < 600dp (phones)
  /// - Medium: 600-839dp (small tablets, foldables)
  /// - Expanded: >= 840dp (tablets, desktop)
  static T breakpointAdaptive<T>({
    required BuildContext context,
    required T compact,
    T? medium,
    required T expanded,
  }) {
    final width = MediaQuery.of(context).size.width;
    if (width < 600) return compact;
    if (width < 840) return medium ?? compact;
    return expanded;
  }
}
