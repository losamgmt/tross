// Admin Screen - Unified Generic Data Table with Metadata-Driven CRUD
// Single table displays ANY entity based on dropdown selection
// Uses FilterableDataTable organism for search functionality
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

  // Search query for client-side filtering
  String _searchQuery = '';

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

  /// Filter data based on search query using entity's searchable fields
  List<Map<String, dynamic>> _filterData(List<Map<String, dynamic>> data) {
    if (_searchQuery.isEmpty) return data;

    final metadata = EntityMetadataRegistry.tryGet(_selectedEntity);
    if (metadata == null) return data;

    final query = _searchQuery.toLowerCase();
    final searchableFields = metadata.searchableFields;

    return data.where((item) {
      for (final field in searchableFields) {
        final value = item[field];
        if (value != null && value.toString().toLowerCase().contains(query)) {
          return true;
        }
      }
      return false;
    }).toList();
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
      body: Padding(
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
            // Apply client-side filtering
            final filteredData = _filterData(data);

            return DashboardCard(
              child: organisms.FilterableDataTable<Map<String, dynamic>>(
                // Filter bar props
                searchValue: _searchQuery,
                onSearchChanged: (value) {
                  setState(() => _searchQuery = value);
                },
                searchPlaceholder:
                    'Search ${_getEntityDisplayName(_selectedEntity).toLowerCase()}...',
                // Entity selector AS the table title
                titleWidget: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 250),
                  child: SelectInput<String>(
                    value: _selectedEntity,
                    items: entities,
                    displayText: _getEntityDisplayName,
                    onChanged: (entity) {
                      if (entity != null && entity != _selectedEntity) {
                        setState(() {
                          _selectedEntity = entity;
                          _searchQuery = ''; // Reset search on entity change
                        });
                      }
                    },
                  ),
                ),
                columns: MetadataTableColumnFactory.forEntity(
                  _selectedEntity,
                  onEntityUpdated: _refreshTable,
                ),
                data: filteredData,
                state: filteredData.isEmpty
                    ? organisms.AppDataTableState.empty
                    : organisms.AppDataTableState.loaded,
                emptyMessage: _searchQuery.isEmpty
                    ? 'No ${metadata?.displayNamePlural ?? _selectedEntity} found'
                    : 'No results for "$_searchQuery"',
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
