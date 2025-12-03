// Admin Dashboard - Professional Data Tables with CRUD Operations
// Displays users and roles with sortable, rich-formatted tables
// Includes refresh, delete actions with permission checks

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/config.dart'; // For table column definitions
import '../../models/user_model.dart';
import '../../models/role_model.dart';
import '../../services/user_service.dart';
import '../../services/role_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/organisms/organisms.dart' as organisms;
import '../../widgets/molecules/molecules.dart';
import '../../utils/table_action_builders.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  // GlobalKeys to trigger refresh on CRUD operations
  final _userTableKey =
      GlobalKey<organisms.RefreshableDataProviderState<List<User>>>();
  final _roleTableKey =
      GlobalKey<organisms.RefreshableDataProviderState<List<Role>>>();

  // Refresh handlers
  void _refreshUserTable() {
    _userTableKey.currentState?.refresh();
  }

  void _refreshRoleTable() {
    _roleTableKey.currentState?.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    final authProvider = context.watch<AuthProvider>();
    final userRole = authProvider.user?['role'] as String?;
    final currentUserId = authProvider.user?['id']?.toString();

    return PageScaffold(
      appBar: const organisms.AppHeader(pageTitle: 'Admin Dashboard'),
      body: ScrollableContent(
        padding: EdgeInsets.all(spacing.lg),
        child: VerticalStack(
          children: [
            // Users Table (centered at natural content width)
            Center(
              child: IntrinsicWidth(
                child: organisms.RefreshableDataProvider<List<User>>(
                  key: _userTableKey,
                  loadData: () => UserService.getAll(),
                  errorTitle: AppConstants.failedToLoadUsers,
                  builder: (context, users) {
                    return DashboardCard(
                      child: organisms.AppDataTable<User>(
                        title: 'Users',
                        columns: getUserColumns(
                          onUserUpdated: _refreshUserTable,
                        ),
                        data: users,
                        state: users.isEmpty
                            ? organisms.AppDataTableState.empty
                            : organisms.AppDataTableState.loaded,
                        emptyMessage: 'No users found',
                        toolbarActions:
                            TableActionBuilders.buildUserToolbarActions(
                              context,
                              userRole,
                              _refreshUserTable,
                            ),
                        actionsBuilder: (user) =>
                            TableActionBuilders.buildUserRowActions(
                              context,
                              user,
                              userRole,
                              currentUserId,
                              _refreshUserTable,
                            ),
                      ),
                    );
                  },
                ),
              ),
            ),

            SpacedBox.vertical(height: spacing.lg),

            // Roles Table (centered at natural content width)
            Center(
              child: IntrinsicWidth(
                child: organisms.RefreshableDataProvider<List<Role>>(
                  key: _roleTableKey,
                  loadData: () => RoleService.getAll(),
                  errorTitle: 'Failed to Load Roles',
                  builder: (context, roles) {
                    return DashboardCard(
                      child: organisms.AppDataTable<Role>(
                        title: 'Roles',
                        columns: getRoleColumns(
                          onRoleUpdated: _refreshRoleTable,
                        ),
                        data: roles,
                        state: roles.isEmpty
                            ? organisms.AppDataTableState.empty
                            : organisms.AppDataTableState.loaded,
                        emptyMessage: 'No roles found',
                        toolbarActions:
                            TableActionBuilders.buildRoleToolbarActions(
                              context,
                              userRole,
                              _refreshRoleTable,
                            ),
                        actionsBuilder: (role) =>
                            TableActionBuilders.buildRoleRowActions(
                              context,
                              role,
                              userRole,
                              onRoleRefresh: _refreshRoleTable,
                              onUserRefresh: _refreshUserTable,
                            ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
