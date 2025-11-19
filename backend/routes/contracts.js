/**
 * Contract Management Routes
 * RESTful API for contract CRUD operations
 * Uses permission-based authorization (see config/permissions.json)
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { enforceRLS } = require('../middleware/row-level-security');
const {
  validateContractCreate,
  validateContractUpdate,
  validateIdParam,
  validatePagination,
  validateQuery,
} = require('../validators');
const Contract = require('../db/models/Contract');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { logger } = require('../config/logger');
const contractMetadata = require('../config/models/contract-metadata');

const router = express.Router();

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     tags: [Contracts]
 *     summary: Get all contracts
 *     description: Customers see their own contracts. Technicians see contracts for assigned customers. Dispatchers+ see all.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Contracts retrieved successfully
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('contracts', 'read'),
  enforceRLS('contracts'),
  validatePagination({ maxLimit: 200 }),
  validateQuery(contractMetadata),
  async (req, res) => {
    try {
      const { page, limit } = req.validated.pagination;
      const { search, filters, sortBy, sortOrder } = req.validated.query;

      const result = await Contract.findAll({
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
        req,
      });

      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving contracts', { error: error.message });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve contracts',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  '/:id',
  authenticateToken,
  requirePermission('contracts', 'read'),
  enforceRLS('contracts'),
  validateIdParam(),
  async (req, res) => {
    try {
      const contractId = req.validated.id;
      const contract = await Contract.findById(contractId, req);

      if (!contract) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Contract not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: contract,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving contract', {
        error: error.message,
        contractId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve contract',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/contracts:
 *   post:
 *     tags: [Contracts]
 *     summary: Create new contract (manager+ only)
 *     description: Create a service contract for a customer. Manager+ access required.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contract_number
 *               - customer_id
 *             properties:
 *               contract_number:
 *                 type: string
 *                 maxLength: 100
 *               customer_id:
 *                 type: integer
 *                 minimum: 1
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               value:
 *                 type: number
 *                 format: decimal
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       400:
 *         description: Bad Request - Invalid data or duplicate contract number
 *       403:
 *         description: Forbidden - Manager+ access required
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('contracts', 'create'),
  validateContractCreate,
  async (req, res) => {
    try {
      const { contract_number, customer_id, start_date, end_date, value, status } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newContract = await Contract.create({
        contract_number,
        customer_id,
        start_date,
        end_date,
        value,
        status,
      });

      await auditService.log({
        userId: req.user.userId,
        action: 'create',
        resourceType: 'contract',
        resourceId: newContract.id,
        newValues: { contract_number, customer_id, value },
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: newContract,
        message: 'Contract created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating contract', { error: error.message });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Contract number already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to create contract',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/contracts/{id}:
 *   patch:
 *     tags: [Contracts]
 *     summary: Update contract (manager+ only)
 *     description: Update contract details. Manager+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contract_number:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               value:
 *                 type: number
 *               status:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *       400:
 *         description: Bad Request - At least one field required
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Contract not found
 */
router.patch(
  '/:id',
  authenticateToken,
  requirePermission('contracts', 'update'),
  validateIdParam(),
  validateContractUpdate,
  async (req, res) => {
    try {
      const contractId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const contract = await Contract.findById(contractId);
      if (!contract) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Contract not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Contract.update(contractId, req.body);
      const updatedContract = await Contract.findById(contractId);

      await auditService.log({
        userId: req.user.userId,
        action: 'update',
        resourceType: 'contract',
        resourceId: contractId,
        oldValues: contract,
        newValues: updatedContract,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        data: updatedContract,
        message: 'Contract updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating contract', {
        error: error.message,
        contractId: req.params.id,
      });

      if (error.code === '23505') {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Conflict',
          message: 'Contract number already exists',
          timestamp: new Date().toISOString(),
        });
      }

      if (error.code === '23514') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad Request',
          message: 'Invalid field value - check status and other enum fields',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to update contract',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/contracts/{id}:
 *   delete:
 *     tags: [Contracts]
 *     summary: Delete contract (manager+ only)
 *     description: Soft delete a contract (sets is_active=false). Manager+ access required.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       403:
 *         description: Forbidden - Manager+ access required
 *       404:
 *         description: Contract not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('contracts', 'delete'),
  validateIdParam(),
  async (req, res) => {
    try {
      const contractId = req.validated.id;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const contract = await Contract.findById(contractId);
      if (!contract) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Not Found',
          message: 'Contract not found',
          timestamp: new Date().toISOString(),
        });
      }

      await Contract.delete(contractId);

      await auditService.log({
        userId: req.user.userId,
        action: 'delete',
        resourceType: 'contract',
        resourceId: contractId,
        oldValues: contract,
        ipAddress,
        userAgent,
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Contract deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting contract', {
        error: error.message,
        contractId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: 'Failed to delete contract',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
