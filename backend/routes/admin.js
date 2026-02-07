/**
 * Admin Routes - System Administration Endpoints
 *
 * Route Structure:
 *
 * /api/admin/system/          - System-level administration
 *   ├── settings              - GET/PUT system settings
 *   ├── settings/:key         - GET/PUT specific setting
 *   ├── maintenance           - GET/PUT maintenance mode
 *   ├── sessions              - GET active sessions list
 *   ├── sessions/:userId/force-logout  - POST force logout
 *   ├── sessions/:userId/reactivate    - POST reactivate
 *   ├── logs/data             - GET CRUD operation logs
 *   ├── logs/auth             - GET authentication logs
 *   ├── logs/summary          - GET log summary
 *   └── config/               - Config viewers
 *       ├── permissions       - GET permissions.json
 *       └── validation        - GET validation (derived from metadata - SSOT)
 *
 * /api/admin/:entity          - Per-entity metadata (parity with /api/:entity)
 *   ├── GET /                 - Entity metadata (RLS, field access, validation)
 *   └── GET /raw              - Raw metadata file
 *
 * All endpoints require authentication and admin role.
 * SECURITY: Admin-only access enforced via requireMinimumRole('admin')
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const { authenticateToken, requireMinimumRole } = require("../middleware/auth");
const ResponseFormatter = require("../utils/response-formatter");
const systemSettingsService = require("../services/system-settings-service");
const sessionsService = require("../services/sessions-service");
const EntityMetadataService = require("../services/entity-metadata-service");
const AuditService = require("../services/audit-service");
// Logger available if needed: const { logger } = require('../config/logger');
const { validateIdParam } = require("../validators");
const { getClientIp, getUserAgent } = require("../utils/request-helpers");
const { asyncHandler } = require("../middleware/utils");
const AppError = require("../utils/app-error");
const allMetadata = require("../config/models");

// ============================================================================
// MIDDLEWARE: All admin routes require authentication + admin role
// ============================================================================
router.use(authenticateToken);
router.use(requireMinimumRole("admin"));

// ============================================================================
// SYSTEM: SETTINGS
// ============================================================================

/**
 * GET /api/admin/system/settings
 * Get all system settings
 */
router.get(
  "/system/settings",
  asyncHandler(async (req, res) => {
    const settings = await systemSettingsService.getAllSettings();
    return ResponseFormatter.success(res, settings);
  }),
);

/**
 * GET /api/admin/system/settings/:key
 * Get a specific system setting
 */
router.get(
  "/system/settings/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const setting = await systemSettingsService.getSetting(key);

    if (!setting) {
      return ResponseFormatter.notFound(res, `Setting '${key}' not found`);
    }

    return ResponseFormatter.success(res, setting);
  }),
);

/**
 * PUT /api/admin/system/settings/:key
 * Update a specific system setting
 */
router.put(
  "/system/settings/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return ResponseFormatter.badRequest(res, "Value is required");
    }

    const updated = await systemSettingsService.updateSetting(
      key,
      value,
      req.dbUser.id,
    );

    // Log the action
    await AuditService.log({
      action: "update",
      resourceType: "system_settings",
      resourceId: key,
      userId: req.dbUser.id,
      oldValues: null, // Could fetch old value first if needed
      newValues: { value },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return ResponseFormatter.success(res, updated, {
      message: `Setting '${key}' updated successfully`,
    });
  }),
);

// ============================================================================
// SYSTEM: MAINTENANCE MODE
// ============================================================================

/**
 * GET /api/admin/system/maintenance
 * Get current maintenance mode status
 */
router.get(
  "/system/maintenance",
  asyncHandler(async (req, res) => {
    const mode = await systemSettingsService.getMaintenanceMode();
    return ResponseFormatter.success(res, mode);
  }),
);

/**
 * PUT /api/admin/system/maintenance
 * Enable or disable maintenance mode
 *
 * Body: { enabled: boolean, message?: string, allowed_roles?: string[], estimated_end?: string }
 */
router.put(
  "/system/maintenance",
  asyncHandler(async (req, res) => {
    const { enabled, message, allowed_roles, estimated_end } = req.body;

    if (typeof enabled !== "boolean") {
      return ResponseFormatter.badRequest(res, "enabled (boolean) is required");
    }

    let result;
    if (enabled) {
      result = await systemSettingsService.enableMaintenanceMode(
        { message, allowed_roles, estimated_end },
        req.dbUser.id,
      );
    } else {
      result = await systemSettingsService.disableMaintenanceMode(
        req.dbUser.id,
      );
    }

    // Log the action
    await AuditService.log({
      action: enabled ? "maintenance_enabled" : "maintenance_disabled",
      resourceType: "system_settings",
      resourceId: "maintenance_mode",
      userId: req.dbUser.id,
      newValues: result.value,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return ResponseFormatter.success(res, result.value, {
      message: enabled
        ? "Maintenance mode enabled"
        : "Maintenance mode disabled",
    });
  }),
);

// ============================================================================
// SYSTEM: SESSIONS (Active user session management)
// ============================================================================

/**
 * GET /api/admin/system/sessions
 * Get all active user sessions with user details
 * Returns: Array of sessions with user name, role, login time, IP, user agent
 */
router.get(
  "/system/sessions",
  asyncHandler(async (req, res) => {
    const sessions = await sessionsService.getActiveSessions();
    return ResponseFormatter.success(res, sessions);
  }),
);

/**
 * POST /api/admin/system/sessions/:userId/force-logout
 * Force logout a user by suspending their account and revoking all tokens
 * Body: { reason?: string }
 */
router.post(
  "/system/sessions/:userId/force-logout",
  validateIdParam({ paramName: "userId" }),
  asyncHandler(async (req, res) => {
    const userId = req.validated.userId;
    const reason = req.body?.reason || null;

    const result = await sessionsService.forceLogoutUser(
      userId,
      req.dbUser.id,
      reason,
    );

    // Log the action
    await AuditService.log({
      action: "account_locked",
      resourceType: "users",
      resourceId: userId,
      userId: req.dbUser.id,
      newValues: { status: "suspended", reason },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return ResponseFormatter.success(res, result, {
      message: `User ${result.user.email} has been suspended and logged out`,
    });
  }),
);

/**
 * POST /api/admin/system/sessions/:userId/reactivate
 * Reactivate a suspended user
 */
router.post(
  "/system/sessions/:userId/reactivate",
  validateIdParam({ paramName: "userId" }),
  asyncHandler(async (req, res) => {
    const userId = req.validated.userId;

    const result = await sessionsService.reactivateUser(userId, req.dbUser.id);

    // Log the action
    await AuditService.log({
      action: "account_unlocked",
      resourceType: "users",
      resourceId: userId,
      userId: req.dbUser.id,
      newValues: { status: "active" },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return ResponseFormatter.success(res, result, {
      message: `User ${result.user.email} has been reactivated`,
    });
  }),
);

/**
 * DELETE /api/admin/system/sessions/:sessionId
 * Revoke a specific session without suspending user
 */
router.delete(
  "/system/sessions/:sessionId",
  validateIdParam({ paramName: "sessionId" }),
  asyncHandler(async (req, res) => {
    const sessionId = req.validated.sessionId;
    const result = await sessionsService.revokeSession(
      sessionId,
      req.dbUser.id,
    );
    return ResponseFormatter.success(res, result, {
      message: "Session revoked successfully",
    });
  }),
);
// ============================================================================
// SYSTEM: LOGS (Data and Auth logs with filtering)
// ============================================================================

/**
 * GET /api/admin/system/logs/data
 * Get data transformation logs (CRUD operations)
 * Query params: page, limit, userId, resourceType, action, startDate, endDate, search
 */
router.get(
  "/system/logs/data",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      userId,
      resourceType,
      action,
      startDate,
      endDate,
      search,
    } = req.query;

    const result = await AuditService.getDataLogs({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      userId: userId ? parseInt(userId, 10) : null,
      resourceType,
      action,
      startDate,
      endDate,
      search,
    });

    return ResponseFormatter.success(res, result);
  }),
);

/**
 * GET /api/admin/system/logs/auth
 * Get authentication logs (logins, logouts, failures)
 * Query params: page, limit, userId, action, result, startDate, endDate, search
 */
router.get(
  "/system/logs/auth",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      result,
      startDate,
      endDate,
      search,
    } = req.query;

    const authResult = await AuditService.getAuthLogs({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      userId: userId ? parseInt(userId, 10) : null,
      action,
      result,
      startDate,
      endDate,
      search,
    });

    return ResponseFormatter.success(res, authResult);
  }),
);

/**
 * GET /api/admin/system/logs/summary
 * Get log activity summary for dashboard
 * Query params: period (day, week, month)
 */
router.get(
  "/system/logs/summary",
  asyncHandler(async (req, res) => {
    const { period = "day" } = req.query;
    const summary = await AuditService.getLogSummary(period);
    return ResponseFormatter.success(res, summary);
  }),
);

// ============================================================================
// SYSTEM: CONFIG (Raw config access for advanced admin use)
// ============================================================================

/**
 * GET /api/admin/system/config/permissions
 * View the permissions.json configuration (raw)
 */
router.get(
  "/system/config/permissions",
  asyncHandler(async (req, res) => {
    const permissionsPath = path.join(
      __dirname,
      "../../config/permissions.json",
    );
    const permissions = JSON.parse(fs.readFileSync(permissionsPath, "utf8"));
    return ResponseFormatter.success(res, permissions);
  }),
);

/**
 * GET /api/admin/system/config/validation
 * View validation rules derived from entity metadata (SSOT)
 *
 * Returns all field definitions from all entities, organized by entity.
 * This replaces the old validation-rules.json file.
 */
router.get(
  "/system/config/validation",
  asyncHandler(async (req, res) => {
    // Build validation from entity metadata (SSOT)
    const validation = {
      source: "entity-metadata",
      description: "Validation rules derived from *-metadata.js files",
      entities: {},
    };

    for (const [entityName, metadata] of Object.entries(allMetadata)) {
      if (metadata.fields) {
        validation.entities[entityName] = {
          tableName: metadata.tableName,
          fields: metadata.fields,
          requiredFields: metadata.requiredFields || [],
          immutableFields: metadata.immutableFields || [],
        };
      }
    }

    return ResponseFormatter.success(res, validation);
  }),
);

// ============================================================================
// ENTITY METADATA (Per-entity admin - parity with /api/:entity)
// IMPORTANT: These dynamic routes MUST be defined LAST to avoid matching
// static routes like /system/logs/data as "/:entity" = "system"
// ============================================================================

/**
 * GET /api/admin/entities
 * List all available entities with basic metadata
 */
router.get(
  "/entities",
  asyncHandler(async (req, res) => {
    const entities = Object.keys(allMetadata).map((name) => ({
      name,
      tableName: allMetadata[name].tableName || name,
      primaryKey: allMetadata[name].primaryKey || "id",
      displayName: allMetadata[name].displayName || name.replace(/_/g, " "),
    }));
    return ResponseFormatter.success(res, entities);
  }),
);

/**
 * GET /api/admin/:entity
 * Get comprehensive metadata for a specific entity
 * Includes: RLS matrix, field access matrix, validation rules, displayColumns
 */
router.get(
  "/:entity",
  asyncHandler(async (req, res) => {
    const { entity } = req.params;
    const metadata = EntityMetadataService.getEntityMetadata(entity);

    if (!metadata) {
      throw new AppError(`Entity '${entity}' not found`, 404, "NOT_FOUND");
    }

    return ResponseFormatter.success(res, metadata);
  }),
);

/**
 * GET /api/admin/:entity/raw
 * Get raw metadata file for entity (for advanced debugging)
 */
router.get(
  "/:entity/raw",
  asyncHandler(async (req, res) => {
    const { entity } = req.params;

    if (!allMetadata[entity]) {
      throw new AppError(`Entity '${entity}' not found`, 404, "NOT_FOUND");
    }

    return ResponseFormatter.success(res, allMetadata[entity]);
  }),
);

module.exports = router;
