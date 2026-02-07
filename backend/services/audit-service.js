const { query: db } = require("../db/connection");
const { logger } = require("../config/logger");
const { AuditActions, AuditResults } = require("./audit-constants");
const { toSafeUserId, toSafeInteger } = require("../validators/type-coercion");
const AppError = require("../utils/app-error");

/**
 * AuditService - Comprehensive audit logging for security and compliance
 * Tracks all security-relevant actions across the application
 *
 * REFACTORED: Removed 15 redundant wrapper methods. Use log() directly with action constants.
 * TYPE SAFE: Handles both integer userIds (Auth0) and string userIds (dev tokens)
 *
 * @example
 * // Old way (deprecated):
 * await auditService.logUserCreation(adminId, userId, ip, ua);
 *
 * // New way:
 * await auditService.log({
 *   action: AuditActions.USER_CREATE,
 *   userId: adminId,
 *   resourceType: ResourceTypes.USER,
 *   resourceId: userId,
 *   ipAddress: ip,
 *   userAgent: ua
 * });
 */
class AuditService {
  /**
   * Log an audit event
   *
   * TYPE SAFETY: userId is coerced to integer or null.
   * - Integer userId: Database-backed users (Auth0)
   * - Null userId: Dev tokens (no database ID) or anonymous actions
   * - String userId: Automatically converted to null with warning log
   *
   * @param {Object} params - Audit event parameters
   * @param {number|string|null} params.userId - User ID performing the action (integer, string dev token, or null)
   * @param {string} params.action - Action performed (use AuditActions constants)
   * @param {string} params.resourceType - Type of resource affected (use ResourceTypes constants)
   * @param {number} params.resourceId - ID of affected resource (optional)
   * @param {Object} params.oldValues - Previous values (for updates)
   * @param {Object} params.newValues - New values (for creates/updates)
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   * @param {string} params.result - Result status (use AuditResults constants, defaults to SUCCESS)
   * @param {string} params.errorMessage - Error message if failed
   * @returns {Promise<void>}
   */
  static async log({
    userId = null,
    action,
    resourceType,
    resourceId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    result = AuditResults.SUCCESS,
    errorMessage = null,
  }) {
    try {
      // CRITICAL FIX: Safely coerce userId to integer or null
      // Dev tokens provide string auth0_id which doesn't map to database ID
      // This prevents "invalid input syntax for type integer" PostgreSQL errors
      const safeUserId = toSafeUserId(userId, "userId");

      await db(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, resource_id, old_values, new_values, 
          ip_address, user_agent, result, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          safeUserId, // Now guaranteed to be integer or null
          action,
          resourceType,
          resourceId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent,
          result,
          errorMessage,
        ],
      );

      // Also log to application logger for real-time monitoring
      logger.info("Audit event", {
        userId: safeUserId,
        originalUserId: userId !== safeUserId ? userId : undefined, // Track coercion
        action,
        resourceType,
        resourceId,
        result,
        ipAddress,
      });
    } catch (error) {
      // Don't throw - audit logging should never break the application
      // But DO ensure the event is captured for security review
      logger.error(
        "CRITICAL: Audit log write failed - event captured in logs",
        {
          error: error.message,
          // Capture full audit event in error log as fallback
          auditEvent: {
            userId,
            action,
            resourceType,
            resourceId,
            result,
            ipAddress,
            timestamp: new Date().toISOString(),
          },
          stack: error.stack,
        },
      );

      // Emit event for monitoring systems to detect audit failures
      // In production, this should trigger alerts
      if (typeof process.emit === "function") {
        process.emit("audit:failure", {
          error: error.message,
          action,
          resourceType,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get audit trail for a specific user
   * @param {number|string} userId - User ID (will be validated)
   * @param {number|string} limit - Maximum records to return (will be validated)
   * @returns {Promise<Array>}
   * @throws {Error} If userId or limit is invalid
   */
  static async getUserAuditTrail(userId, limit = 100) {
    try {
      // TYPE SAFETY: Validate userId and limit before query
      const safeUserId = toSafeInteger(userId, "userId", {
        min: 1,
        allowNull: false,
      });
      const safeLimit = toSafeInteger(limit, "limit", {
        min: 1,
        max: 1000,
        allowNull: false,
      });

      const result = await db(
        `SELECT * FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [safeUserId, safeLimit],
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching user audit trail", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get recent security events (failed logins, unauthorized access, etc.)
   * @param {number} hours - Hours to look back
   * @param {number} limit - Maximum records to return
   * @returns {Promise<Array>}
   */
  static async getSecurityEvents(hours = 24, limit = 100) {
    try {
      const result = await db(
        `SELECT * FROM audit_logs
         WHERE action IN ($1, $2)
         AND created_at > NOW() - INTERVAL '${hours} hours'
         ORDER BY created_at DESC
         LIMIT $3`,
        [AuditActions.LOGIN_FAILED, AuditActions.UNAUTHORIZED_ACCESS, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching security events", { error: error.message });
      throw error;
    }
  }

  /**
   * Get all recent audit logs (admin only)
   * Used for admin dashboard - shows all system activity
   *
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum records to return (default 100, max 500)
   * @param {number} options.offset - Offset for pagination (default 0)
   * @param {string} options.actionFilter - Filter by action type ('data' or 'auth')
   * @returns {Promise<{logs: Array, total: number}>}
   */
  static async getAllRecentLogs({
    limit = 100,
    offset = 0,
    actionFilter = null,
  } = {}) {
    try {
      const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 500);
      const safeOffset = Math.max(0, parseInt(offset) || 0);

      // Build WHERE clause based on filter
      let whereClause = "";
      const params = [];

      if (actionFilter === "auth") {
        // Auth events: login, logout, token, session management
        whereClause = "WHERE action IN ($1, $2, $3, $4, $5, $6, $7, $8)";
        params.push(
          AuditActions.LOGIN,
          AuditActions.LOGIN_FAILED,
          AuditActions.LOGOUT,
          AuditActions.LOGOUT_ALL_DEVICES,
          AuditActions.ADMIN_REVOKE_SESSIONS,
          AuditActions.TOKEN_REFRESH,
          AuditActions.PASSWORD_RESET,
          AuditActions.UNAUTHORIZED_ACCESS,
        );
      } else if (actionFilter === "data") {
        // Data events: all CRUD operations (NOT auth events)
        whereClause = "WHERE action NOT IN ($1, $2, $3, $4, $5, $6, $7, $8)";
        params.push(
          AuditActions.LOGIN,
          AuditActions.LOGIN_FAILED,
          AuditActions.LOGOUT,
          AuditActions.LOGOUT_ALL_DEVICES,
          AuditActions.ADMIN_REVOKE_SESSIONS,
          AuditActions.TOKEN_REFRESH,
          AuditActions.PASSWORD_RESET,
          AuditActions.UNAUTHORIZED_ACCESS,
        );
      }

      // Get total count
      const countResult = await db(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params,
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated logs with user info
      const logsResult = await db(
        `SELECT 
           al.*,
           u.email as user_email,
           u.first_name as user_first_name,
           u.last_name as user_last_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, safeLimit, safeOffset],
      );

      return {
        logs: logsResult.rows,
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error("Error fetching all recent logs", { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   * @param {string} resourceType - Resource type (use ResourceTypes constants)
   * @param {number|string} resourceId - Resource ID (will be validated)
   * @param {number|string} limit - Maximum records to return (will be validated)
   * @returns {Promise<Array>}
   * @throws {Error} If resourceType is empty, resourceId is invalid, or limit is invalid
   */
  static async getResourceAuditTrail(resourceType, resourceId, limit = 50) {
    try {
      // TYPE SAFETY: Validate inputs before query
      if (!resourceType || typeof resourceType !== "string") {
        throw new AppError(
          "resourceType must be a non-empty string",
          400,
          "BAD_REQUEST",
        );
      }
      const safeResourceId = toSafeInteger(resourceId, "resourceId", {
        min: 1,
        allowNull: false,
      });
      const safeLimit = toSafeInteger(limit, "limit", {
        min: 1,
        max: 1000,
        allowNull: false,
      });

      const result = await db(
        `SELECT * FROM audit_logs
         WHERE resource_type = $1 AND resource_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [resourceType, safeResourceId, safeLimit],
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching resource audit trail", {
        error: error.message,
        resourceType,
        resourceId,
      });
      throw error;
    }
  }

  /**
   * Get failed login attempts by IP
   * @param {string} ipAddress - IP address to check
   * @param {number} minutes - Minutes to look back
   * @returns {Promise<number>}
   */
  static async getFailedLoginAttempts(ipAddress, minutes = 15) {
    try {
      const result = await db(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE action = $1
         AND ip_address = $2
         AND created_at > NOW() - INTERVAL '${minutes} minutes'`,
        [AuditActions.LOGIN_FAILED, ipAddress],
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error("Error checking failed login attempts", {
        error: error.message,
        ipAddress,
      });
      return 0; // Fail open - don't block legitimate users on error
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} daysToKeep - Number of days to retain
   * @returns {Promise<number>} - Number of rows deleted
   */
  static async cleanupOldLogs(daysToKeep = 365) {
    try {
      const result = await db(
        `DELETE FROM audit_logs
         WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
         RETURNING id`,
      );

      const count = result.rowCount;

      if (count > 0) {
        logger.info("Old audit logs cleaned up", { count, daysToKeep });
      }

      return count;
    } catch (error) {
      logger.error("Error cleaning up audit logs", { error: error.message });
      throw error;
    }
  }

  // ============================================================================
  // CONTRACT V2.0 CONVENIENCE METHODS
  // ============================================================================
  // In contract v2.0, audit data lives ONLY in audit_logs table (SRP compliance).
  // Entity tables store pure data; audit_logs stores who/when/what.
  // DESIGN DECISION: Deactivate/Reactivate are UPDATE operations - no special methods.

  /**
   * Get who created a record
   * Replaces: created_by field
   *
   * @param {string} resourceType - Table name
   * @param {number} resourceId - Record ID
   * @returns {Promise<{user_id: number|null, created_at: Date}|null>}
   */
  static async getCreator(resourceType, resourceId) {
    try {
      const result = await db(
        `SELECT user_id, created_at
         FROM audit_logs
         WHERE resource_type = $1
           AND resource_id = $2
           AND action LIKE '%CREATE'
         ORDER BY created_at ASC
         LIMIT 1`,
        [resourceType, resourceId],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error getting creator", {
        error: error.message,
        resourceType,
        resourceId,
      });
      throw error;
    }
  }

  /**
   * Get who last updated a record
   * Replaces: updated_by field
   *
   * @param {string} resourceType - Table name
   * @param {number} resourceId - Record ID
   * @returns {Promise<{user_id: number|null, updated_at: Date}|null>}
   */
  static async getLastEditor(resourceType, resourceId) {
    try {
      const result = await db(
        `SELECT user_id, created_at as updated_at
         FROM audit_logs
         WHERE resource_type = $1
           AND resource_id = $2
           AND action LIKE '%UPDATE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [resourceType, resourceId],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error getting last editor", {
        error: error.message,
        resourceType,
        resourceId,
      });
      throw error;
    }
  }

  /**
   * Get who deactivated a record (if currently inactive)
   * Replaces: deactivated_by/deactivated_at fields
   *
   * Looks for UPDATE actions where new_values contains is_active: false
   *
   * @param {string} resourceType - Table name
   * @param {number} resourceId - Record ID
   * @returns {Promise<{user_id: number|null, deactivated_at: Date}|null>}
   */
  static async getDeactivator(resourceType, resourceId) {
    try {
      // Find the most recent UPDATE that set is_active to false
      const result = await db(
        `SELECT user_id, created_at as deactivated_at
         FROM audit_logs
         WHERE resource_type = $1
           AND resource_id = $2
           AND action LIKE '%UPDATE'
           AND new_values::jsonb @> '{"is_active": false}'
         ORDER BY created_at DESC
         LIMIT 1`,
        [resourceType, resourceId],
      );

      // Check if record was reactivated after this deactivation
      if (result.rows[0]) {
        const reactivation = await db(
          `SELECT created_at
           FROM audit_logs
           WHERE resource_type = $1
             AND resource_id = $2
             AND action LIKE '%UPDATE'
             AND new_values::jsonb @> '{"is_active": true}'
             AND created_at > $3
           LIMIT 1`,
          [resourceType, resourceId, result.rows[0].deactivated_at],
        );

        // If reactivated after this deactivation, return null
        if (reactivation.rows.length > 0) {
          return null;
        }
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error getting deactivator", {
        error: error.message,
        resourceType,
        resourceId,
      });
      throw error;
    }
  }

  /**
   * Get complete history for a record (all changes)
   *
   * @param {string} resourceType - Table name
   * @param {number} resourceId - Record ID
   * @param {number} limit - Max records to return
   * @returns {Promise<Array>}
   */
  static async getHistory(resourceType, resourceId, limit = 50) {
    // Reuse existing getResourceAuditTrail method
    return AuditService.getResourceAuditTrail(resourceType, resourceId, limit);
  }

  // ============================================================================
  // ADMIN PANEL LOG QUERIES
  // ============================================================================
  // Consolidated from AdminLogsService - specialized queries for admin UI

  /**
   * Auth-related action types for filtering
   */
  static AUTH_ACTIONS = [
    "login",
    "logout",
    "login_success",
    "login_failure",
    "token_refresh",
    "token_revoked",
    "session_expired",
    "password_reset",
    "password_change",
    "mfa_challenge",
    "mfa_success",
    "mfa_failure",
    "account_locked",
    "account_unlocked",
    "maintenance_enabled",
    "maintenance_disabled",
  ];

  /**
   * Data-related action types for filtering
   */
  static DATA_ACTIONS = [
    "create",
    "read",
    "update",
    "delete",
    "bulk_create",
    "bulk_update",
    "bulk_delete",
    "import",
    "export",
  ];

  /**
   * Format a log entry for API response
   * @private
   */
  static _formatLogEntry(row) {
    return {
      id: row.id,
      userId: row.user_id,
      user: row.user_email
        ? {
            email: row.user_email,
            fullName:
              [row.first_name, row.last_name].filter(Boolean).join(" ") ||
              row.user_email,
          }
        : null,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValues: row.old_values,
      newValues: row.new_values,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      result: row.result,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
  }

  /**
   * Get data transformation logs (CRUD operations) for admin panel
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated log results
   */
  static async getDataLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      userId = null,
      resourceType = null,
      action = null,
      startDate = null,
      endDate = null,
      search = null,
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [`al.action = ANY($${params.length + 1})`];
    params.push(AuditService.DATA_ACTIONS);

    if (userId) {
      params.push(userId);
      conditions.push(`al.user_id = $${params.length}`);
    }

    if (resourceType) {
      params.push(resourceType);
      conditions.push(`al.resource_type = $${params.length}`);
    }

    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`al.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`al.created_at <= $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        al.resource_type ILIKE $${params.length} OR
        al.action ILIKE $${params.length} OR
        u.email ILIKE $${params.length}
      )`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.result,
        al.error_message,
        al.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      db(countQuery, params.slice(0, -2)),
      db(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: dataResult.rows.map(AuditService._formatLogEntry),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        availableActions: AuditService.DATA_ACTIONS,
        availableResourceTypes:
          await AuditService._getDistinctResourceTypes("data"),
      },
    };
  }

  /**
   * Get authentication logs for admin panel
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated log results
   */
  static async getAuthLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      userId = null,
      action = null,
      result = null,
      startDate = null,
      endDate = null,
      search = null,
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [`al.action = ANY($${params.length + 1})`];
    params.push(AuditService.AUTH_ACTIONS);

    if (userId) {
      params.push(userId);
      conditions.push(`al.user_id = $${params.length}`);
    }

    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }

    if (result) {
      params.push(result);
      conditions.push(`al.result = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`al.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`al.created_at <= $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        al.action ILIKE $${params.length} OR
        al.ip_address ILIKE $${params.length} OR
        u.email ILIKE $${params.length}
      )`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.resource_type,
        al.ip_address,
        al.user_agent,
        al.result,
        al.error_message,
        al.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      db(countQuery, params.slice(0, -2)),
      db(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: dataResult.rows.map(AuditService._formatLogEntry),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        availableActions: AuditService.AUTH_ACTIONS,
        availableResults: ["success", "failure"],
      },
    };
  }

  /**
   * Get distinct resource types for filtering
   * @private
   */
  static async _getDistinctResourceTypes(category) {
    const actions =
      category === "data"
        ? AuditService.DATA_ACTIONS
        : AuditService.AUTH_ACTIONS;
    const query = `
      SELECT DISTINCT resource_type
      FROM audit_logs
      WHERE action = ANY($1)
        AND resource_type IS NOT NULL
      ORDER BY resource_type
    `;

    const result = await db(query, [actions]);
    return result.rows.map((r) => r.resource_type);
  }

  /**
   * Get log summary statistics for admin dashboard
   * @param {string} period - 'day', 'week', 'month'
   * @returns {Promise<Object>} Summary stats
   */
  static async getLogSummary(period = "day") {
    const intervals = {
      day: "24 hours",
      week: "7 days",
      month: "30 days",
    };

    const interval = intervals[period] || intervals.day;

    const query = `
      SELECT 
        action,
        COUNT(*) as count,
        COUNT(CASE WHEN result = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN result = 'failure' THEN 1 END) as failure_count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY action
      ORDER BY count DESC
    `;

    const result = await db(query);

    return {
      period,
      interval,
      actions: result.rows.map((row) => ({
        action: row.action,
        total: parseInt(row.count, 10),
        success: parseInt(row.success_count, 10),
        failure: parseInt(row.failure_count, 10),
      })),
    };
  }
}

module.exports = AuditService;
