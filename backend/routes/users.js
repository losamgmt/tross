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
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
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
 *           Search across first_name, last_name, and email (case-insensitive).
 *           Example: ?search=john matches "John Doe", "john@example.com"
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: Filter by role ID (e.g., role_id=2)
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (e.g., is_active=true)
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
 *           enum: [asc, desc, ASC, DESC]
 *           default: DESC
 *         description: Sort order (ascending or descending)
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *                   example: 25
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
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                 appliedFilters:
 *                   type: object
 *                   description: Shows which filters were applied
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             examples:
 *               basic:
 *                 summary: Basic pagination
 *                 value:
 *                   success: true
 *                   data: []
 *                   count: 0
 *                   pagination:
 *                     page: 1
 *                     limit: 50
 *                     total: 0
 *                     totalPages: 0
 *                     hasNext: false
 *                     hasPrev: false
 *                   appliedFilters:
 *                     search: null
 *                     filters: { is_active: true }
 *                     sortBy: created_at
 *                     sortOrder: DESC
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               withSearch:
 *                 summary: Search with filters
 *                 value:
 *                   success: true
 *                   data: []
 *                   count: 0
 *                   appliedFilters:
 *                     search: "john"
 *                     filters: { role_id: 2, is_active: true }
 *                     sortBy: email
 *                     sortOrder: ASC
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

      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters, // NEW: Show what filters were applied
        rlsApplied: result.rlsApplied,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving users', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve users',
        timestamp: new Date().toISOString(),
      });
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving user', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user',
        timestamp: new Date().toISOString(),
      });
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

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newUser,
        message: 'User created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating user', {
        error: error.message,
        email: req.body.email,
      });

      if (error.message === 'Email already exists') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create user',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user (admin only)
 *     description: |
 *       Update user information including profile fields and activation status.
 *
 *       **Activation Status Management (Contract v2.0):**
 *       - Setting `is_active: false` deactivates the user
 *       - Setting `is_active: true` reactivates the user
 *       - Deactivated users cannot authenticate
 *       - Audit trail tracked in audit_logs table (who/when)
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
 *                 description: User email address
 *                 example: user@example.com
 *               first_name:
 *                 type: string
 *                 description: User first name
 *                 example: John
 *               last_name:
 *                 type: string
 *                 description: User last name
 *                 example: Doe
 *               is_active:
 *                 type: boolean
 *                 description: User activation status. False = deactivated (cannot login)
 *                 example: true
 *           examples:
 *             updateProfile:
 *               summary: Update profile information
 *               value:
 *                 email: john.doe@example.com
 *                 first_name: John
 *                 last_name: Doe
 *             deactivateUser:
 *               summary: Deactivate a user
 *               value:
 *                 is_active: false
 *             reactivateUser:
 *               summary: Reactivate a user
 *               value:
 *                 is_active: true
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 *       400:
 *         description: Bad request - Invalid input
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission('users', 'update'),
  validateIdParam(),
  validateProfileUpdate,
  async (req, res) => {
    try {
      const userId = req.validatedId; // From validateIdParam middleware
      const { email, first_name, last_name, is_active } = req.body;

      // Verify user exists
      const existingUser = await User.findById(userId, req);
      if (!existingUser) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating user', {
        error: error.message,
        userId: req.params.id,
      });

      // Return 400 for validation errors
      if (error.message === 'No valid fields to update') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update user',
        timestamp: new Date().toISOString(),
      });
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
      const userId = req.validatedId; // From validateIdParam middleware
      const { role_id } = req.body;

      // Validate role_id is a number
      const roleIdNum = parseInt(role_id);
      if (isNaN(roleIdNum)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'role_id must be a number',
          timestamp: new Date().toISOString(),
        });
      }

      // Verify role exists
      const role = await Role.findById(roleIdNum, req);
      if (!role) {
        return res.status(404).json({
          error: 'Role Not Found',
          message: `Role with ID ${role_id} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      // KISS: setRole REPLACES user's role (one role per user)
      await User.setRole(userId, role_id);

      // Fetch updated user with role name via JOIN
      const updatedUser = await User.findById(userId, req);

      if (!updatedUser) {
        return res.status(404).json({
          error: 'User Not Found',
          message: 'User not found after role assignment',
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        data: updatedUser,
        message: `Role '${role.name}' assigned successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error assigning role', {
        error: error.message,
        userId: req.params.id,
        roleId: req.body.role_id,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to assign role',
        timestamp: new Date().toISOString(),
      });
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
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Cannot delete your own account',
          timestamp: new Date().toISOString(),
        });
      }

      // Verify user exists
      const user = await User.findById(userId, req);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
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

      res.json({
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting user', {
        error: error.message,
        userId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to delete user',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
