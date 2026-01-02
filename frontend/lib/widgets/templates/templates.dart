/// Templates - Exports
///
/// Page-level templates that compose organisms into full layouts.
/// Templates are the highest level in atomic design before pages/screens.
///
/// Templates define:
/// - Page structure and layout
/// - Responsive behavior
/// - Navigation patterns
library;

// Adaptive/Responsive layouts
export 'adaptive_shell.dart';
export 'master_detail_layout.dart';

// Page templates
export 'tabbed_page.dart';
export 'dashboard_page.dart';

// Re-export navigation types for convenience
export '../organisms/navigation/nav_menu_item.dart';
export '../../services/nav_menu_builder.dart';
