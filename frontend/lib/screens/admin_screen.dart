// Admin Screen - Unified Generic Data Table with Metadata-Driven CRUD
// Single table displays ANY entity based on dropdown selection
// Uses generic services - NO per-entity code

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/config.dart'; // For spacing extension
import '../core/routing/app_routes.dart';
import '../services/generic_entity_service.dart';
import '../services/metadata_table_column_factory.dart';
import '../services/entity_metadata.dart';
import '../providers/auth_provider.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart' as organisms;
import '../widgets/molecules/molecules.dart';
import '../widgets/atoms/atoms.dart';
import '../utils/generic_table_action_builders.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  // Currently selected entity - defaults to first entity dynamically
  late String _selectedEntity;

  // GlobalKey to trigger refresh on CRUD operations
  final _tableKey =
      GlobalKey<
        organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>
      >();

  @override
  void initState() {
    super.initState();
    // Default to first entity from metadata (dynamic, not hardcoded)
    final entities = EntityMetadataRegistry.entityNames;
    _selectedEntity = entities.isNotEmpty ? entities.first : 'user';
  }

  // Refresh handler
  void _refreshTable() {
    _tableKey.currentState?.refresh();
  }

  // Get display name for an entity
  String _getEntityDisplayName(String entityName) {
    final metadata = EntityMetadataRegistry.tryGet(entityName);
    return metadata?.displayNamePlural ?? _formatEntityName(entityName);
  }

  // Format entity name as fallback (snake_case to Title Case)
  String _formatEntityName(String name) {
    return name
        .split('_')
        .map(
          (word) => word.isEmpty
              ? word
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final authProvider = context.watch<AuthProvider>();
    final userRole = authProvider.user?['role'] as String?;
    final currentUserId = authProvider.user?['id']?.toString();
    final entities = EntityMetadataRegistry.entityNames;
    final metadata = EntityMetadataRegistry.tryGet(_selectedEntity);

    return AdaptiveShell(
      currentRoute: AppRoutes.admin,
      pageTitle: 'Admin',
      body: ScrollableContent(
        padding: EdgeInsets.all(spacing.lg),
        child: organisms.RefreshableDataProvider<List<Map<String, dynamic>>>(
          // Key changes when entity changes, forcing rebuild
          key: ValueKey('table_$_selectedEntity'),
          loadData: () async {
            final result = await GenericEntityService.getAll(_selectedEntity);
            return result.data;
          },
          errorTitle:
              'Failed to Load ${_getEntityDisplayName(_selectedEntity)}',
          builder: (context, data) {
            return DashboardCard(
              child: organisms.AppDataTable<Map<String, dynamic>>(
                // Entity selector AS the table title
                titleWidget: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 250),
                  child: SelectInput<String>(
                    value: _selectedEntity,
                    items: entities,
                    displayText: _getEntityDisplayName,
                    onChanged: (entity) {
                      if (entity != null && entity != _selectedEntity) {
                        setState(() => _selectedEntity = entity);
                      }
                    },
                  ),
                ),
                columns: MetadataTableColumnFactory.forEntity(
                  _selectedEntity,
                  onEntityUpdated: _refreshTable,
                ),
                data: data,
                state: data.isEmpty
                    ? organisms.AppDataTableState.empty
                    : organisms.AppDataTableState.loaded,
                emptyMessage:
                    'No ${metadata?.displayNamePlural ?? _selectedEntity} found',
                toolbarActions: GenericTableActionBuilders.buildToolbarActions(
                  context,
                  entityName: _selectedEntity,
                  userRole: userRole,
                  onRefresh: _refreshTable,
                ),
                actionsBuilder: (entity) =>
                    GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: _selectedEntity,
                      entity: entity,
                      userRole: userRole,
                      currentUserId: currentUserId,
                      onRefresh: _refreshTable,
                    ),
              ),
            );
          },
        ),
      ),
    );
  }
}
