/**
 * Role Extensions - Non-CRUD routes for roles
 *
 * Standard CRUD operations (list, get, create, update, delete) are handled
 * by the generic entity router in routes/entities.js.
 *
 * This file contains ONLY unique role-specific endpoints that don't fit
 * the standard CRUD pattern.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateIdParam, validatePagination } = require('../validators');
const { logger } = require('../config/logger');
const ResponseFormatter = require('../utils/response-formatter');
const GenericEntityService = require('../services/generic-entity-service');

/**
 * @openapi
 * /api/roles/{id}/users:
 *   get:
 *     tags: [Roles]
 *     summary: Get all users with a specific role
 *     description: Returns paginated list of users assigned to the specified role
 *     security:
 *       - BearerAuth: []
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
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       404:
 *         description: Role not found
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
      const roleId = req.validated.id;
      const { page, limit } = req.validated.pagination;

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

module.exports = router;
