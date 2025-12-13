const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('../utils/uuid'); // Use CommonJS wrapper for Jest compatibility
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const { logger } = require('../config/logger');
const { toSafeInteger, toSafeUuid } = require('../validators/type-coercion');

// JWT Configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_ACCESS_EXPIRY = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = '7d'; // 7 days

/**
 * TokenService - Manages JWT token lifecycle with refresh token rotation
 * Implements secure two-token pattern: short-lived access + long-lived refresh
 */
class TokenService {
  /**
   * Generate a new token pair (access + refresh)
   * @param {Object} user - User object with id, email, role
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async generateTokenPair(user, ipAddress = null, userAgent = null) {
    try {
      // Generate short-lived access token (15 minutes)
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          type: 'access',
        },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRY },
      );

      // Generate long-lived refresh token (7 days)
      const refreshTokenId = uuidv4();
      const refreshTokenValue = jwt.sign(
        {
          userId: user.id,
          tokenId: refreshTokenId,
          type: 'refresh',
        },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRY },
      );

      // Hash the refresh token before storing
      const tokenHash = await bcrypt.hash(refreshTokenValue, 10);

      // Store refresh token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await pool.query(
        `INSERT INTO refresh_tokens 
         (token_id, user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [refreshTokenId, user.id, tokenHash, expiresAt, ipAddress, userAgent],
      );

      logger.info('Token pair generated', {
        userId: user.id,
        tokenId: refreshTokenId,
        ipAddress,
      });

      return {
        accessToken,
        refreshToken: refreshTokenValue,
      };
    } catch (error) {
      logger.error('Error generating token pair', {
        error: error.message,
        userId: user.id,
      });
      throw error;
    }
  }

  /**
   * Refresh access token using valid refresh token
   * @param {string} refreshToken - The refresh token JWT
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async refreshAccessToken(refreshToken, ipAddress = null, userAgent = null) {
    try {
      // Verify and decode refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists and is valid in database
      // Join with roles table via users.role_id FK (one role per user)
      const result = await pool.query(
        `SELECT rt.*, u.email, u.first_name, u.last_name, r.name as role 
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE rt.token_id = $1 
         AND rt.revoked_at IS NULL 
         AND rt.expires_at > NOW()`,
        [decoded.tokenId],
      );

      if (result.rows.length === 0) {
        logger.warn('Refresh token not found or invalid', {
          tokenId: decoded.tokenId,
          userId: decoded.userId,
        });
        throw new Error('Invalid refresh token');
      }

      const storedToken = result.rows[0];

      // Verify token hash matches
      const isValid = await bcrypt.compare(
        refreshToken,
        storedToken.token_hash,
      );
      if (!isValid) {
        logger.error('Refresh token hash mismatch', {
          tokenId: decoded.tokenId,
          userId: decoded.userId,
        });
        throw new Error('Invalid refresh token');
      }

      // Update last used timestamp
      await pool.query(
        `UPDATE refresh_tokens 
         SET last_used_at = NOW()
         WHERE token_id = $1`,
        [decoded.tokenId],
      );

      // Generate new token pair (rotation strategy)
      const user = {
        id: decoded.userId,
        email: storedToken.email,
        role: storedToken.role,
      };

      const newTokenPair = await this.generateTokenPair(
        user,
        ipAddress,
        userAgent,
      );

      // Revoke old refresh token
      await this.revokeToken(decoded.tokenId, 'rotated');

      logger.info('Access token refreshed', {
        userId: decoded.userId,
        oldTokenId: decoded.tokenId,
        ipAddress,
      });

      return newTokenPair;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Expired refresh token used', { error: error.message });
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid refresh token format', { error: error.message });
        throw new Error('Invalid refresh token');
      }
      logger.error('Error refreshing token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   * @param {string} tokenId - UUID of the token to revoke (will be validated)
   * @param {string} reason - Reason for revocation (logout, security, rotated)
   * @returns {Promise<boolean>}
   * @throws {Error} If tokenId is not a valid UUID
   */
  async revokeToken(tokenId, reason = 'logout') {
    try {
      // TYPE SAFETY: Validate UUID format before query
      const safeTokenId = toSafeUuid(tokenId, 'tokenId', { allowNull: false });

      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW()
         WHERE token_id = $1 AND revoked_at IS NULL`,
        [safeTokenId],
      );

      const revoked = result.rowCount > 0;

      if (revoked) {
        logger.info('Refresh token revoked', { tokenId: safeTokenId, reason });
      }

      return revoked;
    } catch (error) {
      logger.error('Error revoking token', { error: error.message, tokenId });
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {number|string} userId - User ID (will be validated)
   * @param {string} reason - Reason for revocation
   * @returns {Promise<number>} - Number of tokens revoked
   * @throws {Error} If userId is invalid
   */
  async revokeAllUserTokens(userId, reason = 'logout_all') {
    try {
      // TYPE SAFETY: Validate userId before query
      const safeUserId = toSafeInteger(userId, 'userId', {
        min: 1,
        allowNull: false,
      });

      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [safeUserId],
      );

      logger.info('All user tokens revoked', {
        userId: safeUserId,
        reason,
        count: result.rowCount,
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Error revoking user tokens', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clean up expired and old revoked tokens
   * @returns {Promise<number>} - Number of tokens deleted
   */
  async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < NOW() - INTERVAL '30 days'
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')`,
      );

      if (result.rowCount > 0) {
        logger.info('Expired tokens cleaned up', { count: result.rowCount });
      }

      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active refresh tokens for a user
   * @param {number|string} userId - User ID (will be validated)
   * @returns {Promise<Array>}
   * @throws {Error} If userId is invalid
   */
  async getUserTokens(userId) {
    try {
      // TYPE SAFETY: Validate userId before query
      const safeUserId = toSafeInteger(userId, 'userId', {
        min: 1,
        allowNull: false,
      });

      const result = await pool.query(
        `SELECT token_id, created_at, last_used_at, expires_at, ip_address, user_agent
         FROM refresh_tokens
         WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [safeUserId],
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user tokens', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

module.exports = new TokenService();
