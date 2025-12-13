/**
 * User Management Routes
 * RESTful API for user CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validateUserCreate,
  validateProfileUpdate,
  validateRoleAssignment,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
// User model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const userMetadata = require('../config/models/user-metadata');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(userMetadata);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of users with optional search, filtering, and sorting.
 *       All query parameters are optional and can be combined.
 *       Admin view includes inactive users by default.
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
 *         description: Search across first_name, last_name, and email (case-insensitive)
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: Filter by role ID
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, email, first_name, last_name, created_at, updated_at]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('users', 'read'),
  enforceRLS('users'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(userMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('user', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, userMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving users', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (admin only)
 *     description: Retrieve a single user by their ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('users', 'read'),
  enforceRLS('users'),
  validateIdParam(),
  async (req, res) => {
    try {
      const userId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      const user = await GenericEntityService.findById('user', userId, rlsContext);

      if (!user) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      // Apply metadata-driven field-level filtering
      const sanitizedData = filterDataByRole(user, userMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving user', {
        error: error.message,
        userId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user (admin only)
 *     description: Manually create a new user. Requires admin privileges.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request - Invalid input
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('users', 'create'),
  validateUserCreate,
  async (req, res) => {
    try {
      // req.body is already validated and stripped by validateUserCreate
      const auditContext = buildAuditContext(req);

      const newUser = await GenericEntityService.create('user', req.body, { auditContext });

      if (!newUser) {
        throw new Error('User creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newUser, 'User created successfully');
    } catch (error) {
      logger.error('Error creating user', {
        error: error.message,
        code: error.code,
        email: req.body.email,
      });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user (admin only)
 *     description: |
 *       Update user information including profile fields and activation status.
 *       Setting is_active to false deactivates the user (cannot authenticate).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *                 maxLength: 100
 *               last_name:
 *                 type: string
 *                 maxLength: 100
 *               is_active:
 *                 type: boolean
 *                 description: Set false to deactivate user
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request - Invalid input
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('users', 'update'),
  enforceRLS('users'),
  validateIdParam(),
  validateProfileUpdate,
  async (req, res) => {
    try {
      const userId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const existingUser = await GenericEntityService.findById('user', userId, rlsContext);
      if (!existingUser) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      const updatedUser = await GenericEntityService.update('user', userId, req.body, { auditContext });

      if (!updatedUser) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      return ResponseFormatter.updated(res, updatedUser, 'User updated successfully');
    } catch (error) {
      logger.error('Error updating user', {
        error: error.message,
        code: error.code,
        userId: req.params.id,
      });

      // Handle "no valid updateable fields" - means client sent only immutable fields
      if (error.message?.includes('No valid updateable fields')) {
        return ResponseFormatter.badRequest(res, 'No updateable fields provided. Some fields may be immutable.');
      }

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Set user's role (admin only)
 *     description: Change a user's role (REPLACES existing role - one role per user)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *             properties:
 *               role_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       404:
 *         description: User or role not found
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put(
  '/:id/role',
  authenticateToken,
  requirePermission('users', 'update'),
  validateIdParam(),
  validateRoleAssignment,
  async (req, res) => {
    try {
      const userId = req.validated.id;
      const { role_id } = req.body;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      // Validate role_id is a number
      const roleIdNum = parseInt(role_id);
      if (isNaN(roleIdNum)) {
        return ResponseFormatter.badRequest(res, 'role_id must be a number');
      }

      // Verify role exists using GenericEntityService
      const role = await GenericEntityService.findById('role', roleIdNum, rlsContext);
      if (!role) {
        return ResponseFormatter.notFound(res, `Role with ID ${role_id} not found`);
      }

      // Update role assignment
      const updatedUser = await GenericEntityService.update('user', userId, { role_id: roleIdNum }, { auditContext });

      if (!updatedUser) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      return ResponseFormatter.updated(res, updatedUser, `Role '${role.name}' assigned successfully`);
    } catch (error) {
      logger.error('Error assigning role', {
        error: error.message,
        code: error.code,
        userId: req.params.id,
        roleId: req.body.role_id,
      });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (admin only)
 *     description: Soft delete a user (sets is_active = false)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('users', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const userId = req.validated.id;
      const auditContext = buildAuditContext(req);

      // Prevent self-deletion (special case not in GenericEntityService)
      if (req.dbUser.id === userId) {
        return ResponseFormatter.badRequest(res, 'Cannot delete your own account');
      }

      const deleted = await GenericEntityService.delete('user', userId, { auditContext });

      if (!deleted) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      return ResponseFormatter.deleted(res, 'User deleted successfully');
    } catch (error) {
      logger.error('Error deleting user', {
        error: error.message,
        userId: req.params.id,
      });

      // Handle deletion blocked by dependents
      if (error.message.includes('Cannot delete') || error.message.startsWith('Cannot delete user:')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
