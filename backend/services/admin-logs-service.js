/**
 * Admin Logs Service
 *
 * Provides filtered access to audit logs for admin panel.
 * Separates logs into two categories:
 * - Data Logs: CRUD operations on business entities
 * - Auth Logs: Authentication events (login, logout, failures)
 *
 * DESIGN NOTES:
 * - Both log types support filtering by date, user, action, etc.
 * - Pagination built-in for large datasets
 * - Returns enriched data with user names and formatted timestamps
 */

const { pool } = require('../db/connection');

// Auth-related action types
const AUTH_ACTIONS = [
  'login',
  'logout',
  'login_success',
  'login_failure',
  'token_refresh',
  'token_revoked',
  'session_expired',
  'password_reset',
  'password_change',
  'mfa_challenge',
  'mfa_success',
  'mfa_failure',
  'account_locked',
  'account_unlocked',
  'maintenance_enabled',
  'maintenance_disabled',
];

// Data-related action types
const DATA_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'bulk_create',
  'bulk_update',
  'bulk_delete',
  'import',
  'export',
];

class AdminLogsService {
  /**
   * Get data transformation logs (CRUD operations)
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated log results
   */
  async getDataLogs(filters = {}) {
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
    params.push(DATA_ACTIONS);

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

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

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
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: dataResult.rows.map(this._formatLogEntry),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        availableActions: DATA_ACTIONS,
        availableResourceTypes: await this._getDistinctResourceTypes('data'),
      },
    };
  }

  /**
   * Get authentication logs
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated log results
   */
  async getAuthLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      userId = null,
      action = null,
      result = null, // 'success' or 'failure'
      startDate = null,
      endDate = null,
      search = null,
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [`al.action = ANY($${params.length + 1})`];
    params.push(AUTH_ACTIONS);

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

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

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
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      data: dataResult.rows.map(this._formatLogEntry),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        availableActions: AUTH_ACTIONS,
        availableResults: ['success', 'failure'],
      },
    };
  }

  /**
   * Get distinct resource types for filtering
   * @private
   */
  async _getDistinctResourceTypes(category) {
    const actions = category === 'data' ? DATA_ACTIONS : AUTH_ACTIONS;
    const query = `
      SELECT DISTINCT resource_type
      FROM audit_logs
      WHERE action = ANY($1)
        AND resource_type IS NOT NULL
      ORDER BY resource_type
    `;

    const result = await pool.query(query, [actions]);
    return result.rows.map(r => r.resource_type);
  }

  /**
   * Format a log entry for API response
   * @private
   */
  _formatLogEntry(row) {
    return {
      id: row.id,
      userId: row.user_id,
      user: row.user_email ? {
        email: row.user_email,
        fullName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.user_email,
      } : null,
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
   * Get log summary statistics
   * @param {string} period - 'day', 'week', 'month'
   * @returns {Promise<Object>} Summary stats
   */
  async getLogSummary(period = 'day') {
    const intervals = {
      day: '24 hours',
      week: '7 days',
      month: '30 days',
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

    const result = await pool.query(query);

    return {
      period,
      interval,
      actions: result.rows.map(row => ({
        action: row.action,
        total: parseInt(row.count, 10),
        success: parseInt(row.success_count, 10),
        failure: parseInt(row.failure_count, 10),
      })),
    };
  }
}

module.exports = new AdminLogsService();
