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
library;

// Theme & Styling
export 'app_colors.dart';
export 'app_typography.dart';
export 'app_borders.dart';
export 'app_shadows.dart';
export 'app_animations.dart';
export 'app_theme.dart';

// Layout & Sizing
export 'app_spacing.dart';
export 'app_sizes.dart';
export 'responsive_breakpoints.dart';

// Constants
export 'constants.dart';
export 'api_endpoints.dart';
export 'permissions.dart';

// Configuration
export 'environment.dart';
export 'app_config.dart';
export 'role_config.dart';
export 'table_column.dart';
export 'table_config.dart';

// Table Column Definitions
export 'table_columns/user_columns.dart';
export 'table_columns/role_columns.dart';
