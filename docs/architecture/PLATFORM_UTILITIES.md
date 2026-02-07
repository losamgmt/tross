# Platform Utilities & Mobile Readiness

## Overview

Tross uses a **centralized platform detection and adaptive behavior system** through `PlatformUtilities`. This ensures consistent cross-platform behavior without scattered platform checks throughout the codebase.

## Architecture

### Single Source of Truth

All platform-aware behavior flows through `lib/config/platform_utilities.dart`:

```dart
// ❌ Never do this (scattered checks)
if (kIsWeb) { ... }
if (Platform.isIOS) { ... }

// ✅ Always use PlatformUtilities
if (PlatformUtilities.isTouchDevice) { ... }
PlatformUtilities.scrollPhysics
PlatformUtilities.adaptive(pointer: 8, touch: 48)
```

### Platform Detection

| Property          | Description                   |
| ----------------- | ----------------------------- |
| `isWeb`           | Running in browser            |
| `isIOS`           | Native iOS app                |
| `isAndroid`       | Native Android app            |
| `isMobile`        | iOS or Android native         |
| `isDesktop`       | Windows, macOS, or Linux      |
| `isTouchDevice`   | Touch-primary (mobile native) |
| `isPointerDevice` | Pointer-primary (web/desktop) |

### Adaptive Helpers

```dart
// Platform-specific values
final size = PlatformUtilities.adaptiveSize(
  pointer: 8.0,   // Web/Desktop
  touch: 48.0,    // Mobile
);

// Breakpoint-specific values (Material Design 3)
final layout = PlatformUtilities.breakpointAdaptive<LayoutType>(
  context: context,
  compact: LayoutType.single,    // < 600dp (phones)
  medium: LayoutType.dual,       // 600-839dp (tablets)
  expanded: LayoutType.triple,   // >= 840dp (desktop)
);
```

## Mobile-First Atoms

### TouchTarget

Platform-aware tappable area wrapper ensuring Material Design touch targets:

```dart
// Minimum 48dp on touch, 24dp on pointer devices
TouchTarget(
  onTap: () => doSomething(),
  hapticFeedback: true,  // Light impact on touch devices
  child: Icon(Icons.edit),
)

// Icon button replacement
TouchTarget.icon(
  icon: Icons.refresh,
  onTap: _refresh,
  tooltip: 'Refresh data',
)

// For InputDecoration.suffixIcon
suffixIcon: TouchTarget.suffix(
  icon: Icons.clear,
  onTap: _clear,
)
```

### ResizeHandle

Platform-aware drag handle for resizing:

```dart
ResizeHandle.horizontal(
  onDragUpdate: (delta) => updateWidth(delta),
  indicatorLength: 24,
)
// Mobile: 48dp drag area
// Desktop: 8dp with cursor feedback
```

### SwipeAction

Touch-only swipe gestures (disabled on pointer devices):

```dart
// Simple delete swipe
SwipeAction.delete(
  onDelete: () => deleteItem(),
  confirmDelete: () => showConfirmDialog(),
  child: ListTile(title: Text('Item')),
)

// Multi-action swipe
SwipeActionContainer(
  leadingActions: [archiveAction],
  trailingActions: [deleteAction],
  child: ListTile(...),
)
```

### AdaptiveScroll

Platform-appropriate scroll physics:

```dart
AdaptiveScroll(
  child: MyContent(),
)
// iOS: BouncingScrollPhysics (elastic overscroll)
// Android/Web: ClampingScrollPhysics (hard stop)

AdaptiveListView(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemWidget(items[index]),
)
```

## Mobile-First Molecules

### MobileNavBar

Material Design 3 bottom navigation for compact screens:

```dart
MobileNavBar.fromItems(
  allItems: sidebarItems,  // Auto-filters to max 5 with icons
  currentRoute: '/home',
  onItemTap: (item) => context.go(item.route!),
)
```

### ScrollableContent

Enhanced scrollable container with platform defaults:

```dart
ScrollableContent(
  child: FormContent(),
)
// Auto-applies:
// - Platform scroll physics
// - Keyboard dismiss on scroll (mobile)
// - Tap-outside to dismiss keyboard (mobile)
```

## Modal Behavior

Modals adapt to screen size:

```dart
GenericModal.show(
  context: context,
  title: 'Edit Item',
  content: EditForm(),
  adaptiveFullScreen: true,  // Default
);
// Compact screens (< 600dp): Full-screen with AppBar
// Expanded screens: Centered dialog
```

## Template-Level Integration

### AdaptiveShell

The main layout template integrates mobile navigation:

```dart
AdaptiveShell(
  currentRoute: '/home',
  pageTitle: 'Dashboard',
  showBottomNav: true,  // Shows MobileNavBar on compact screens
  mobileNavItems: customItems,  // Optional override
  body: const DashboardContent(),
)
```

Layout behavior:

- **Compact (< 900dp)**: Hamburger menu + bottom nav
- **Expanded (>= 900dp)**: Persistent sidebar

## Table Enhancements

### Pinned Columns

Data tables auto-pin first column on compact screens:

```dart
AppDataTable<User>(
  columns: columns,
  data: users,
  pinnedColumns: null,  // Auto: pins on compact, none on expanded
  // pinnedColumns: 2,  // Always pin 2 columns
  // pinnedColumns: 0,  // Disable pinning
)
```

### Platform-Aware Resize Handles

Column resize handles adapt:

- **Touch**: 48dp drag area with haptic feedback
- **Pointer**: 8dp area with cursor feedback

## Testing

All platform atoms have behavioral tests:

```
test/config/platform_utilities_test.dart
test/widgets/atoms/containers/adaptive_scroll_test.dart
test/widgets/atoms/interactions/touch_target_test.dart
test/widgets/atoms/interactions/resize_handle_test.dart
test/widgets/atoms/interactions/swipe_action_test.dart
test/widgets/molecules/navigation/mobile_nav_bar_test.dart
```

## Migration Guide

### From IconButton to TouchTarget

```dart
// Before
IconButton(
  icon: Icon(Icons.edit),
  onPressed: _edit,
  tooltip: 'Edit',
)

// After
TouchTarget.icon(
  icon: Icons.edit,
  onTap: _edit,
  tooltip: 'Edit',
)
```

### From InkWell to TouchTarget

```dart
// Before
InkWell(
  onTap: _handleTap,
  borderRadius: BorderRadius.circular(8),
  child: MyWidget(),
)

// After
TouchTarget(
  onTap: _handleTap,
  semanticLabel: 'Action description',
  child: MyWidget(),
)
```

## Checklist

- [x] All `IconButton` → `TouchTarget.icon`
- [x] All `InkWell` (tappable) → `TouchTarget`
- [x] Scroll containers → `AdaptiveScroll` or `ScrollableContent`
- [x] Lists → `AdaptiveListView`
- [x] Resize handles → `ResizeHandle`
- [x] Swipe actions → `SwipeAction` (touch-only)
- [x] Bottom nav → `MobileNavBar` via `AdaptiveShell`
- [x] Modals → `GenericModal.adaptiveFullScreen`
- [x] Tables → `AppDataTable.pinnedColumns`
