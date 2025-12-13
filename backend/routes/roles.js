const express = require('express');
const router = express.Router();
// Role model removed - using GenericEntityService (strangler-fig Phase 4)
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateRoleCreate,
  validateRoleUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const { logger } = require('../config/logger');
const ResponseFormatter = require('../utils/response-formatter');
const roleMetadata = require('../config/models/role-metadata');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { getNextOrdinalValue } = require('../db/helpers/default-value-helper');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(roleMetadata);

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles with search, filters, and sorting
 *     description: |
 *       Returns a paginated list of roles with optional search, filtering, and sorting.
 *       All query parameters are optional and can be combined.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: |
 *           Search across name and description (case-insensitive).
 *           Example: search=admin matches "admin" role, "administrator" role
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (e.g., is_active=true)
 *       - in: query
 *         name: priority[gte]
 *         schema:
 *           type: integer
 *         description: Filter by minimum priority (e.g., priority[gte]=50)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, name, priority, created_at, updated_at]
 *           default: priority
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *           default: DESC
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 appliedFilters:
 *                   type: object
 *                   description: Shows which filters were applied
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('roles', 'read'),
  enforceRLS('roles'),
  validatePagination(),
  validateQuery(roleMetadata), // NEW: Metadata-driven validation
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('role', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      // Apply metadata-driven field-level filtering based on role
      const sanitizedData = filterDataByRole(result.data, roleMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error fetching roles', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  });

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID
 *     description: Returns details of a specific role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('roles', 'read'),
  enforceRLS('roles'),
  validateIdParam(),
  async (req, res) => {
    try {
      const roleId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      const role = await GenericEntityService.findById('role', roleId, rlsContext);

      if (!role) {
        return ResponseFormatter.notFound(res, 'Role not found');
      }

      const sanitizedData = filterDataByRole(role, roleMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error fetching role', {
        error: error.message,
        roleId: req.validated.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  });

/**
 * @openapi
 * /api/roles/{id}/users:
 *   get:
 *     tags: [Roles]
 *     summary: Get users with specific role
 *     description: Returns all users assigned to a specific role with pagination support
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid pagination parameters
 *       500:
 *         description: Server error
 */
router.get(
  '/:id/users',
  authenticateToken,
  requirePermission('users', 'read'),
  validateIdParam(),
  validatePagination(),
  async (req, res) => {
    try {
      const roleId = req.validated.id; // From validateIdParam middleware
      const { page, limit } = req.validated.pagination; // From validatePagination middleware

      // Use GenericEntityService instead of Role.getUsersByRole
      const result = await GenericEntityService.findAll('user', {
        filters: { role_id: roleId },
        page,
        limit,
      });

      return ResponseFormatter.list(res, {
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error fetching users by role', {
        error: error.message,
        roleId: req.validated.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create new role (admin only)
 *     description: Create a new role. Role name must be unique. Requires admin privileges.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name (will be converted to lowercase)
 *                 example: manager
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - Name required or empty
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Role name already exists
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('roles', 'create'),
  validateRoleCreate,
  async (req, res) => {
    try {
      const { name, description } = req.body;
      let { priority } = req.body;

      // Check if role name already exists
      if (!name) {
        return ResponseFormatter.badRequest(res, 'Role name is required');
      }

      // Auto-generate priority if not provided (max + 1, default 50)
      if (priority === undefined || priority === null) {
        priority = await getNextOrdinalValue('roles', 'priority', 50);
      }

      const auditContext = buildAuditContext(req);

      const newRole = await GenericEntityService.create('role', {
        name,
        priority,
        description,
      }, { auditContext });

      if (!newRole) {
        throw new Error('Role creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newRole, 'Role created successfully');
    } catch (error) {
      logger.error('Error creating role', {
        error: error.message,
        roleName: req.body.name,
      });

      // Handle database errors (unique constraints, etc.)
      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update role (admin only)
 *     description: |
 *       Update role properties including name, description, permissions, and activation status.
 *       Cannot modify protected roles (admin, client). Requires admin privileges.
 *
 *       **Activation Status Management (Contract v2.0):**
 *       - Setting `is_active: false` deactivates the role
 *       - Setting `is_active: true` reactivates the role
 *       - Deactivated roles prevent role assignment to new users
 *       - Audit trail tracked in audit_logs table (who/when)
 *
 *       **Name Normalization:**
 *       - Role names are automatically converted to lowercase
 *       - Whitespace is trimmed
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name (will be converted to lowercase)
 *                 pattern: '^[a-z][a-z0-9_]*$'
 *                 maxLength: 50
 *                 example: supervisor
 *               description:
 *                 type: string
 *                 description: Role description
 *                 maxLength: 255
 *                 example: Supervises technicians and manages work orders
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission strings
 *                 example: ["users:read", "work_orders:update"]
 *               is_active:
 *                 type: boolean
 *                 description: Role activation status. False = deactivated (cannot be assigned)
 *                 example: true
 *           examples:
 *             updateName:
 *               summary: Update role name
 *               value:
 *                 name: senior_supervisor
 *             updateMultiple:
 *               summary: Update multiple fields
 *               value:
 *                 name: lead_technician
 *                 description: Senior technician with team lead responsibilities
 *                 permissions: ["users:read", "work_orders:create", "work_orders:update"]
 *             deactivateRole:
 *               summary: Deactivate a role
 *               value:
 *                 is_active: false
 *             reactivateRole:
 *               summary: Reactivate a role
 *               value:
 *                 is_active: true
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       nullable: true
 *                     is_active:
 *                       type: boolean
 *                     priority:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid input, empty name, or protected role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Role not found
 *       409:
 *         description: Conflict - Role name already exists
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('roles', 'update'),
  validateIdParam(),
  validateRoleUpdate,
  async (req, res) => {
    try {
      const roleId = req.validated.id;
      const { name, description, permissions, is_active, priority } = req.body;
      const rlsContext = buildRlsContext(req);

      const oldRole = await GenericEntityService.findById('role', roleId, rlsContext);
      if (!oldRole) {
        return ResponseFormatter.notFound(res, 'Role not found');
      }

      // Build updates object
      const updates = {};
      if (name !== undefined) {updates.name = name;}
      if (description !== undefined) {updates.description = description;}
      if (permissions !== undefined) {updates.permissions = permissions;}
      if (is_active !== undefined) {updates.is_active = is_active;}
      if (priority !== undefined) {updates.priority = priority;}

      const auditContext = buildAuditContext(req);

      const updatedRole = await GenericEntityService.update('role', roleId, updates, { auditContext });

      // Handle race condition: role deleted between findById and update
      if (!updatedRole) {
        return ResponseFormatter.notFound(res, 'Role not found');
      }

      return ResponseFormatter.updated(res, updatedRole, 'Role updated successfully');
    } catch (error) {
      logger.error('Error updating role', {
        error: error.message,
        roleId: req.params.id,
      });

      // Handle protected role modification attempts (pattern match for service messages)
      if (error.message.includes('Cannot modify') && error.message.includes('system role')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      // Handle database errors (unique constraints, etc.)
      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role (admin only)
 *     description: Delete a role. Cannot delete protected roles (admin, client) or roles with assigned users. Requires admin privileges.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - Protected role or has assigned users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Role not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('roles', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const roleId = req.validated.id;
      const auditContext = buildAuditContext(req);

      const deletedRole = await GenericEntityService.delete('role', roleId, { auditContext });

      if (!deletedRole) {
        return ResponseFormatter.notFound(res, 'Role not found');
      }

      return ResponseFormatter.deleted(res, 'Role deleted successfully');
    } catch (error) {
      logger.error('Error deleting role', {
        error: error.message,
        roleId: req.params.id,
      });

      if (
        error.message.includes('Cannot delete system role') ||
        error.message.includes('Cannot delete protected role') ||
        error.message.startsWith('Cannot delete role:')
      ) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      // Handle database errors (FK constraints, etc.)
      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
