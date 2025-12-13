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
const { logger } = require('../config/logger');
const contractMetadata = require('../config/models/contract-metadata');
const ResponseFormatter = require('../utils/response-formatter');
const GenericEntityService = require('../services/generic-entity-service');
const { filterDataByRole } = require('../utils/response-transform');
const { handleDbError, buildDbErrorConfig } = require('../utils/db-error-handler');
const { buildRlsContext, buildAuditContext } = require('../utils/request-context');

const router = express.Router();

// Build DB error config from metadata (single source of truth)
const DB_ERROR_CONFIG = buildDbErrorConfig(contractMetadata);

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     tags: [Contracts]
 *     summary: Get all contracts with search, filters, and sorting
 *     description: |
 *       Retrieve a paginated list of contracts. Row-level security applies.
 *       Customers see their own. Technicians see assigned customers. Dispatchers+ see all.
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
 *         description: Search by contract_number (case-insensitive)
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, expired, cancelled]
 *         description: Filter by contract status
 *       - in: query
 *         name: billing_cycle
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, annually, one_time]
 *         description: Filter by billing cycle
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, contract_number, status, value, start_date, end_date, created_at, updated_at]
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
 *         description: Contracts retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
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

      // Call GenericEntityService with all query options
      const result = await GenericEntityService.findAll('contract', {
        page,
        limit,
        search,
        filters,
        sortBy,
        sortOrder,
      }, buildRlsContext(req));

      // Apply metadata-driven field-level filtering based on role
      const sanitizedData = filterDataByRole(result.data, contractMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.list(res, {
        data: sanitizedData,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        rlsApplied: result.rlsApplied,
      });
    } catch (error) {
      logger.error('Error retrieving contracts', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/contracts/{id}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contract by ID
 *     description: Retrieve a single contract. Row-level security applies.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract retrieved successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Contract not found
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('contracts', 'read'),
  enforceRLS('contracts'),
  validateIdParam(),
  async (req, res) => {
    try {
      const contractId = req.validated.id;

      const contract = await GenericEntityService.findById('contract', contractId, buildRlsContext(req));

      if (!contract) {
        return ResponseFormatter.notFound(res, 'Contract not found');
      }

      // Apply metadata-driven field-level filtering
      const sanitizedData = filterDataByRole(contract, contractMetadata, req.dbUser.role, 'read');

      return ResponseFormatter.get(res, sanitizedData);
    } catch (error) {
      logger.error('Error retrieving contract', {
        error: error.message,
        contractId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
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
      const { contract_number, customer_id, start_date, end_date, value, status, terms, billing_cycle } = req.body;

      const newContract = await GenericEntityService.create('contract', {
        contract_number,
        customer_id,
        start_date,
        end_date,
        value,
        status,
        terms,
        billing_cycle,
      }, { auditContext: buildAuditContext(req) });

      // Guard against unexpected null/undefined return
      if (!newContract) {
        throw new Error('Contract creation failed unexpectedly');
      }

      return ResponseFormatter.created(res, newContract, 'Contract created successfully');
    } catch (error) {
      logger.error('Error creating contract', { error: error.message, code: error.code });

      // Handle database errors (FK violations, unique constraints, etc.)
      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
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
  enforceRLS('contracts'),
  validateIdParam(),
  validateContractUpdate,
  async (req, res) => {
    try {
      const contractId = req.validated.id;
      const rlsContext = buildRlsContext(req);

      // Check if contract exists (with RLS filtering)
      const oldContract = await GenericEntityService.findById('contract', contractId, rlsContext);
      if (!oldContract) {
        return ResponseFormatter.notFound(res, 'Contract not found');
      }

      // Update contract (audit logging handled internally via auditContext)
      const updatedContract = await GenericEntityService.update('contract', contractId, req.body, {
        auditContext: buildAuditContext(req),
      });

      // Handle race condition: contract deleted between findById and update
      if (!updatedContract) {
        return ResponseFormatter.notFound(res, 'Contract not found');
      }

      return ResponseFormatter.updated(res, updatedContract, 'Contract updated successfully');
    } catch (error) {
      logger.error('Error updating contract', {
        error: error.message,
        contractId: req.params.id,
      });

      // Handle database errors (FK violations, unique constraints, etc.)
      if (handleDbError(error, res, DB_ERROR_CONFIG)) {
        return;
      }

      return ResponseFormatter.internalError(res, error);
    }
  },
);

/**
 * @openapi
 * /api/contracts/{id}:
 *   delete:
 *     tags: [Contracts]
 *     summary: Delete contract (manager+ only)
 *     description: |
 *       Permanently delete a contract.
 *       To deactivate instead, use PATCH with is_active=false.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
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

      // Delete contract (returns null if not found, handles cascade via metadata.dependents)
      const deletedContract = await GenericEntityService.delete('contract', contractId, {
        auditContext: buildAuditContext(req),
      });

      if (!deletedContract) {
        return ResponseFormatter.notFound(res, 'Contract not found');
      }

      return ResponseFormatter.deleted(res, 'Contract deleted successfully');
    } catch (error) {
      logger.error('Error deleting contract', {
        error: error.message,
        contractId: req.params.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
