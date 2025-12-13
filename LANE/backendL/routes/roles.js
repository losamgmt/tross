const express = require('express');
const router = express.Router();
const Role = require('../db/models/Role');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const {
  validateRoleCreate,
  validateRoleUpdate,
  validateIdParam, // Using centralized validator
  validatePagination, // Query string validation
  validateQuery, // NEW: Metadata-driven query validation
} = require('../validators'); // Now from validators/ instead of middleware/
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const roleMetadata = require('../config/models/role-metadata'); // NEW: Role metadata

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles with search, filters, and sorting
 *     description: |
 *       Returns a paginated list of roles with optional search, filtering, and sorting.
 *       All query parameters are optional and can be combined.
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
  validatePagination(),
  validateQuery(roleMetadata), // NEW: Metadata-driven validation
  async (req, res) => {
    try {
    // Extract validated query params
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;

      // Call model with all query options
      const result = await Role.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      });

      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters, // NEW: Show what filters were applied
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching roles', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
        timestamp: new Date().toISOString(),
      });
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
  validateIdParam(),
  async (req, res) => {
    try {
      const roleId = req.validated.id; // From validateIdParam middleware
      const role = await Role.findById(roleId);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Role not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: role,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching role', {
        error: error.message,
        roleId: req.validated.id,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch role',
        timestamp: new Date().toISOString(),
      });
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

      const result = await Role.getUsersByRole(roleId, { page, limit });

      res.json({
        success: true,
        data: result.users,
        count: result.users.length,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching users by role', {
        error: error.message,
        roleId: req.validated.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch users by role',
        timestamp: new Date().toISOString(),
      });
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
 *       - bearerAuth: []
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
      const { name } = req.body;

      // Check if role name already exists
      if (!name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Bad Request',
          message: 'Role name is required',
          timestamp: new Date().toISOString(),
        });
      }

      // Create role
      const newRole = await Role.create(name);

      // Log the creation
      await auditService.log({
        userId: req.dbUser.id,
        action: 'role_create',
        resourceType: 'role',
        resourceId: newRole.id,
        newValues: { name: newRole.name },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newRole,
        message: 'Role created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating role', {
        error: error.message,
        roleName: req.body.name,
      });

      if (error.message === 'Role name already exists') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create role',
        timestamp: new Date().toISOString(),
      });
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
 *       - bearerAuth: []
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
router.put(
  '/:id',
  authenticateToken,
  requirePermission('roles', 'update'),
  validateIdParam(),
  validateRoleUpdate,
  async (req, res) => {
    try {
      const roleId = req.validatedId; // From validateIdParam middleware
      const { name, description, permissions, is_active, priority } = req.body;

      // Get old role for audit
      const oldRole = await Role.findById(roleId);
      if (!oldRole) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Role not found',
          message: 'Role not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Build updates object
      const updates = {};
      if (name !== undefined) {updates.name = name;}
      if (description !== undefined) {updates.description = description;}
      if (permissions !== undefined) {updates.permissions = permissions;}
      if (is_active !== undefined) {updates.is_active = is_active;}
      if (priority !== undefined) {updates.priority = priority;}

      // Update role
      const updatedRole = await Role.update(roleId, updates);

      // Log the update (capture changes)
      const oldValues = {};
      const newValues = {};
      if (name !== undefined && oldRole.name !== updatedRole.name) {
        oldValues.name = oldRole.name;
        newValues.name = updatedRole.name;
      }
      if (description !== undefined && oldRole.description !== updatedRole.description) {
        oldValues.description = oldRole.description;
        newValues.description = updatedRole.description;
      }
      if (permissions !== undefined) {
        oldValues.permissions = oldRole.permissions;
        newValues.permissions = updatedRole.permissions;
      }
      if (is_active !== undefined && oldRole.is_active !== updatedRole.is_active) {
        oldValues.is_active = oldRole.is_active;
        newValues.is_active = updatedRole.is_active;
      }
      if (priority !== undefined && oldRole.priority !== updatedRole.priority) {
        oldValues.priority = oldRole.priority;
        newValues.priority = updatedRole.priority;
      }

      await auditService.log({
        userId: req.dbUser.id,
        action: 'role_update',
        resourceType: 'role',
        resourceId: roleId,
        oldValues,
        newValues,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating role', {
        error: error.message,
        roleId: req.params.id,
      });

      if (error.message === 'Cannot modify protected role') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message === 'Role name already exists') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message === 'Role not found') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Role not found',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update role',
        timestamp: new Date().toISOString(),
      });
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
 *       - bearerAuth: []
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
      const roleId = req.validated.id; // From validateIdParam middleware

      // Delete role (will throw error if protected or has users)
      const deletedRole = await Role.delete(roleId);

      // Log the deletion
      await auditService.log({
        userId: req.dbUser.id,
        action: 'role_delete',
        resourceType: 'role',
        resourceId: roleId,
        oldValues: { name: deletedRole.name },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.json({
        success: true,
        message: 'Role deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting role', {
        error: error.message,
        roleId: req.params.id,
      });

      if (
        error.message === 'Cannot delete protected role' ||
        error.message.startsWith('Cannot delete role:')
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error.message === 'Role not found') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Role not found',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete role',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
