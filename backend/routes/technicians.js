/**
 * Technician Management Routes
 * RESTful API for technician CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validateTechnicianCreate,
  validateTechnicianUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
// Technician model removed - using GenericEntityService (strangler-fig Phase 4)
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');
const { logger } = require('../config/logger');
const technicianMetadata = require('../config/models/technician-metadata');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(technicianMetadata);

/**
 * @openapi
 * /api/technicians:
 *   get:
 *     tags: [Technicians]
 *     summary: Get all technicians with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of technicians.
 *       Customers see limited info (field-level filtering applies).
 *       Technicians+ see full profile.
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
 *         description: Search by license_number (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, on_job, off_duty, suspended]
 *         description: Filter by technician status
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, license_number, is_active, status, hourly_rate, created_at, updated_at]
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
 *         description: Technicians retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('technicians', 'read'),
  enforceRLS('technicians'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(technicianMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;
      const rlsContext = buildRlsContext(req);

      const result = await GenericEntityService.findAll('technician', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, rlsContext);

      const sanitizedData = filterDataByRole(result.data, technicianMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving technicians', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/technicians/{id}:
 *   get:
 *     tags: [Technicians]
 *     summary: Get technician by ID
 *     description: |
 *       Retrieve a single technician.
 *       Customers see limited fields. Technicians+ see full profile.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Technician ID
 *     responses:
 *       200:
 *         description: Technician retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Technician not found
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('technicians', 'read'),
  enforceRLS('technicians'),
  validateIdParam(),
  async (req, res) => {
    try {
      const technicianId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      const technician = await GenericEntityService.findById('technician', technicianId, rlsContext);

      if (!technician) {
        return ResponseFormatter.notFound(res, 'Technician not found');
      }

      // Apply metadata-driven field-level filtering
      const sanitizedData = filterDataByRole(technician, technicianMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving technician', {
        error: error.message,
        technicianId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/technicians:
 *   post:
 *     tags: [Technicians]
 *     summary: Create new technician (manager+ only)
 *     description: Create a technician profile. Typically done during hiring process.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_number
 *             properties:
 *               license_number:
 *                 type: string
 *                 maxLength: 100
 *               hourly_rate:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [available, on_job, off_duty, suspended]
 *                 default: available
 *     responses:
 *       201:
 *         description: Technician created successfully
 *       400:
 *         description: Bad Request - Invalid data or duplicate license
 *       403:
 *         description: Forbidden - Manager+ access required
 *       409:
 *         description: Conflict - License number already exists
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('technicians', 'create'),
  validateTechnicianCreate,
  async (req, res) => {
    try {
      const { license_number, hourly_rate, status, certifications, skills } = req.body;
      const auditContext = buildAuditContext(req);

      const newTechnician = await GenericEntityService.create('technician', {
        license_number,
        hourly_rate,
        status,
        certifications,
        skills,
      }, { auditContext });

      if (!newTechnician) {
        throw new Error('Technician creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newTechnician, 'Technician created successfully');
    } catch (error) {
      logger.error('Error creating technician', { error: error.message, code: error.code });

      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/technicians/{id}:
 *   patch:
 *     tags: [Technicians]
 *     summary: Update technician
 *     description: |
 *       Technicians can update their own profile.
 *       Managers+ can update any technician.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Technician ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_number:
 *                 type: string
 *                 maxLength: 100
 *               hourly_rate:
 *                 type: number
 *                 format: decimal
 *               status:
 *                 type: string
 *                 enum: [available, on_job, off_duty, suspended]
 *               is_active:
 *                 type: boolean
 *               certifications:
 *                 type: object
 *               skills:
 *                 type: object
 *     responses:
 *       200:
 *         description: Technician updated successfully
 *       400:
 *         description: Bad Request - Invalid data
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Technician not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('technicians', 'update'),
  enforceRLS('technicians'),
  validateIdParam(),
  validateTechnicianUpdate,
  async (req, res) => {
    try {
      const technicianId = req.validated.id;
      const rlsContext = buildRlsContext(req);
      const auditContext = buildAuditContext(req);

      const oldTechnician = await GenericEntityService.findById('technician', technicianId, rlsContext);
      if (!oldTechnician) {
        return ResponseFormatter.notFound(res, 'Technician not found');
      }

      const updatedTechnician = await GenericEntityService.update('technician', technicianId, req.body, { auditContext });

      if (!updatedTechnician) {
        return ResponseFormatter.notFound(res, 'Technician not found');
      }

      return ResponseFormatter.updated(res, updatedTechnician, 'Technician updated successfully');
    } catch (error) {
      logger.error('Error updating technician', {
        error: error.message,
        code: error.code,
        technicianId: req.params.id,
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
 * /api/technicians/{id}:
 *   delete:
 *     tags: [Technicians]
 *     summary: Delete technician (manager+ only)
 *     description: |
 *       Permanently delete a technician record.
 *       To deactivate instead, use PATCH with is_active=false.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Technician ID
 *     responses:
 *       200:
 *         description: Technician deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Technician not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('technicians', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const technicianId = req.validated.id;
      const auditContext = buildAuditContext(req);

      const deleted = await GenericEntityService.delete('technician', technicianId, { auditContext });

      if (!deleted) {
        return ResponseFormatter.notFound(res, 'Technician not found');
      }

      return ResponseFormatter.deleted(res, 'Technician deleted successfully');
    } catch (error) {
      logger.error('Error deleting technician', {
        error: error.message,
        technicianId: req.params.id,
      });

      // Handle deletion blocked by dependents (work_orders, etc.)
      if (error.message.includes('Cannot delete') || error.message.startsWith('Cannot delete technician:')) {
        return ResponseFormatter.badRequest(res, error.message);
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
