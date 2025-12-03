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

/**
 * @openapi
 * /api/schema:
 *   get:
 *     tags: [Schema]
 *     summary: Get all available tables
 *     description: Returns list of tables in public schema with metadata
 *     security:
 *       - bearerAuth: []
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tables = await SchemaIntrospectionService.getAllTables();

    res.json({
      success: true,
      data: tables,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Schema Introspection Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @openapi
 * /api/schema/{tableName}:
 *   get:
 *     tags: [Schema]
 *     summary: Get table schema metadata
 *     description: Returns complete schema info for auto-generating UI (columns, types, constraints, relationships)
 *     security:
 *       - bearerAuth: []
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
router.get('/:tableName', authenticateToken, async (req, res) => {
  try {
    const { tableName } = req.params;

    const schema = await SchemaIntrospectionService.getTableSchema(tableName);

    res.json({
      success: true,
      data: schema,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Check if table doesn't exist
    if (error.message.includes('does not exist')) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Table '${req.params.tableName}' does not exist`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      error: 'Schema Introspection Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @openapi
 * /api/schema/{tableName}/options/{column}:
 *   get:
 *     tags: [Schema]
 *     summary: Get select options for foreign key field
 *     description: Returns {value, label} pairs for dropdown/select fields
 *     security:
 *       - bearerAuth: []
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
  async (req, res) => {
    try {
      const { tableName, column } = req.params;

      // Get the schema to find the foreign key
      const schema =
        await SchemaIntrospectionService.getTableSchema(tableName);
      const columnInfo = schema.columns.find((c) => c.name === column);

      if (!columnInfo || !columnInfo.foreignKey) {
        return res.status(400).json({
          error: 'Invalid Request',
          message: `Column '${column}' is not a foreign key`,
          timestamp: new Date().toISOString(),
        });
      }

      // Get options from the referenced table
      const options = await SchemaIntrospectionService.getForeignKeyOptions(
        columnInfo.foreignKey.table,
      );

      res.json({
        success: true,
        data: options,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Schema Options Error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

module.exports = router;
