/**
 * Export Routes - CSV Export Endpoints
 *
 * SRP: ONLY handles HTTP concerns for data export
 *
 * ENDPOINTS:
 *   GET /api/export/:entity          - Export entity data to CSV
 *   GET /api/export/:entity/fields   - Get exportable fields for entity
 *
 * SECURITY:
 *   - Requires authentication
 *   - Respects resource-level permissions (read access required)
 *   - Respects RLS policies (user sees only their data)
 */

const express = require("express");
const router = express.Router();
const ExportService = require("../services/export-service");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { enforceRLS } = require("../middleware/row-level-security");
const { extractEntity } = require("../middleware/generic-entity");
const ResponseFormatter = require("../utils/response-formatter");
const { logger } = require("../config/logger");
const { asyncHandler } = require("../middleware/utils");

/**
 * GET /api/export/:entity
 *
 * Export entity data to CSV format
 *
 * Query params:
 *   - search: Search term
 *   - filters: JSON object of filters (e.g., ?status=pending)
 *   - sortBy: Field to sort by
 *   - sortOrder: 'asc' or 'desc'
 *   - fields: Comma-separated list of fields to include
 *   - includeInactive: Include inactive records (default: false)
 *
 * Response:
 *   - Content-Type: text/csv
 *   - Content-Disposition: attachment with filename
 */
router.get(
  "/:entity",
  authenticateToken,
  extractEntity,
  requirePermission("read"),
  enforceRLS,
  asyncHandler(async (req, res) => {
    const entityName = req.entityName;

    // Extract query options
    const options = {
      search: req.query.search,
      filters: {},
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      includeInactive: req.query.includeInactive === "true",
    };

    // Parse filter params (exclude known non-filter params)
    const nonFilterParams = [
      "search",
      "sortBy",
      "sortOrder",
      "fields",
      "includeInactive",
      "format",
    ];
    for (const [key, value] of Object.entries(req.query)) {
      if (!nonFilterParams.includes(key)) {
        options.filters[key] = value;
      }
    }

    // Parse selected fields if provided
    const selectedFields = req.query.fields
      ? req.query.fields.split(",").map((f) => f.trim())
      : null;

    // Get RLS context from middleware
    const rlsContext = req.rlsContext || null;

    // Generate export
    const result = await ExportService.exportToCSV(
      entityName,
      options,
      rlsContext,
      selectedFields,
    );

    // Log export for audit
    logger.info("[Export] CSV download", {
      entity: entityName,
      userId: req.user?.id,
      rowCount: result.count,
      columns: result.columns.length,
      filters: Object.keys(options.filters).length,
    });

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader("X-Row-Count", result.count);
    res.setHeader("X-Column-Count", result.columns.length);

    // Send CSV data
    res.send(result.csv);
  }),
);

/**
 * GET /api/export/:entity/fields
 *
 * Get list of exportable fields for an entity
 * Useful for building field selection UI
 *
 * Response:
 *   { fields: [{ field: 'name', label: 'Name' }, ...] }
 */
router.get(
  "/:entity/fields",
  authenticateToken,
  extractEntity,
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const entityName = req.entityName;

    const fields = ExportService.getExportableFields(entityName);

    return ResponseFormatter.get(res, {
      entity: entityName,
      fields,
      count: fields.length,
    });
  }),
);

module.exports = router;
