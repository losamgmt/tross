/// Molecular Components - Exports
///
/// Composite components built from atoms
/// Import this file to access all molecule widgets
library;

// Containers - Single-atom wrappers (Phase A)
export 'containers/flexible_space.dart';
export 'containers/padded_container.dart';
export 'containers/page_scaffold.dart';
export 'containers/scrollable_content.dart';
export 'containers/spaced_box.dart';

// Data
export 'data_cell.dart';

// Dialogs
export 'dialogs/confirmation_dialog.dart';

// Indicators
export 'dev_mode_indicator.dart';

// Layout - Single-atom wrappers (Phase A)
export 'layout/horizontal_stack.dart';
export 'layout/layer_stack.dart';
export 'layout/vertical_stack.dart';

// Other
export 'empty_state.dart';
export 'login_header.dart';
export 'table_toolbar.dart';

// Generic molecules (100% reusable)
export 'buttons/button_group.dart';
export 'display/conditional_display.dart';
export 'menus/dropdown_menu.dart';
export 'pagination/pagination_display.dart';

// Cards
export 'cards/production_login_card.dart';
export 'dashboard_card.dart';
export 'database_card.dart';
export 'error_card.dart';
export 'health_status_box.dart';

// Forms - Configuration only (form organisms moved to organisms/)
export 'forms/field_config.dart';

// Details
export 'details/details.dart';
export 'details/detail_field.dart';
export 'details/detail_panel.dart';

// Error handling
export 'error_message.dart';

// DELETED - replaced by generic molecules:
// - error_action_buttons.dart → use buttons/button_group.dart
// - guards/permission_guard.dart → use display/conditional_display.dart
// - user_menu.dart → use menus/dropdown_menu.dart
// - pagination_controls.dart → use pagination/pagination_display.dart
