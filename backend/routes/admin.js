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
 *   └── config/               - Raw config viewers
 *       ├── permissions       - GET permissions.json
 *       └── validation        - GET validation-rules.json
 *
 * /api/admin/:entity          - Per-entity metadata (parity with /api/:entity)
 *   ├── GET /                 - Entity metadata (RLS, field access, validation)
 *   └── GET /raw              - Raw metadata file
 *
 * All endpoints require authentication and admin role.
 * SECURITY: Admin-only access enforced via requireMinimumRole('admin')
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { authenticateToken, requireMinimumRole } = require('../middleware/auth');
const ResponseFormatter = require('../utils/response-formatter');
const systemSettingsService = require('../services/system-settings-service');
const sessionsService = require('../services/sessions-service');
const entityMetadataService = require('../services/entity-metadata-service');
const adminLogsService = require('../services/admin-logs-service');
const auditService = require('../services/audit-service');
const { logger } = require('../config/logger');

// ============================================================================
// MIDDLEWARE: All admin routes require authentication + admin role
// ============================================================================
router.use(authenticateToken);
router.use(requireMinimumRole('admin'));

// ============================================================================
// SYSTEM: SETTINGS
// ============================================================================

/**
 * GET /api/admin/system/settings
 * Get all system settings
 */
router.get('/system/settings', async (req, res) => {
  try {
    const settings = await systemSettingsService.getAllSettings();
    return ResponseFormatter.success(res, settings);
  } catch (error) {
    logger.error('Error fetching system settings', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch system settings');
  }
});

/**
 * GET /api/admin/system/settings/:key
 * Get a specific system setting
 */
router.get('/system/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await systemSettingsService.getSetting(key);

    if (!setting) {
      return ResponseFormatter.notFound(res, `Setting '${key}' not found`);
    }

    return ResponseFormatter.success(res, setting);
  } catch (error) {
    logger.error('Error fetching system setting', {
      key: req.params.key,
      error: error.message,
    });
    return ResponseFormatter.error(res, 'Failed to fetch system setting');
  }
});

/**
 * PUT /api/admin/system/settings/:key
 * Update a specific system setting
 */
router.put('/system/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return ResponseFormatter.badRequest(res, 'Value is required');
    }

    const updated = await systemSettingsService.updateSetting(
      key,
      value,
      req.dbUser.id,
    );

    // Log the action
    await auditService.log({
      action: 'update',
      resourceType: 'system_settings',
      resourceId: key,
      userId: req.dbUser.id,
      oldValues: null, // Could fetch old value first if needed
      newValues: { value },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return ResponseFormatter.success(res, updated, {
      message: `Setting '${key}' updated successfully`,
    });
  } catch (error) {
    logger.error('Error updating system setting', {
      key: req.params.key,
      error: error.message,
    });
    return ResponseFormatter.error(res, 'Failed to update system setting');
  }
});

// ============================================================================
// SYSTEM: MAINTENANCE MODE
// ============================================================================

/**
 * GET /api/admin/system/maintenance
 * Get current maintenance mode status
 */
router.get('/system/maintenance', async (req, res) => {
  try {
    const mode = await systemSettingsService.getMaintenanceMode();
    return ResponseFormatter.success(res, mode);
  } catch (error) {
    logger.error('Error fetching maintenance mode', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch maintenance mode');
  }
});

/**
 * PUT /api/admin/system/maintenance
 * Enable or disable maintenance mode
 *
 * Body: { enabled: boolean, message?: string, allowed_roles?: string[], estimated_end?: string }
 */
router.put('/system/maintenance', async (req, res) => {
  try {
    const { enabled, message, allowed_roles, estimated_end } = req.body;

    if (typeof enabled !== 'boolean') {
      return ResponseFormatter.badRequest(res, 'enabled (boolean) is required');
    }

    let result;
    if (enabled) {
      result = await systemSettingsService.enableMaintenanceMode(
        { message, allowed_roles, estimated_end },
        req.dbUser.id,
      );
    } else {
      result = await systemSettingsService.disableMaintenanceMode(req.dbUser.id);
    }

    // Log the action
    await auditService.log({
      action: enabled ? 'maintenance_enabled' : 'maintenance_disabled',
      resourceType: 'system_settings',
      resourceId: 'maintenance_mode',
      userId: req.dbUser.id,
      newValues: result.value,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return ResponseFormatter.success(res, result.value, {
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
    });
  } catch (error) {
    logger.error('Error updating maintenance mode', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to update maintenance mode');
  }
});

// ============================================================================
// SYSTEM: SESSIONS (Active user session management)
// ============================================================================

/**
 * GET /api/admin/system/sessions
 * Get all active user sessions with user details
 * Returns: Array of sessions with user name, role, login time, IP, user agent
 */
router.get('/system/sessions', async (req, res) => {
  try {
    const sessions = await sessionsService.getActiveSessions();
    return ResponseFormatter.success(res, sessions);
  } catch (error) {
    logger.error('Error fetching active sessions', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch active sessions');
  }
});

/**
 * POST /api/admin/system/sessions/:userId/force-logout
 * Force logout a user by suspending their account and revoking all tokens
 * Body: { reason?: string }
 */
router.post('/system/sessions/:userId/force-logout', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const reason = req.body?.reason || null;

    if (isNaN(userId)) {
      return ResponseFormatter.badRequest(res, 'Invalid user ID');
    }

    const result = await sessionsService.forceLogoutUser(
      userId,
      req.dbUser.id,
      reason,
    );

    // Log the action
    await auditService.log({
      action: 'account_locked',
      resourceType: 'users',
      resourceId: userId,
      userId: req.dbUser.id,
      newValues: { status: 'suspended', reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return ResponseFormatter.success(res, result, {
      message: `User ${result.user.email} has been suspended and logged out`,
    });
  } catch (error) {
    logger.error('Error forcing user logout', {
      userId: req.params.userId,
      error: error.message,
    });

    if (error.message.includes('not found')) {
      return ResponseFormatter.notFound(res, error.message);
    }
    if (error.message.includes('yourself')) {
      return ResponseFormatter.badRequest(res, error.message);
    }

    return ResponseFormatter.error(res, 'Failed to force logout user');
  }
});

/**
 * POST /api/admin/system/sessions/:userId/reactivate
 * Reactivate a suspended user
 */
router.post('/system/sessions/:userId/reactivate', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return ResponseFormatter.badRequest(res, 'Invalid user ID');
    }

    const result = await sessionsService.reactivateUser(userId, req.dbUser.id);

    // Log the action
    await auditService.log({
      action: 'account_unlocked',
      resourceType: 'users',
      resourceId: userId,
      userId: req.dbUser.id,
      newValues: { status: 'active' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return ResponseFormatter.success(res, result, {
      message: `User ${result.user.email} has been reactivated`,
    });
  } catch (error) {
    logger.error('Error reactivating user', {
      userId: req.params.userId,
      error: error.message,
    });

    if (error.message.includes('not found') || error.message.includes('not suspended')) {
      return ResponseFormatter.notFound(res, error.message);
    }

    return ResponseFormatter.error(res, 'Failed to reactivate user');
  }
});

/**
 * DELETE /api/admin/system/sessions/:sessionId
 * Revoke a specific session without suspending user
 */
router.delete('/system/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return ResponseFormatter.badRequest(res, 'Invalid session ID');
    }

    const result = await sessionsService.revokeSession(sessionId, req.dbUser.id);

    return ResponseFormatter.success(res, result, {
      message: 'Session revoked successfully',
    });
  } catch (error) {
    logger.error('Error revoking session', {
      sessionId: req.params.sessionId,
      error: error.message,
    });

    if (error.message.includes('not found') || error.message.includes('already revoked')) {
      return ResponseFormatter.notFound(res, error.message);
    }

    return ResponseFormatter.error(res, 'Failed to revoke session');
  }
});
// ============================================================================
// SYSTEM: LOGS (Data and Auth logs with filtering)
// ============================================================================

/**
 * GET /api/admin/system/logs/data
 * Get data transformation logs (CRUD operations)
 * Query params: page, limit, userId, resourceType, action, startDate, endDate, search
 */
router.get('/system/logs/data', async (req, res) => {
  try {
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

    const result = await adminLogsService.getDataLogs({
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
  } catch (error) {
    logger.error('Error fetching data logs', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch data logs');
  }
});

/**
 * GET /api/admin/system/logs/auth
 * Get authentication logs (logins, logouts, failures)
 * Query params: page, limit, userId, action, result, startDate, endDate, search
 */
router.get('/system/logs/auth', async (req, res) => {
  try {
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

    const authResult = await adminLogsService.getAuthLogs({
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
  } catch (error) {
    logger.error('Error fetching auth logs', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch auth logs');
  }
});

/**
 * GET /api/admin/system/logs/summary
 * Get log activity summary for dashboard
 * Query params: period (day, week, month)
 */
router.get('/system/logs/summary', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const summary = await adminLogsService.getLogSummary(period);
    return ResponseFormatter.success(res, summary);
  } catch (error) {
    logger.error('Error fetching log summary', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to fetch log summary');
  }
});

// ============================================================================
// SYSTEM: CONFIG (Raw config access for advanced admin use)
// ============================================================================

/**
 * GET /api/admin/system/config/permissions
 * View the permissions.json configuration (raw)
 */
router.get('/system/config/permissions', (req, res) => {
  try {
    const permissionsPath = path.join(__dirname, '../../config/permissions.json');
    const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
    return ResponseFormatter.success(res, permissions);
  } catch (error) {
    logger.error('Error reading permissions.json', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to read permissions configuration');
  }
});

/**
 * GET /api/admin/system/config/validation
 * View the validation-rules.json configuration (raw)
 */
router.get('/system/config/validation', (req, res) => {
  try {
    const validationPath = path.join(__dirname, '../../config/validation-rules.json');
    const validation = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
    return ResponseFormatter.success(res, validation);
  } catch (error) {
    logger.error('Error reading validation-rules.json', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to read validation configuration');
  }
});

// ============================================================================
// ENTITY METADATA (Per-entity admin - parity with /api/:entity)
// IMPORTANT: These dynamic routes MUST be defined LAST to avoid matching
// static routes like /system/logs/data as "/:entity" = "system"
// ============================================================================

/**
 * GET /api/admin/entities
 * List all available entities with basic metadata
 */
router.get('/entities', (req, res) => {
  try {
    const allMetadata = require('../config/models');
    const entities = Object.keys(allMetadata).map(name => ({
      name,
      tableName: allMetadata[name].tableName || name,
      primaryKey: allMetadata[name].primaryKey || 'id',
      displayName: allMetadata[name].displayName || name.replace(/_/g, ' '),
    }));
    return ResponseFormatter.success(res, entities);
  } catch (error) {
    logger.error('Error listing entities', { error: error.message });
    return ResponseFormatter.error(res, 'Failed to list entities');
  }
});

/**
 * GET /api/admin/:entity
 * Get comprehensive metadata for a specific entity
 * Includes: RLS matrix, field access matrix, validation rules, displayColumns
 */
router.get('/:entity', (req, res) => {
  try {
    const { entity } = req.params;
    const metadata = entityMetadataService.getEntityMetadata(entity);

    if (!metadata) {
      return ResponseFormatter.notFound(res, `Entity '${entity}' not found`);
    }

    return ResponseFormatter.success(res, metadata);
  } catch (error) {
    logger.error('Error fetching entity metadata', {
      entityName: req.params.entity,
      error: error.message,
    });
    return ResponseFormatter.error(res, 'Failed to fetch entity metadata');
  }
});

/**
 * GET /api/admin/:entity/raw
 * Get raw metadata file for entity (for advanced debugging)
 */
router.get('/:entity/raw', (req, res) => {
  try {
    const { entity } = req.params;
    const allMetadata = require('../config/models');

    if (!allMetadata[entity]) {
      return ResponseFormatter.notFound(res, `Entity '${entity}' not found`);
    }

    return ResponseFormatter.success(res, allMetadata[entity]);
  } catch (error) {
    logger.error('Error reading raw entity metadata', {
      entityName: req.params.entity,
      error: error.message,
    });
    return ResponseFormatter.error(res, 'Failed to read entity metadata');
  }
});

module.exports = router;
