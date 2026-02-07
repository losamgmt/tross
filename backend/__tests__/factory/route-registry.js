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
  health: {
    basePath: "/api/health",
    auth: { required: false }, // Public endpoints (liveness/readiness probes)
    endpoints: [
      {
        method: "GET",
        path: "/",
        behavior: "getOne",
        auth: "public",
        description: "Liveness probe - basic health check",
      },
      {
        method: "GET",
        path: "/ready",
        behavior: "getOne",
        auth: "public",
        description: "Readiness probe - checks DB and Auth0",
      },
      {
        method: "GET",
        path: "/databases",
        behavior: "getOne",
        auth: "admin",
        minRole: "admin",
        description: "Detailed database health (admin only)",
      },
    ],
  },

  admin: {
    basePath: "/api/admin",
    auth: { required: true, minRole: "admin" },
    endpoints: [
      // System Settings
      {
        method: "GET",
        path: "/system/settings",
        behavior: "list",
        description: "Get all system settings",
      },
      {
        method: "GET",
        path: "/system/settings/:key",
        behavior: "getOne",
        paramTypes: { key: "string" },
        description: "Get specific setting",
      },
      {
        method: "PUT",
        path: "/system/settings/:key",
        behavior: "update",
        paramTypes: { key: "string" },
        body: { value: "any" },
        description: "Update setting",
      },

      // Maintenance
      {
        method: "GET",
        path: "/system/maintenance",
        behavior: "getOne",
        description: "Get maintenance mode status",
      },
      {
        method: "PUT",
        path: "/system/maintenance",
        behavior: "update",
        body: { enabled: "boolean" },
        description: "Set maintenance mode",
      },

      // Sessions
      {
        method: "GET",
        path: "/system/sessions",
        behavior: "list",
        pagination: true,
        description: "Get active sessions",
      },
      {
        method: "POST",
        path: "/system/sessions/:userId/force-logout",
        behavior: "action",
        paramTypes: { userId: "id" },
        description: "Force logout user",
      },
      {
        method: "POST",
        path: "/system/sessions/:userId/reactivate",
        behavior: "action",
        paramTypes: { userId: "id" },
        description: "Reactivate user",
      },

      // Logs
      {
        method: "GET",
        path: "/system/logs/data",
        behavior: "list",
        pagination: true,
        description: "Get data operation logs",
      },
      {
        method: "GET",
        path: "/system/logs/auth",
        behavior: "list",
        pagination: true,
        description: "Get auth logs",
      },
      {
        method: "GET",
        path: "/system/logs/summary",
        behavior: "getOne",
        description: "Get log summary",
      },

      // Config viewers
      {
        method: "GET",
        path: "/system/config/permissions",
        behavior: "getOne",
        description: "Get permissions config",
      },
      {
        method: "GET",
        path: "/system/config/validation",
        behavior: "getOne",
        description: "Get validation config",
      },
    ],
  },

  audit: {
    basePath: "/api/audit",
    auth: { required: true, minRole: "viewer" },
    endpoints: [
      // /all requires admin (audit_logs read permission)
      {
        method: "GET",
        path: "/all",
        behavior: "list",
        pagination: true,
        minRole: "admin",
        description: "Get all audit logs",
      },
      // /user/:userId requires 'users' read - managers have this, plus self-access for own data
      {
        method: "GET",
        path: "/user/:userId",
        behavior: "list",
        paramTypes: { userId: "id" },
        pagination: true,
        description: "Get user audit trail",
      },
      // /:resourceType/:resourceId has dynamic permission check based on resourceType (no fixed role)
      {
        method: "GET",
        path: "/:resourceType/:resourceId",
        behavior: "list",
        paramTypes: { resourceType: "string", resourceId: "id" },
        description: "Get resource audit trail",
      },
    ],
  },

  export: {
    basePath: "/api/export",
    auth: { required: true, minRole: "viewer" },
    endpoints: [
      {
        method: "GET",
        path: "/:entity",
        behavior: "download",
        paramTypes: { entity: "string" },
        description: "Export entity as CSV",
      },
      {
        method: "GET",
        path: "/:entity/fields",
        behavior: "getOne",
        paramTypes: { entity: "string" },
        description: "Get exportable fields",
      },
    ],
  },

  // NOTE: files routes removed - file attachments now use sub-resource pattern
  // /api/:tableName/:id/files (tested in files-api.test.js)

  preferences: {
    basePath: "/api/preferences",
    auth: { required: true, minRole: "viewer" },
    // Uses generic entity router with sharedPrimaryKey pattern
    // Tested via entity runner, not route runner
    isDynamic: true,
    endpoints: [
      {
        method: "GET",
        path: "/",
        behavior: "list",
        pagination: true,
        description: "List preferences",
      },
      {
        method: "GET",
        path: "/:id",
        behavior: "getOne",
        paramTypes: { id: "id" },
        description: "Get preferences by ID (= userId)",
      },
      {
        method: "POST",
        path: "/",
        behavior: "create",
        description: "Create preferences (id = userId required)",
      },
      {
        method: "PATCH",
        path: "/:id",
        behavior: "update",
        paramTypes: { id: "id" },
        description: "Update preferences",
      },
      {
        method: "DELETE",
        path: "/:id",
        behavior: "delete",
        paramTypes: { id: "id" },
        description: "Delete preferences",
      },
    ],
  },

  stats: {
    basePath: "/api/stats",
    auth: { required: true, minRole: "viewer" },
    endpoints: [
      {
        method: "GET",
        path: "/:entity",
        behavior: "getOne",
        paramTypes: { entity: "string" },
        description: "Count entity records",
      },
      {
        method: "GET",
        path: "/:entity/grouped/:field",
        behavior: "getOne",
        paramTypes: { entity: "string", field: "string" },
        description: "Count grouped by field",
      },
      {
        method: "GET",
        path: "/:entity/sum/:field",
        behavior: "getOne",
        paramTypes: { entity: "string", field: "string" },
        description: "Sum numeric field",
      },
    ],
  },

  entities: {
    basePath: "/api",
    auth: { required: true, minRole: "viewer" },
    // Dynamic entity routes - tested via entity runner, not route runner
    isDynamic: true,
    endpoints: [
      {
        method: "GET",
        path: "/:entity",
        behavior: "list",
        pagination: true,
        description: "List entities",
      },
      {
        method: "GET",
        path: "/:entity/:id",
        behavior: "getOne",
        paramTypes: { id: "id" },
        description: "Get entity by ID",
      },
      {
        method: "POST",
        path: "/:entity",
        behavior: "create",
        minRole: "user",
        description: "Create entity",
      },
      {
        method: "PATCH",
        path: "/:entity/:id",
        behavior: "update",
        paramTypes: { id: "id" },
        minRole: "user",
        description: "Update entity",
      },
      {
        method: "DELETE",
        path: "/:entity/:id",
        behavior: "delete",
        paramTypes: { id: "id" },
        minRole: "user",
        description: "Delete entity",
      },
    ],
  },

  "roles-extensions": {
    basePath: "/api/roles",
    auth: { required: true },
    endpoints: [
      // Only non-CRUD extension endpoint - main CRUD is via generic entity router
      {
        method: "GET",
        path: "/:id/users",
        behavior: "list",
        paramTypes: { id: "id" },
        pagination: true,
        description: "Get users with role",
      },
    ],
  },
};
