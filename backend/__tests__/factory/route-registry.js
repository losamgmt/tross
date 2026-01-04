/**
 * Route Registry - Metadata for all routes
 *
 * PRINCIPLE: Routes are described by their behaviors, tested generically.
 * Tests derive from this metadata - no hardcoding per-route.
 *
 * Endpoint behaviors:
 * - list: Returns array, may support pagination
 * - getOne: Returns single item or 404
 * - create: Creates resource, returns 201
 * - update: Updates resource, returns 200
 * - delete: Deletes resource, returns 204 or 200
 * - action: Performs action, returns success/failure
 *
 * Auth levels:
 * - public: No auth required
 * - authenticated: Any logged-in user
 * - owner: User owns the resource
 * - admin: Admin role required
 */

module.exports = {
  admin: {
    basePath: '/api/admin',
    auth: { required: true, minRole: 'admin' },
    endpoints: [
      // System Settings
      { method: 'GET', path: '/system/settings', behavior: 'list', description: 'Get all system settings' },
      { method: 'GET', path: '/system/settings/:key', behavior: 'getOne', paramTypes: { key: 'string' }, description: 'Get specific setting' },
      { method: 'PUT', path: '/system/settings/:key', behavior: 'update', paramTypes: { key: 'string' }, body: { value: 'any' }, description: 'Update setting' },

      // Maintenance
      { method: 'GET', path: '/system/maintenance', behavior: 'getOne', description: 'Get maintenance mode status' },
      { method: 'PUT', path: '/system/maintenance', behavior: 'update', body: { enabled: 'boolean' }, description: 'Set maintenance mode' },

      // Sessions
      { method: 'GET', path: '/system/sessions', behavior: 'list', pagination: true, description: 'Get active sessions' },
      { method: 'POST', path: '/system/sessions/:userId/force-logout', behavior: 'action', paramTypes: { userId: 'id' }, description: 'Force logout user' },
      { method: 'POST', path: '/system/sessions/:userId/reactivate', behavior: 'action', paramTypes: { userId: 'id' }, description: 'Reactivate user' },

      // Logs
      { method: 'GET', path: '/system/logs/data', behavior: 'list', pagination: true, description: 'Get data operation logs' },
      { method: 'GET', path: '/system/logs/auth', behavior: 'list', pagination: true, description: 'Get auth logs' },
      { method: 'GET', path: '/system/logs/summary', behavior: 'getOne', description: 'Get log summary' },

      // Config viewers
      { method: 'GET', path: '/system/config/permissions', behavior: 'getOne', description: 'Get permissions config' },
      { method: 'GET', path: '/system/config/validation', behavior: 'getOne', description: 'Get validation config' },
    ],
  },

  audit: {
    basePath: '/api/audit',
    auth: { required: true, minRole: 'viewer' },
    endpoints: [
      // /all requires admin (audit_logs read permission)
      { method: 'GET', path: '/all', behavior: 'list', pagination: true, minRole: 'admin', description: 'Get all audit logs' },
      // /user/:userId requires 'users' read - managers have this, plus self-access for own data
      { method: 'GET', path: '/user/:userId', behavior: 'list', paramTypes: { userId: 'id' }, pagination: true, description: 'Get user audit trail' },
      // /:resourceType/:resourceId has dynamic permission check based on resourceType (no fixed role)
      { method: 'GET', path: '/:resourceType/:resourceId', behavior: 'list', paramTypes: { resourceType: 'string', resourceId: 'id' }, description: 'Get resource audit trail' },
    ],
  },

  export: {
    basePath: '/api/export',
    auth: { required: true, minRole: 'viewer' },
    endpoints: [
      { method: 'GET', path: '/:entity', behavior: 'download', paramTypes: { entity: 'string' }, description: 'Export entity as CSV' },
      { method: 'GET', path: '/:entity/fields', behavior: 'getOne', paramTypes: { entity: 'string' }, description: 'Get exportable fields' },
    ],
  },

  files: {
    basePath: '/api/files',
    auth: { required: true, minRole: 'viewer' },
    endpoints: [
      { method: 'POST', path: '/:entityType/:entityId', behavior: 'create', paramTypes: { entityType: 'string', entityId: 'id' }, description: 'Upload file to entity' },
      { method: 'GET', path: '/:id/download', behavior: 'download', paramTypes: { id: 'id' }, description: 'Download file' },
      { method: 'DELETE', path: '/:id', behavior: 'delete', paramTypes: { id: 'id' }, description: 'Delete file' },
    ],
  },

  preferences: {
    basePath: '/api/preferences',
    auth: { required: true, minRole: 'viewer' },
    endpoints: [
      { method: 'GET', path: '/', behavior: 'getOne', description: 'Get user preferences' },
      { method: 'PUT', path: '/', behavior: 'update', body: { preferences: 'object' }, description: 'Update preferences' },
      { method: 'PUT', path: '/:key', behavior: 'update', paramTypes: { key: 'string' }, description: 'Update specific preference' },
      { method: 'POST', path: '/reset', behavior: 'action', description: 'Reset preferences to defaults' },
      { method: 'GET', path: '/schema', behavior: 'getOne', public: true, description: 'Get preference schema (public)' },
    ],
  },

  stats: {
    basePath: '/api/stats',
    auth: { required: true, minRole: 'viewer' },
    endpoints: [
      { method: 'GET', path: '/:entity', behavior: 'getOne', paramTypes: { entity: 'string' }, description: 'Count entity records' },
      { method: 'GET', path: '/:entity/grouped/:field', behavior: 'getOne', paramTypes: { entity: 'string', field: 'string' }, description: 'Count grouped by field' },
      { method: 'GET', path: '/:entity/sum/:field', behavior: 'getOne', paramTypes: { entity: 'string', field: 'string' }, description: 'Sum numeric field' },
    ],
  },

  entities: {
    basePath: '/api',
    auth: { required: true, minRole: 'viewer' },
    // Dynamic entity routes - tested via entity runner, not route runner
    isDynamic: true,
    endpoints: [
      { method: 'GET', path: '/:entity', behavior: 'list', pagination: true, description: 'List entities' },
      { method: 'GET', path: '/:entity/:id', behavior: 'getOne', paramTypes: { id: 'id' }, description: 'Get entity by ID' },
      { method: 'POST', path: '/:entity', behavior: 'create', minRole: 'user', description: 'Create entity' },
      { method: 'PATCH', path: '/:entity/:id', behavior: 'update', paramTypes: { id: 'id' }, minRole: 'user', description: 'Update entity' },
      { method: 'DELETE', path: '/:entity/:id', behavior: 'delete', paramTypes: { id: 'id' }, minRole: 'user', description: 'Delete entity' },
    ],
  },

  'roles-extensions': {
    basePath: '/api/roles',
    auth: { required: true },
    endpoints: [
      // Only non-CRUD extension endpoint - main CRUD is via generic entity router
      { method: 'GET', path: '/:id/users', behavior: 'list', paramTypes: { id: 'id' }, pagination: true, description: 'Get users with role' },
    ],
  },
};
