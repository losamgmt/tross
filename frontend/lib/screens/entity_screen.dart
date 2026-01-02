/// GenericEntityScreen - Single screen for ALL entity lists
///
/// **SOLE RESPONSIBILITY:** Display paginated list of ANY entity based on route param
///
/// This is THE generic entity list screen. ONE screen, ALL entities.
/// Entity name comes from route: /customers, /work_orders, /users
/// Routes match backend API structure: /api/customers, /api/work_orders
///
/// Uses:
/// - EntityMetadataRegistry for field config
/// - GenericEntityService for CRUD
/// - MetadataTableColumnFactory for columns
/// - GenericTableActionBuilders for actions
/// - PermissionService for RBAC
/// - FilterableDataTable organism for search/filter UI
///
/// ZERO per-entity code. Purely metadata-driven.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/config.dart';
import '../core/routing/app_routes.dart';
import '../services/generic_entity_service.dart';
import '../services/metadata_table_column_factory.dart';
import '../services/entity_metadata.dart';
import '../providers/auth_provider.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart' as organisms;
import '../widgets/molecules/molecules.dart';
import '../utils/generic_table_action_builders.dart';

class EntityScreen extends StatefulWidget {
  /// Entity name from route param (e.g., 'user', 'customer', 'work_order')
  final String entityName;

  const EntityScreen({super.key, required this.entityName});

  @override
  State<EntityScreen> createState() => _EntityScreenState();
}

class _EntityScreenState extends State<EntityScreen> {
  /// GlobalKey to trigger refresh on CRUD operations
  GlobalKey<organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>>
  _tableKey =
      GlobalKey<
        organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>
      >();

  /// Search query for client-side filtering
  String _searchQuery = '';

  /// Refresh handler for CRUD callbacks
  void _refreshTable() {
    _tableKey.currentState?.refresh();
  }

  @override
  void didUpdateWidget(EntityScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When entity changes, create a new key and reset search
    if (oldWidget.entityName != widget.entityName) {
      setState(() {
        _tableKey =
            GlobalKey<
              organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>
            >();
        _searchQuery = '';
      });
    }
  }

  /// Filter data based on search query
  List<Map<String, dynamic>> _filterData(
    List<Map<String, dynamic>> data,
    EntityMetadata metadata,
  ) {
    if (_searchQuery.isEmpty) return data;

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

    // Get metadata for this entity
    final metadata = EntityMetadataRegistry.tryGet(widget.entityName);
    if (metadata == null) {
      return AdaptiveShell(
        currentRoute: '/${widget.entityName}',
        pageTitle: 'Entity Not Found',
        body: Center(child: Text('Unknown entity: ${widget.entityName}')),
      );
    }

    return AdaptiveShell(
      currentRoute: '/${widget.entityName}',
      pageTitle: metadata.displayNamePlural,
      body: Padding(
        padding: EdgeInsets.all(spacing.lg),
        child: organisms.RefreshableDataProvider<List<Map<String, dynamic>>>(
          key: _tableKey,
          loadData: () async {
            final result = await GenericEntityService.getAll(widget.entityName);
            return result.data;
          },
          errorTitle: 'Failed to Load ${metadata.displayNamePlural}',
          builder: (context, data) {
            // Apply client-side filtering
            final filteredData = _filterData(data, metadata);

            return DashboardCard(
              child: organisms.FilterableDataTable<Map<String, dynamic>>(
                // Filter bar props
                searchValue: _searchQuery,
                onSearchChanged: (value) {
                  setState(() => _searchQuery = value);
                },
                searchPlaceholder:
                    'Search ${metadata.displayNamePlural.toLowerCase()}...',
                // Data table props
                title: metadata.displayNamePlural,
                entityName: widget.entityName,
                columns: MetadataTableColumnFactory.forEntity(
                  widget.entityName,
                  onEntityUpdated: _refreshTable,
                ),
                data: filteredData,
                state: filteredData.isEmpty
                    ? (data.isEmpty
                          ? organisms.AppDataTableState.empty
                          : organisms
                                .AppDataTableState
                                .empty) // No results from filter
                    : organisms.AppDataTableState.loaded,
                emptyMessage: _searchQuery.isEmpty
                    ? 'No ${metadata.displayNamePlural} found'
                    : 'No results for "$_searchQuery"',
                toolbarActions: GenericTableActionBuilders.buildToolbarActions(
                  context,
                  entityName: widget.entityName,
                  userRole: userRole,
                  onRefresh: _refreshTable,
                ),
                actionsBuilder: (entity) =>
                    GenericTableActionBuilders.buildRowActions(
                      context,
                      entityName: widget.entityName,
                      entity: entity,
                      userRole: userRole,
                      currentUserId: currentUserId,
                      onRefresh: _refreshTable,
                    ),
                onRowTap: (entity) {
                  final id = entity['id'];
                  if (id != null) {
                    context.go(
                      AppRoutes.entityDetail(widget.entityName, id as int),
                    );
                  }
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
