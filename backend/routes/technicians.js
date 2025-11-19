/**
 * Technician Management Routes
 * RESTful API for technician CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const { hasMinimumRole } = require('../config/permissions-loader');
const {
  validateTechnicianCreate,
  validateTechnicianUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Technician = require('../db/models/Technician');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const technicianMetadata = require('../config/models/technician-metadata');

const router = express.Router();

/**
 * Sanitize technician data based on requesting user's role
 * Customers see limited info (name, certs, photo only)
 * Technicians+ see full profile
 */
function sanitizeTechnicianData(technician, userRole) {
  if (!technician) {
    return technician;
  }

  // If customer, filter sensitive fields
  if (userRole === 'customer' || userRole === 1) {
    return {
      id: technician.id,
      // Public fields only - no license_number, hourly_rate, etc.
      status: technician.status,
      is_active: technician.is_active,
      created_at: technician.created_at,
      certifications: technician.certifications, // Public info
      skills: technician.skills, // Public info
    };
  }

  // Technicians and above see full profile
  return technician;
}

/**
 * @openapi
 * /api/technicians:
 *   get:
 *     tags: [Technicians]
 *     summary: Get all technicians
 *     description: Retrieve a paginated list of technicians. Customers see limited info (field-level filtering applies).
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: DESC
 *     responses:
 *       200:
 *         description: Technicians retrieved successfully
 *       403:
 *         description: Forbidden
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

      const result = await Technician.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
        req,
      });

      // Apply field-level filtering based on role
      const sanitizedData = result.data.map((tech) =>
        sanitizeTechnicianData(tech, req.dbUser.role),
      );

      res.json({
        success: true,
        data: sanitizedData,
        count: sanitizedData.length,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving technicians', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve technicians',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/technicians/{id}:
 *   get:
 *     tags: [Technicians]
 *     summary: Get technician by ID
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
 *         description: Technician retrieved successfully
 *       404:
 *         description: Technician not found
 *       403:
 *         description: Forbidden
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
      const technician = await Technician.findById(technicianId, req);

      if (!technician) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Technician not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Apply field-level filtering
      const sanitizedData = sanitizeTechnicianData(
        technician,
        req.dbUser.role,
      );

      res.json({
        success: true,
        data: sanitizedData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving technician', {
        error: error.message,
        technicianId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve technician',
        timestamp: new Date().toISOString(),
      });
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
 *               hourly_rate:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technician created successfully
 *       400:
 *         description: Bad Request
 *       403:
 *         description: Forbidden - Manager+ access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('technicians', 'create'),
  validateTechnicianCreate,
  async (req, res) => {
    try {
      const { license_number, hourly_rate, status } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newTechnician = await Technician.create({
        license_number,
        hourly_rate,
        status,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'technician',
        resourceId: newTechnician.id,
        newValues: { license_number, hourly_rate, status },
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newTechnician,
        message: 'Technician created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating technician', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'License number already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid status value. Must be one of: available, on_job, off_duty, suspended',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create technician',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/technicians/{id}:
 *   patch:
 *     tags: [Technicians]
 *     summary: Update technician
 *     description: Technicians can update their own profile, manager+ can update any technician.
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
 *     responses:
 *       200:
 *         description: Technician updated successfully
 *       400:
 *         description: Bad Request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Technician not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('technicians', 'update'),
  validateIdParam(),
  validateTechnicianUpdate,
  async (req, res) => {
    try {
      const technicianId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const technician = await Technician.findById(technicianId);
      if (!technician) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Technician not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Authorization: Technicians can update own profile, manager+ can update any profile
      const isSelfUpdate = req.dbUser && req.dbUser.id && technician.user_id === req.dbUser.id;
      const isManagerPlus = req.dbUser && hasMinimumRole(req.dbUser.role, 'manager');
      
      if (!isSelfUpdate && !isManagerPlus) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: 'Forbidden',
          message: 'You can only update your own technician profile. Manager role required to update others.',
          timestamp: new Date().toISOString(),
        });
      }

      await Technician.update(technicianId, req.body);
      const updatedTechnician = await Technician.findById(technicianId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'technician',
        resourceId: technicianId,
        oldValues: technician,
        newValues: updatedTechnician,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        data: updatedTechnician,
        message: 'Technician updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating technician', {
        error: error.message,
        technicianId: req.params.id,
      });

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid status value. Must be one of: available, on_job, off_duty, suspended',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update technician',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/technicians/{id}:
 *   delete:
 *     tags: [Technicians]
 *     summary: Deactivate technician (manager+ only)
 *     description: Soft delete (deactivate) a technician account.
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
 *         description: Technician deactivated successfully
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
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const technician = await Technician.findById(technicianId);
      if (!technician) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Technician not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Technician.deactivate(technicianId);

      await auditService.log({
        userId: req.user.userId,
        action: 'deactivate',
        resourceType: 'technician',
        resourceId: technicianId,
        oldValues: technician,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Technician deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deactivating technician', {
        error: error.message,
        technicianId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to deactivate technician',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
