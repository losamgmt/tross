/**
 * Role Extensions - Non-CRUD routes for roles
 *
 * Standard CRUD operations (list, get, create, update, delete) are handled
 * by the generic entity router in routes/entities.js.
 *
 * This file contains ONLY unique role-specific endpoints that don't fit
 * the standard CRUD pattern.
 *
 * UNIFIED DATA FLOW:
 * - requirePermission(operation) reads resource from req.entityMetadata.rlsResource
 * - attachEntity middleware sets req.entityMetadata at factory time
 */
const express = require("express");
const router = express.Router();
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { attachEntity } = require("../middleware/generic-entity");
const { validateIdParam, validatePagination } = require("../validators");
const ResponseFormatter = require("../utils/response-formatter");
const GenericEntityService = require("../services/generic-entity-service");
const { asyncHandler } = require("../middleware/utils");

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
  "/:id/users",
  authenticateToken,
  attachEntity("user"),
  requirePermission("read"),
  validateIdParam(),
  validatePagination(),
  asyncHandler(async (req, res) => {
    const roleId = req.validated.id;
    const { page, limit } = req.validated.pagination;

    const result = await GenericEntityService.findAll("user", {
      filters: { role_id: roleId },
      page,
      limit,
    });

    return ResponseFormatter.list(res, {
      data: result.data,
      pagination: result.pagination,
    });
  }),
);

module.exports = router;
