/// Atomic Components - Exports
///
/// Single-purpose building block widgets
/// Import this file to access all atom widgets
library;

// Configuration - Semantic layout behavior wrappers
export 'configuration/alignment_config.dart';
export 'configuration/axis_config.dart';
export 'configuration/flex_config.dart';
export 'configuration/scroll_physics_config.dart';
export 'configuration/stack_fit_config.dart';

// Branding
export 'branding/app_footer.dart';
export 'branding/app_logo.dart';
export 'branding/app_title.dart';

// Buttons
export 'buttons/action_button.dart';

// Containers
export 'containers/scrollable_container.dart';

// Display
export 'display/boolean_field_display.dart';
export 'display/date_field_display.dart';
export 'display/number_field_display.dart';
export 'display/select_field_display.dart';
export 'display/text_field_display.dart';

// Indicators
export 'indicators/boolean_badge.dart';
export 'indicators/connection_status_badge.dart';

// Inputs
export 'inputs/boolean_toggle.dart';
export 'inputs/date_input.dart';
export 'inputs/number_input.dart';
// REMOVED: export 'inputs/role_selector.dart'; - Not an atom (had business logic)
// Use SelectInput<String> with role options passed as data from route
export 'inputs/select_input.dart';
export 'inputs/text_area_input.dart';
export 'inputs/text_input.dart';
export 'indicators/loading_indicator.dart';
export 'indicators/status_badge.dart';

// Layout
export 'layout/action_row.dart';
export 'layout/section_divider.dart';

// Notifications
export 'notifications/error_snackbar.dart';
export 'notifications/info_snackbar.dart';
export 'notifications/success_snackbar.dart';

// Typography
export 'typography/column_header.dart';
export 'typography/data_label.dart';
export 'typography/data_value.dart';

// User Info
export 'user_info/user_info_header.dart';
