/// Interactions Atoms - Centralized touch/input interaction widgets
///
/// Platform-aware interactive elements following SRP:
/// - TouchTarget: Platform-appropriate tappable areas
/// - ResizeHandle: Platform-aware drag resize handles
/// - SwipeAction: Swipe-to-dismiss/action for lists (mobile)
/// - CollapseController: Atomic expand/collapse state manager
/// - CollapseToggleIcon: Animated chevron for collapse toggle
///
/// These atoms handle:
/// - Minimum touch target sizing (48dp mobile, 24dp web)
/// - Haptic feedback on mobile
/// - Cursor feedback on web/desktop
/// - Accessibility via Semantics
library;

export 'collapse_controller.dart';
export 'collapse_toggle_icon.dart';
export 'touch_target.dart';
export 'resize_handle.dart';
export 'swipe_action.dart';
