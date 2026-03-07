/// RelationshipSection - A reusable widget for displaying related entity data
///
/// Renders a section with header and data table for a related entity.
/// Supports both hasMany and M:M relationships.
///
/// Features:
/// - Toolbar with Refresh + Create (role-guarded)
/// - Row actions with Delete (role-guarded)
/// - Row tap opens modal for viewing/editing
/// - Empty state handling
///
/// PURE COMPOSITION: Uses RefreshableDataProvider + AppDataTable + DashboardCard.
/// ZERO SPECIFICITY: Fully metadata-driven.
///
/// Usage:
/// ```dart
/// RelationshipSection(
///   relationship: metadata.relationships.first,
///   parentEntityId: 42,
///   onSuccess: () => refreshParent(),
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/config.dart';
import '../../../models/relationship.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/entity_metadata.dart';
import '../../../services/generic_entity_service.dart';
import '../../../services/metadata_table_column_factory.dart';
import '../../../utils/entity_icon_resolver.dart';
import '../../../utils/generic_table_action_builders.dart';
import '../../../utils/row_click_handlers.dart';
import '../../molecules/molecules.dart';
import '../providers/refreshable_data_provider.dart';
import '../tables/data_table.dart';

/// A section displaying related entities for a given relationship.
///
/// Used in entity detail screens to show hasMany and M:M related data.
class RelationshipSection extends StatelessWidget {
  /// The relationship to display
  final Relationship relationship;

  /// The parent entity ID to filter by
  final int parentEntityId;

  /// Optional callback when CRUD operations succeed (for parent refresh)
  final VoidCallback? onSuccess;

  const RelationshipSection({
    super.key,
    required this.relationship,
    required this.parentEntityId,
    this.onSuccess,
  });

  /// Convert junction table name to entity name.
  /// Example: 'customer_units' → 'customer_unit'
  String _junctionTableToEntity(String tableName) {
    // Remove trailing 's' to get singular entity name
    if (tableName.endsWith('s')) {
      return tableName.substring(0, tableName.length - 1);
    }
    return tableName;
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;

    // For M:M, query the junction table; for hasMany, query the target table
    final queryEntity = relationship.isManyToMany
        ? _junctionTableToEntity(relationship.through!)
        : relationship.targetEntity;
    final queryMetadata = EntityMetadataRegistry.tryGet(queryEntity);

    if (queryMetadata == null) {
      return Text('Unknown entity: $queryEntity');
    }

    // Build filter for this relationship
    // Both hasMany and M:M use foreignKey as the filter field
    final filterField = relationship.foreignKey;
    final filterValue = parentEntityId;

    // Pre-fill data for creating new related records
    final prefillData = {filterField: filterValue};

    // GlobalKey to enable refresh from toolbar action
    final refreshKey =
        GlobalKey<RefreshableDataProviderState<List<Map<String, dynamic>>>>();

    return RefreshableDataProvider<List<Map<String, dynamic>>>(
      key: refreshKey,
      loadData: () async {
        final entityService = context.read<GenericEntityService>();
        // Load related records filtered by the FK
        final result = await entityService.getAll(
          queryEntity,
          filters: {filterField: filterValue.toString()},
        );
        return result.data;
      },
      errorTitle: 'Failed to load ${queryMetadata.displayNamePlural}',
      builder: (context, data) {
        // Get user role for permission checks
        final userRole = context.watch<AuthProvider>().userRole;

        // Determine row click behavior (default to modal for related lists)
        final behavior =
            relationship.rowClickBehavior ?? RowClickBehavior.modal;

        // Combined refresh callback (refreshes section + notifies parent)
        void handleRefresh() {
          refreshKey.currentState?.refresh();
          onSuccess?.call();
        }

        // Toolbar actions: Refresh + Create (role-guarded)
        final toolbarActions =
            GenericTableActionBuilders.buildRelatedListToolbarActions(
              context,
              entityName: queryEntity,
              userRole: userRole,
              onRefresh: handleRefresh,
              prefillData: prefillData,
            );

        return DashboardCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Section header with title and actions
              Padding(
                padding: EdgeInsets.all(spacing.md),
                child: Row(
                  children: [
                    Icon(
                      EntityIconResolver.fromString(queryMetadata.icon) ??
                          Icons.link,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    SizedBox(width: spacing.sm),
                    Text(
                      queryMetadata.displayNamePlural,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    SizedBox(width: spacing.sm),
                    Text(
                      '(${data.length})',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const Spacer(),
                    // Toolbar action buttons
                    ...toolbarActions.map(
                      (action) => Padding(
                        padding: EdgeInsets.only(left: spacing.xs),
                        child: IconButton(
                          icon: Icon(action.icon, size: 20),
                          tooltip: action.tooltip ?? action.label,
                          onPressed: action.isDisabled
                              ? null
                              : () {
                                  if (action.onTapAsync != null) {
                                    action.onTapAsync!(context);
                                  } else {
                                    action.onTap?.call();
                                  }
                                },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Data table with delete row action, or empty state
              if (data.isEmpty)
                Padding(
                  padding: EdgeInsets.all(spacing.md),
                  child: Text(
                    'No ${queryMetadata.displayNamePlural.toLowerCase()} found',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                )
              else
                AppDataTable<Map<String, dynamic>>(
                  columns: MetadataTableColumnFactory.forEntity(
                    context,
                    queryEntity,
                  ),
                  data: data,
                  initialDensity: TableDensity.compact,
                  showCustomizationMenu: false,
                  paginated: false,
                  onRowTap: buildRowTapHandler(
                    context: context,
                    entityName: queryEntity,
                    behavior: behavior,
                    onSuccess: handleRefresh,
                  ),
                  // Row actions: Delete only (edit via row click modal)
                  rowActionItems: (entity) =>
                      GenericTableActionBuilders.buildRelatedListRowActions(
                        context,
                        entityName: queryEntity,
                        entity: entity,
                        userRole: userRole,
                        onRefresh: handleRefresh,
                      ),
                  maxRowActions:
                      GenericTableActionBuilders.maxRelatedListRowActionCount,
                ),
            ],
          ),
        );
      },
    );
  }
}
