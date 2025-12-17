/// Configuration Barrel Export
///
/// Single import point for all configuration files.
/// Simplifies imports: `import 'package:frontend/config/config.dart';`
///
/// Organization:
/// - Theme & Styling: colors, typography, borders, shadows, animations
/// - Layout & Sizing: spacing, sizes, responsive breakpoints
/// - Constants: text content, API endpoints, permissions
/// - Configuration: environment, app config, table config
/// - User Preferences: preference keys, defaults, schema
library;

// Theme & Styling
export 'app_colors.dart';
export 'app_typography.dart';
export 'app_borders.dart';
export 'app_shadows.dart';
export 'app_animations.dart';
export 'app_theme.dart';
export 'app_theme_flex.dart'; // FlexColorScheme integration

// Layout & Sizing
export 'app_spacing.dart';
export 'app_sizes.dart';
export 'responsive_breakpoints.dart';

// Constants
export 'constants.dart';
export 'api_endpoints.dart';
// NOTE: Permissions are now handled by services/permission_service_dynamic.dart
// with enum types from models/permission.dart (not this static config file)

// Configuration
export 'environment.dart';
export 'app_config.dart';
export 'table_column.dart';
export 'table_config.dart';

// User Preferences
export 'preference_keys.dart';
