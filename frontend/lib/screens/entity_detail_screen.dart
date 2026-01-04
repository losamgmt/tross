/// GenericEntityDetailScreen - Single record view for ANY entity
///
/// **SOLE RESPONSIBILITY:** Display/edit a single entity based on route params
///
/// Route: /:entityName/:id
/// Example: /customers/42, /work_orders/100
///
/// Uses:
/// - EntityMetadataRegistry for field config
/// - GenericEntityService for CRUD
/// - EntityDetailCard organism for display
/// - GenericForm organism for editing
/// - PermissionService for RBAC
///
/// ZERO per-entity code. Purely metadata-driven.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/config.dart';
import '../core/routing/app_routes.dart';
import '../providers/auth_provider.dart';
import '../models/permission.dart';
import '../services/generic_entity_service.dart';
import '../services/entity_metadata.dart';
import '../services/metadata_field_config_factory.dart';
import '../services/permission_service_dynamic.dart';
import '../services/error_service.dart';
import '../widgets/templates/templates.dart';
import '../widgets/organisms/organisms.dart';
import '../widgets/molecules/molecules.dart';
import '../widgets/atoms/atoms.dart';
import '../utils/crud_handlers.dart';
import '../utils/entity_icon_resolver.dart';

class EntityDetailScreen extends StatefulWidget {
  /// Entity name from route param (e.g., 'customer', 'work_order')
  final String entityName;

  /// Entity ID from route param
  final int entityId;

  const EntityDetailScreen({
    super.key,
    required this.entityName,
    required this.entityId,
  });

  @override
  State<EntityDetailScreen> createState() => _EntityDetailScreenState();
}

class _EntityDetailScreenState extends State<EntityDetailScreen> {
  Map<String, dynamic>? _entity;
  bool _isLoading = true;
  bool _isEditing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEntity();
  }

  Future<void> _loadEntity() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final entityService = context.read<GenericEntityService>();
      final entity = await entityService.getById(
        widget.entityName,
        widget.entityId,
      );
      setState(() {
        _entity = entity;
        _isLoading = false;
      });
    } catch (e) {
      ErrorService.logError(
        'Failed to load ${widget.entityName} #${widget.entityId}',
        error: e,
      );
      setState(() {
        _error = 'Failed to load ${widget.entityName}';
        _isLoading = false;
      });
    }
  }

  void _toggleEdit() {
    setState(() => _isEditing = !_isEditing);
  }

  Future<void> _handleDelete(EntityMetadata metadata) async {
    final identityField = metadata.identityField;
    final entityDisplayName =
        _entity?[identityField]?.toString() ?? '#${widget.entityId}';

    await CrudHandlers.handleDelete(
      context: context,
      entityType: metadata.displayName.toLowerCase(),
      entityName: entityDisplayName,
      deleteOperation: () async {
        final entityService = context.read<GenericEntityService>();
        await entityService.delete(widget.entityName, widget.entityId);
        return true;
      },
      onSuccess: () {
        // Navigate back to entity list
        if (mounted) {
          context.go(AppRoutes.entityList(widget.entityName));
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final authProvider = context.watch<AuthProvider>();
    final userRole = authProvider.user?['role'] as String?;

    // Get metadata
    final metadata = EntityMetadataRegistry.tryGet(widget.entityName);
    if (metadata == null) {
      return AdaptiveShell(
        currentRoute: '/${widget.entityName}/${widget.entityId}',
        pageTitle: 'Entity Not Found',
        body: Center(child: Text('Unknown entity: ${widget.entityName}')),
      );
    }

    // Permission checks
    final canUpdate = PermissionService.hasPermission(
      userRole,
      metadata.rlsResource,
      CrudOperation.update,
    );
    final canDelete = PermissionService.hasPermission(
      userRole,
      metadata.rlsResource,
      CrudOperation.delete,
    );

    // Get identity for display
    final identityValue =
        _entity?[metadata.identityField]?.toString() ?? '#${widget.entityId}';
    final pageTitle = _isEditing
        ? 'Edit ${metadata.displayName}'
        : identityValue;

    return AdaptiveShell(
      currentRoute: '/${widget.entityName}/${widget.entityId}',
      pageTitle: pageTitle,
      body: _buildBody(
        context,
        metadata: metadata,
        spacing: spacing,
        canUpdate: canUpdate,
        canDelete: canDelete,
      ),
    );
  }

  Widget _buildBody(
    BuildContext context, {
    required EntityMetadata metadata,
    required AppSpacing spacing,
    required bool canUpdate,
    required bool canDelete,
  }) {
    // Loading state
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error state
    if (_error != null || _entity == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            SizedBox(height: spacing.md),
            Text(
              _error ?? 'Entity not found',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: spacing.lg),
            AppButton(
              icon: Icons.arrow_back,
              tooltip: 'Return to list',
              label: 'Go Back',
              onPressed: () =>
                  context.go(AppRoutes.entityList(widget.entityName)),
            ),
          ],
        ),
      );
    }

    // Edit mode
    if (_isEditing) {
      return _buildEditView(context, metadata: metadata, spacing: spacing);
    }

    // View mode
    return _buildDetailView(
      context,
      metadata: metadata,
      spacing: spacing,
      canUpdate: canUpdate,
      canDelete: canDelete,
    );
  }

  Widget _buildDetailView(
    BuildContext context, {
    required EntityMetadata metadata,
    required AppSpacing spacing,
    required bool canUpdate,
    required bool canDelete,
  }) {
    return ScrollableContent(
      padding: EdgeInsets.all(spacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Action buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (canUpdate)
                AppButton(
                  icon: Icons.edit,
                  tooltip: 'Edit this ${widget.entityName}',
                  label: 'Edit',
                  onPressed: _toggleEdit,
                ),
              if (canUpdate && canDelete) SizedBox(width: spacing.sm),
              if (canDelete)
                AppButton(
                  icon: Icons.delete,
                  tooltip: 'Delete this ${widget.entityName}',
                  label: 'Delete',
                  style: AppButtonStyle.danger,
                  onPressed: () => _handleDelete(metadata),
                ),
            ],
          ),

          SizedBox(height: spacing.lg),

          // Entity details card - uses metadata-driven EntityDetailCard
          EntityDetailCard(
            entityName: widget.entityName,
            entity: _entity,
            title: metadata.displayName,
            icon: EntityIconResolver.getIcon(widget.entityName),
            // Exclude system fields from detail view
            excludeFields: const ['created_at', 'updated_at'],
          ),
        ],
      ),
    );
  }

  Widget _buildEditView(
    BuildContext context, {
    required EntityMetadata metadata,
    required AppSpacing spacing,
  }) {
    // Get form fields from metadata factory (forEdit marks immutable fields readonly)
    final fieldConfigs = MetadataFieldConfigFactory.forEdit(
      context,
      widget.entityName,
    );

    final formKey = GlobalKey<GenericFormState<Map<String, dynamic>>>();
    var formValue = Map<String, dynamic>.from(_entity!);

    return ScrollableContent(
      padding: EdgeInsets.all(spacing.lg),
      child: DashboardCard(
        child: Padding(
          padding: EdgeInsets.all(spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Form header
              Text(
                'Edit ${metadata.displayName}',
                style: Theme.of(context).textTheme.titleLarge,
              ),

              SizedBox(height: spacing.lg),

              // Form fields
              GenericForm<Map<String, dynamic>>(
                key: formKey,
                value: formValue,
                fields: fieldConfigs,
                onChange: (newValue) {
                  formValue = newValue;
                },
              ),

              SizedBox(height: spacing.xl),

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton(
                    icon: Icons.close,
                    tooltip: 'Cancel editing',
                    label: 'Cancel',
                    style: AppButtonStyle.secondary,
                    onPressed: _toggleEdit,
                  ),
                  SizedBox(width: spacing.sm),
                  AppButton(
                    icon: Icons.save,
                    tooltip: 'Save changes',
                    label: 'Save',
                    onPressed: () async {
                      if (formKey.currentState?.validateAll() ?? false) {
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          final entityService = context
                              .read<GenericEntityService>();
                          await entityService.update(
                            widget.entityName,
                            widget.entityId,
                            formKey.currentState!.currentValue,
                          );
                          if (!mounted) return;
                          await _loadEntity();
                          _toggleEdit();
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(
                                '${metadata.displayName} updated successfully',
                              ),
                            ),
                          );
                        } catch (e) {
                          ErrorService.logError(
                            'Failed to update entity',
                            error: e,
                          );
                          if (!mounted) return;
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text('Failed to update: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
