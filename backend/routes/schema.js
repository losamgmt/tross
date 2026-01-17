/**
 * Schema Introspection API Routes
 *
 * Exposes database schema metadata to frontend for auto-generating UIs
 *
 * Security: Requires authentication
 * Performance: Schemas are cacheable (TTL: 5 minutes)
 */

const express = require('express');
const router = express.Router();
const SchemaIntrospectionService = require('../services/schema-introspection');
const { authenticateToken } = require('../middleware/auth');
const ResponseFormatter = require('../utils/response-formatter');
const { deriveValidationRules, getCompositeValidation } = require('../config/validation-deriver');
const { asyncHandler } = require('../middleware/utils');
const AppError = require('../utils/app-error');

/**
 * @openapi
 * /api/schema:
 *   get:
 *     tags: [Schema]
 *     summary: Get all available tables
 *     description: Returns list of tables in public schema with metadata
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of tables
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
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const tables = await SchemaIntrospectionService.getAllTables();

  return ResponseFormatter.list(res, {
    data: tables,
    message: 'Tables retrieved successfully',
  });
}));

/**
 * @openapi
 * /api/schema/{tableName}:
 *   get:
 *     tags: [Schema]
 *     summary: Get table schema metadata
 *     description: Returns complete schema info for auto-generating UI (columns, types, constraints, relationships)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *         description: Table name (e.g., 'users', 'roles')
 *     responses:
 *       200:
 *         description: Table schema metadata
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
 *                     tableName:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     columns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           nullable:
 *                             type: boolean
 *                           uiType:
 *                             type: string
 *                           label:
 *                             type: string
 *                           readonly:
 *                             type: boolean
 *                           foreignKey:
 *                             type: object
 *       404:
 *         description: Table not found
 */
router.get('/:tableName', authenticateToken, asyncHandler(async (req, res) => {
  const { tableName } = req.params;

  const schema = await SchemaIntrospectionService.getTableSchema(tableName);

  return ResponseFormatter.get(res, schema, {
    message: 'Table schema retrieved successfully',
  });
}));

/**
 * @openapi
 * /api/schema/{tableName}/options/{column}:
 *   get:
 *     tags: [Schema]
 *     summary: Get select options for foreign key field
 *     description: Returns {value, label} pairs for dropdown/select fields
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: column
 *         required: true
 *         schema:
 *           type: string
 *         description: Column name (e.g., 'role_id')
 *     responses:
 *       200:
 *         description: Select options
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
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: integer
 *                       label:
 *                         type: string
 */
router.get(
  '/:tableName/options/:column',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { tableName, column } = req.params;

    // Get the schema to find the foreign key
    const schema =
      await SchemaIntrospectionService.getTableSchema(tableName);
    const columnInfo = schema.columns.find((c) => c.name === column);

    if (!columnInfo || !columnInfo.foreignKey) {
      throw new AppError(`Column '${column}' is not a foreign key`, 400, 'BAD_REQUEST');
    }

    // Get options from the referenced table
    const options = await SchemaIntrospectionService.getForeignKeyOptions(
      columnInfo.foreignKey.table,
    );

    return ResponseFormatter.list(res, {
      data: options,
      message: 'Foreign key options retrieved successfully',
    });
  }),
);

// ============================================================================
// VALIDATION RULES ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /api/schema/validation-rules:
 *   get:
 *     tags: [Schema]
 *     summary: Get all validation rules
 *     description: Returns complete validation rules derived from entity metadata. Used by frontend for form validation.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Complete validation rules
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
 *                     version:
 *                       type: string
 *                     fields:
 *                       type: object
 *                     compositeValidations:
 *                       type: object
 */
router.get('/validation-rules', authenticateToken, asyncHandler(async (req, res) => {
  const rules = deriveValidationRules();

  // Set cache headers (validation rules don't change at runtime)
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes

  return ResponseFormatter.success(res, rules, {
    message: 'Validation rules derived from metadata',
  });
}));

/**
 * @openapi
 * /api/schema/validation-rules/{operationName}:
 *   get:
 *     tags: [Schema]
 *     summary: Get validation rules for a specific operation
 *     description: Returns composite validation for operations like createCustomer, updateWorkOrder, etc.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationName
 *         required: true
 *         schema:
 *           type: string
 *         description: Operation name (e.g., 'createCustomer', 'updateWorkOrder')
 *     responses:
 *       200:
 *         description: Validation rules for the operation
 *       404:
 *         description: Operation not found
 */
router.get('/validation-rules/:operationName', authenticateToken, asyncHandler(async (req, res) => {
  const { operationName } = req.params;
  const composite = getCompositeValidation(operationName);

  if (!composite) {
    throw new AppError(`Validation operation '${operationName}' not found`, 404, 'NOT_FOUND');
  }

  // Get field definitions for this operation
  const rules = deriveValidationRules();
  const fieldDefs = {};

  // Include required fields
  composite.requiredFields?.forEach(fieldName => {
    if (rules.fields[fieldName]) {
      fieldDefs[fieldName] = { ...rules.fields[fieldName], required: true };
    }
  });

  // Include optional fields
  composite.optionalFields?.forEach(fieldName => {
    if (rules.fields[fieldName]) {
      fieldDefs[fieldName] = { ...rules.fields[fieldName], required: false };
    }
  });

  return ResponseFormatter.success(res, {
    operationName,
    entityName: composite.entityName,
    description: composite.description,
    fields: fieldDefs,
  }, {
    message: `Validation rules for ${operationName}`,
  });
}));

module.exports = router;
