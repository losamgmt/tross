/// Molecular Components - Exports
///
/// Composite components built from atoms
/// Import this file to access all molecule widgets
library;

// Containers
export 'containers/page_scaffold.dart';
export 'containers/scrollable_content.dart';

// Data
export 'data_cell.dart';

// Dialogs
export 'dialogs/confirmation_dialog.dart';

// Indicators
export 'dev_mode_indicator.dart';

// Layout
export 'layout/refreshable_section.dart';

// Other
export 'empty_state.dart';
export 'login_header.dart';
export 'user_avatar.dart';
export 'user_info_header.dart';

// Generic molecules (100% reusable)
export 'buttons/button_group.dart';
export 'display/conditional_display.dart';
export 'menus/dropdown_menu.dart';
export 'pagination/pagination_display.dart';

// Cards
export 'cards/dashboard_card.dart';
export 'cards/error_card.dart';
export 'cards/stat_card.dart';
export 'cards/titled_card.dart';

// Forms - Configuration and setting rows
export 'forms/field_config.dart';
export 'forms/setting_dropdown_row.dart';
export 'forms/setting_number_row.dart';
export 'forms/setting_radio_group.dart';
export 'forms/setting_text_row.dart';
export 'forms/setting_toggle_row.dart';

// Feedback
export 'feedback/info_banner.dart';

// Details
export 'details/details.dart';
export 'details/detail_field.dart';
export 'details/detail_panel.dart';

// Error handling
export 'error_message.dart';

// - error_action_buttons.dart → use buttons/button_group.dart
// - guards/permission_guard.dart → use display/conditional_display.dart
// - user_menu.dart → use menus/dropdown_menu.dart
// - pagination_controls.dart → use pagination/pagination_display.dart
