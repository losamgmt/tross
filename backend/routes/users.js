/**
 * User Management Routes
 * RESTful API for user CRUD operations
 * Uses permission-based authorization (see config/permissions.js)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateUserCreate,
  validateProfileUpdate,
  validateRoleAssignment,
  validateIdParam, // Using centralized validator
  validatePagination, // Query string validation
  validateQuery, // NEW: Metadata-driven query validation
} = require('../validators'); // Now from validators/ instead of middleware/
const User = require('../db/models/User');
const Role = require('../db/models/Role');
const auditService = require('../services/audit-service');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const ResponseFormatter = require('../utils/response-formatter');
const userMetadata = require('../config/models/user-metadata'); // NEW: User metadata

const router = express.Router();

/**
 * Sanitize user data for frontend consumption
 * In development mode, provide synthetic auth0_id for users without one
 */
function sanitizeUserData(user) {
  if (!user) {return user;}

  // In development, ensure auth0_id is never null
  if (process.env.NODE_ENV === 'development' && !user.auth0_id) {
    return {
      ...user,
      auth0_id: `dev-user-${user.id}`, // Synthetic ID for dev users
    };
  }

  return user;
}

/**
 * Sanitize array of users
 */
function __sanitizeUserList(users) {
  if (!Array.isArray(users)) {return users;}
  return users.map(sanitizeUserData);
}

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
  validateQuery(userMetadata), // NEW: Metadata-driven validation
  async (req, res) => {
    try {
      // Extract validated query params
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;

      // Admin view: Include inactive users by default (show ALL data)
      // This allows proper data management without hiding soft-deleted records
      const includeInactive = req.query.includeInactive !== 'false'; // Default true for admin

      // Call model with all query options
      const result = await User.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
        includeInactive, // Pass through to model
        req,
      });

      return ResponseFormatter.list(res, {
        data: result.data,
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
      const userId = req.validated.id; // From validateIdParam middleware
      const user = await User.findById(userId, req);

      if (!user) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      return ResponseFormatter.get(res, user);
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
      const { email, first_name, last_name, role_id } = req.body;

      // Create user (will default to 'customer' role if no role_id provided)
      const newUser = await User.create({
        email,
        first_name,
        last_name,
        role_id,
      });

      // Log user creation
      await auditService.log({
        userId: req.dbUser.id,
        action: 'user_create',
        resourceType: 'user',
        resourceId: newUser.id,
        newValues: { email, first_name, last_name, role_id },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return ResponseFormatter.created(res, newUser, 'User created successfully');
    } catch (error) {
      logger.error('Error creating user', {
        error: error.message,
        email: req.body.email,
      });

      // Handle duplicate key violations (code from DB, message from model)
      if (error.code === '23505' || error.message === 'Email already exists') {
        return ResponseFormatter.conflict(res, 'Email already exists');
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
      const userId = req.validated.id; // From validateIdParam middleware
      const { email, first_name, last_name, is_active } = req.body;

      // Verify user exists
      const existingUser = await User.findById(userId, req);
      if (!existingUser) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      // Update user
      const updatedUser = await User.update(userId, {
        email,
        first_name,
        last_name,
        is_active,
      });

      // Log user update
      await auditService.log({
        userId: req.dbUser.id,
        action: 'user_update',
        resourceType: 'user',
        resourceId: userId,
        newValues: { email, first_name, last_name, is_active },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return ResponseFormatter.updated(res, updatedUser, 'User updated successfully');
    } catch (error) {
      logger.error('Error updating user', {
        error: error.message,
        userId: req.params.id,
      });

      // Handle duplicate key violations
      if (error.code === '23505' || error.message === 'Email already exists') {
        return ResponseFormatter.conflict(res, 'Email already exists');
      }

      // Handle check constraint violations
      if (error.code === '23514') {
        return ResponseFormatter.badRequest(res, 'Invalid field value - check status and other enum fields');
      }

      // Return 400 for validation errors
      if (error.message === 'No valid fields to update') {
        return ResponseFormatter.badRequest(res, error.message);
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
      const userId = req.validated.id; // From validateIdParam middleware
      const { role_id } = req.body;

      // Validate role_id is a number
      const roleIdNum = parseInt(role_id);
      if (isNaN(roleIdNum)) {
        return ResponseFormatter.badRequest(res, 'role_id must be a number');
      }

      // Verify role exists
      const role = await Role.findById(roleIdNum, req);
      if (!role) {
        return ResponseFormatter.notFound(res, `Role with ID ${role_id} not found`);
      }

      // KISS: setRole REPLACES user's role (one role per user)
      await User.setRole(userId, role_id);

      // Fetch updated user with role name via JOIN
      const updatedUser = await User.findById(userId, req);

      if (!updatedUser) {
        return ResponseFormatter.notFound(res, 'User not found after role assignment');
      }

      // Log the role assignment
      await auditService.log({
        userId: req.dbUser.id,
        action: 'role_assign',
        resourceType: 'user',
        resourceId: userId,
        newValues: { role_id, role_name: role.name },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return ResponseFormatter.updated(res, updatedUser, `Role '${role.name}' assigned successfully`);
    } catch (error) {
      logger.error('Error assigning role', {
        error: error.message,
        userId: req.params.id,
        roleId: req.body.role_id,
      });

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
      const userId = req.validated.id; // From validateIdParam middleware

      // Prevent self-deletion
      if (req.dbUser.id === userId) {
        return ResponseFormatter.badRequest(res, 'Cannot delete your own account');
      }

      // Verify user exists
      const user = await User.findById(userId, req);
      if (!user) {
        return ResponseFormatter.notFound(res, 'User not found');
      }

      // Delete user permanently (DELETE = permanent removal)
      // For deactivation, use PUT /users/:id with is_active=false
      await User.delete(userId);

      // Log user deletion
      await auditService.log({
        userId: req.dbUser.id,
        action: 'user_delete',
        resourceType: 'user',
        resourceId: userId,
        oldValues: {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return ResponseFormatter.deleted(res, 'User deleted successfully');
    } catch (error) {
      logger.error('Error deleting user', {
        error: error.message,
        userId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
