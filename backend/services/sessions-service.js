/**
 * Sessions Service
 *
 * Manages active user sessions via refresh_tokens table.
 * Provides session listing and force-logout capabilities.
 *
 * DESIGN NOTES:
 * - Active session = refresh_token with is_active=true and expires_at > now
 * - Force logout = set user status to 'suspended' + revoke all tokens
 * - Session info includes user name, role, login time, IP, user agent
 * - Static class (no instance state)
 */

const db = require('../db/connection');
const { logger } = require('../config/logger');
const AppError = require('../utils/app-error');

class SessionsService {
  /**
   * Get all active sessions with user details
   * @returns {Promise<Array>} Array of active sessions with user info
   */
  static async getActiveSessions() {
    const query = `
      SELECT 
        rt.id as session_id,
        rt.user_id,
        rt.created_at as login_time,
        rt.last_used_at,
        rt.ip_address,
        rt.user_agent,
        rt.expires_at,
        u.email,
        u.first_name,
        u.last_name,
        u.status as user_status,
        r.name as role_name
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE rt.is_active = true
        AND rt.expires_at > NOW()
        AND rt.revoked_at IS NULL
      ORDER BY rt.created_at DESC
    `;

    const result = await db.query(query);
    return result.rows.map(row => ({
      sessionId: row.session_id,
      userId: row.user_id,
      loginTime: row.login_time,
      lastUsedAt: row.last_used_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      expiresAt: row.expires_at,
      user: {
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
        status: row.user_status,
        role: row.role_name,
      },
    }));
  }

  /**
   * Get active sessions for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of user's active sessions
   */
  static async getUserSessions(userId) {
    const query = `
      SELECT 
        rt.id as session_id,
        rt.created_at as login_time,
        rt.last_used_at,
        rt.ip_address,
        rt.user_agent,
        rt.expires_at
      FROM refresh_tokens rt
      WHERE rt.user_id = $1
        AND rt.is_active = true
        AND rt.expires_at > NOW()
        AND rt.revoked_at IS NULL
      ORDER BY rt.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => ({
      sessionId: row.session_id,
      loginTime: row.login_time,
      lastUsedAt: row.last_used_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Force logout a user by suspending their account and revoking all tokens
   * @param {number} userId - User ID to logout
   * @param {number} adminUserId - Admin performing the action
   * @param {string} reason - Optional reason for the suspension
   * @returns {Promise<Object>} Result with user info and revoked session count
   */
  static async forceLogoutUser(userId, adminUserId, reason = null) {
    // Prevent admin from locking themselves (check before transaction)
    if (userId === adminUserId) {
      throw new AppError('Cannot force logout yourself', 400, 'BAD_REQUEST');
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Get user info before suspension
      const userQuery = `
        SELECT id, email, first_name, last_name, status
        FROM users
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new AppError(`User with ID ${userId} not found`, 404, 'NOT_FOUND');
      }

      const user = userResult.rows[0];

      // Update user status to 'suspended'
      const updateUserQuery = `
        UPDATE users
        SET status = 'suspended', updated_at = NOW()
        WHERE id = $1
        RETURNING status
      `;
      await client.query(updateUserQuery, [userId]);

      // Revoke all active refresh tokens for this user
      const revokeTokensQuery = `
        UPDATE refresh_tokens
        SET is_active = false, revoked_at = NOW()
        WHERE user_id = $1
          AND is_active = true
          AND revoked_at IS NULL
        RETURNING id
      `;
      const revokeResult = await client.query(revokeTokensQuery, [userId]);

      await client.query('COMMIT');

      logger.info('User force logged out', {
        userId,
        adminUserId,
        reason,
        revokedTokens: revokeResult.rowCount,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
          previousStatus: user.status,
          newStatus: 'suspended',
        },
        revokedSessionCount: revokeResult.rowCount,
        reason,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to force logout user', {
        userId,
        adminUserId,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke a specific session (without suspending user)
   * @param {number} sessionId - Session (refresh_token) ID to revoke
   * @param {number} adminUserId - Admin performing the action
   * @returns {Promise<Object>} Result with revoke status
   */
  static async revokeSession(sessionId, adminUserId) {
    const query = `
      UPDATE refresh_tokens
      SET is_active = false, revoked_at = NOW()
      WHERE id = $1
        AND is_active = true
        AND revoked_at IS NULL
      RETURNING id, user_id
    `;

    const result = await db.query(query, [sessionId]);

    if (result.rowCount === 0) {
      throw new AppError(`Session ${sessionId} not found or already revoked`, 404, 'NOT_FOUND');
    }

    logger.info('Session revoked', {
      sessionId,
      userId: result.rows[0].user_id,
      adminUserId,
    });

    return {
      success: true,
      sessionId,
      userId: result.rows[0].user_id,
    };
  }

  /**
   * Reactivate a suspended user
   * @param {number} userId - User ID to reactivate
   * @param {number} adminUserId - Admin performing the action
   * @returns {Promise<Object>} Result with user info
   */
  static async reactivateUser(userId, adminUserId) {
    const query = `
      UPDATE users
      SET status = 'active', updated_at = NOW()
      WHERE id = $1 AND status = 'suspended'
      RETURNING id, email, first_name, last_name, status
    `;

    const result = await db.query(query, [userId]);

    if (result.rowCount === 0) {
      throw new AppError(`User ${userId} not found or not suspended`, 404, 'NOT_FOUND');
    }

    const user = result.rows[0];

    logger.info('User reactivated', {
      userId,
      adminUserId,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        status: user.status,
      },
    };
  }
}

module.exports = SessionsService;
