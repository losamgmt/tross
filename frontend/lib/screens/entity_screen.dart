/// GenericEntityScreen - Single screen for ALL entity lists
///
/// **SOLE RESPONSIBILITY:** Display paginated list of ANY entity based on route param
///
/// This is THE generic entity list screen. ONE screen, ALL entities.
/// Entity name comes from route: /entity/users, /entity/customers, /entity/work_orders
///
/// Uses:
/// - EntityMetadataRegistry for field config
/// - GenericEntityService for CRUD
/// - MetadataTableColumnFactory for columns
/// - GenericTableActionBuilders for actions
/// - PermissionService for RBAC
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
  /// Uses late initialization to ensure key changes when entity changes
  GlobalKey<organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>>
  _tableKey =
      GlobalKey<
        organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>
      >();

  /// Refresh handler for CRUD callbacks
  void _refreshTable() {
    _tableKey.currentState?.refresh();
  }

  @override
  void didUpdateWidget(EntityScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When entity changes, create a new key to force complete rebuild
    if (oldWidget.entityName != widget.entityName) {
      setState(() {
        _tableKey =
            GlobalKey<
              organisms.RefreshableDataProviderState<List<Map<String, dynamic>>>
            >();
      });
    }
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
        currentRoute: '/entity/${widget.entityName}',
        pageTitle: 'Entity Not Found',
        body: Center(child: Text('Unknown entity: ${widget.entityName}')),
      );
    }

    return AdaptiveShell(
      currentRoute: '/entity/${widget.entityName}',
      pageTitle: metadata.displayNamePlural,
      body: ScrollableContent(
        padding: EdgeInsets.all(spacing.lg),
        child: organisms.RefreshableDataProvider<List<Map<String, dynamic>>>(
          key: _tableKey,
          loadData: () async {
            final result = await GenericEntityService.getAll(widget.entityName);
            return result.data;
          },
          errorTitle: 'Failed to Load ${metadata.displayNamePlural}',
          builder: (context, data) {
            return DashboardCard(
              child: organisms.AppDataTable<Map<String, dynamic>>(
                title: metadata.displayNamePlural,
                columns: MetadataTableColumnFactory.forEntity(
                  widget.entityName,
                  onEntityUpdated: _refreshTable,
                ),
                data: data,
                state: data.isEmpty
                    ? organisms.AppDataTableState.empty
                    : organisms.AppDataTableState.loaded,
                emptyMessage: 'No ${metadata.displayNamePlural} found',
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
                  // Navigate to detail screen using go_router
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
