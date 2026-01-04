/// EntityDetailCard - Generic metadata-driven entity display organism
///
/// SOLE RESPONSIBILITY: Display any entity using metadata-driven DetailPanel
///
/// CONTEXT-AGNOSTIC: Works anywhere (screens, modals, tabs, nested)
/// METADATA-DRIVEN: Uses MetadataFieldConfigFactory for field rendering
/// PERMISSION-AWARE: Optional edit button gated by permissions
///
/// Features:
/// - Displays any entity type via metadata
/// - Optional header with icon and title
/// - Optional edit action (permission-gated)
/// - Loading and error states
/// - Customizable field inclusion/exclusion
///
/// Usage:
/// ```dart
/// EntityDetailCard(
///   entityName: 'technician',
///   entity: technicianData,
///   title: 'Technician Profile',
///   icon: Icons.engineering,
///   onEdit: () => showEditModal(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/app_spacing.dart';
import '../../../services/metadata_field_config_factory.dart';
import '../../../services/entity_metadata.dart';
import '../../molecules/details/detail_panel.dart';
import '../../molecules/cards/error_card.dart';
import '../../atoms/buttons/app_button.dart';

/// EntityDetailCard - Generic entity display organism
///
/// Displays any entity's data using metadata-driven field rendering.
/// Pure composition - no service calls, just presentation.
class EntityDetailCard extends StatelessWidget {
  /// Name of the entity type (e.g., 'user', 'technician', 'customer')
  final String entityName;

  /// The entity data as a map
  final Map<String, dynamic>? entity;

  /// Optional custom title (defaults to entity's displayName from metadata)
  final String? title;

  /// Optional icon for the header
  final IconData? icon;

  /// Callback when edit is requested (null = no edit button)
  final VoidCallback? onEdit;

  /// Label for the edit button
  final String editLabel;

  /// Fields to include (null = all non-system fields)
  final List<String>? includeFields;

  /// Fields to exclude
  final List<String>? excludeFields;

  /// Whether to show system fields (id, created_at, updated_at)
  final bool showSystemFields;

  /// Custom error message to display
  final String? error;

  /// Whether the card is in loading state
  final bool isLoading;

  /// Empty state message when entity is null
  final String? emptyMessage;

  /// Custom card elevation
  final double? elevation;

  /// Custom card padding
  final EdgeInsetsGeometry? padding;

  /// Custom card margin
  final EdgeInsetsGeometry? margin;

  const EntityDetailCard({
    super.key,
    required this.entityName,
    this.entity,
    this.title,
    this.icon,
    this.onEdit,
    this.editLabel = 'Edit',
    this.includeFields,
    this.excludeFields,
    this.showSystemFields = false,
    this.error,
    this.isLoading = false,
    this.emptyMessage,
    this.elevation,
    this.padding,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final theme = Theme.of(context);

    // Error state
    if (error != null && error!.isNotEmpty) {
      return ErrorCard(
        title: 'Error Loading ${_getDisplayName()}',
        message: error!,
        icon: Icons.error_outline,
        iconColor: AppColors.errorLight,
      );
    }

    // Loading state
    if (isLoading) {
      return Card(
        elevation: elevation ?? 2,
        margin: margin,
        child: Padding(
          padding: padding ?? spacing.paddingXL,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(context, theme, spacing),
              SizedBox(height: spacing.lg),
              const Center(child: CircularProgressIndicator()),
              SizedBox(height: spacing.lg),
            ],
          ),
        ),
      );
    }

    // Empty state
    if (entity == null) {
      return Card(
        elevation: elevation ?? 2,
        margin: margin,
        child: Padding(
          padding: padding ?? spacing.paddingXL,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(context, theme, spacing),
              SizedBox(height: spacing.lg),
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.inbox_outlined,
                      size: spacing.xxxl,
                      color: AppColors.textSecondary,
                    ),
                    SizedBox(height: spacing.md),
                    Text(
                      emptyMessage ?? 'No ${_getDisplayName()} found',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: spacing.lg),
            ],
          ),
        ),
      );
    }

    // Normal state - display entity data
    final fieldConfigs = MetadataFieldConfigFactory.forDisplay(
      context,
      entityName,
      includeFields: includeFields,
      excludeFields: excludeFields,
      includeSystemFields: showSystemFields,
    );

    return Card(
      elevation: elevation ?? 2,
      margin: margin,
      child: Padding(
        padding: padding ?? spacing.paddingXL,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, theme, spacing),
            SizedBox(height: spacing.lg),
            const Divider(),
            SizedBox(height: spacing.lg),
            // Use DetailPanel for metadata-driven field display
            DetailPanel<Map<String, dynamic>>(
              value: entity!,
              fields: fieldConfigs,
              spacing: spacing.md,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    ThemeData theme,
    AppSpacing spacing,
  ) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: spacing.iconSizeXL, color: AppColors.brandPrimary),
          SizedBox(width: spacing.md),
        ],
        Expanded(
          child: Text(
            title ?? _getDisplayName(),
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        if (onEdit != null)
          AppButton(
            label: editLabel,
            icon: Icons.edit,
            tooltip: 'Edit ${title ?? _getDisplayName()}',
            onPressed: onEdit,
            style: AppButtonStyle.secondary,
            compact: true,
          ),
      ],
    );
  }

  /// Get display name from metadata or fall back to entity name
  String _getDisplayName() {
    try {
      final metadata = EntityMetadataRegistry.tryGet(entityName);
      return metadata?.displayName ?? EntityMetadata.toDisplayName(entityName);
    } catch (_) {
      return EntityMetadata.toDisplayName(entityName);
    }
  }
}
