// Clean authentication routes
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { refreshLimiter } = require('../middleware/rate-limit');
const User = require('../db/models/User');
const _Role = require('../db/models/Role');
const _userDataService = require('../services/user-data');
const _crypto = require('crypto');
const tokenService = require('../services/token-service');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const {
  validateProfileUpdate,
  validateRefreshToken,
} = require('../validators/body-validators');
const { logger } = require('../config/logger');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');

const router = express.Router();

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information. Auto-creates user in database if first time.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // req.dbUser is already populated by authenticateToken middleware
    const user = req.dbUser;

    // Format user data for frontend
    const formattedUser = {
      ...user,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
    };

    res.json({
      success: true,
      data: formattedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting user profile', {
      error: error.message,
      userId: req.user?.userId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to get user profile',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   put:
 *     tags: [Authentication]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile (first name, last name only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - No valid fields to update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put(
  '/me',
  authenticateToken,
  validateProfileUpdate,
  async (req, res) => {
    try {
      const dbUser = await User.findByAuth0Id(req.user.sub);
      if (!dbUser) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'User not found',
          message: 'User profile not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Only allow updating certain fields
      const allowedUpdates = ['first_name', 'last_name'];
      const updates = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No valid fields to update',
          timestamp: new Date().toISOString(),
        });
      }

      await User.update(dbUser.id, updates);
      const updatedUser = await User.findByAuth0Id(req.user.sub);

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating user profile', {
        error: error.message,
        userId: req.user?.userId,
      });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update user profile',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Exchange a refresh token for a new access token pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: New token pair generated
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
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - Refresh token required or invalid
 *       401:
 *         description: Token expired
 */
router.post(
  '/refresh',
  refreshLimiter,
  validateRefreshToken,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // Generate new token pair
      const tokens = await tokenService.refreshAccessToken(
        refreshToken,
        ipAddress,
        userAgent,
      );

      // Log the refresh
      const decoded = require('jsonwebtoken').decode(refreshToken);
      await auditService.log({
        userId: decoded.userId,
        action: 'token_refresh',
        resourceType: 'auth',
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        data: tokens,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error refreshing token', {
        error: error.message,
        userId: req.user?.userId,
      });

      // Return appropriate error based on failure reason
      const status = error.message.includes('expired')
        ? HTTP_STATUS.UNAUTHORIZED
        : HTTP_STATUS.BAD_REQUEST;

      res.status(status).json({
        error: error.message.includes('expired')
          ? 'Token Expired'
          : 'Invalid Token',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from current session
 *     description: Revoke refresh token and log out from current device
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to revoke
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (refreshToken) {
      const decoded = require('jsonwebtoken').decode(refreshToken);
      if (decoded && decoded.tokenId) {
        await tokenService.revokeToken(decoded.tokenId, 'logout');
      }
    }

    // Get userId safely - handles both Auth0 (has userId) and dev (uses sub)
    const userId = req.user.userId || req.dbUser?.id || req.user.sub;

    // Log the logout
    await auditService.log({
      userId, // Now handles null safely for dev users
      action: 'logout',
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error during logout', {
      error: error.message,
      userId: req.user?.userId || req.user?.sub,
      tokenId: req.user?.tokenId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to logout',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for the authenticated user across all devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Logged out from 3 device(s)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokensRevoked:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const count = await tokenService.revokeAllUserTokens(
      req.user.userId,
      'logout_all',
    );
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await auditService.log({
      userId: req.user.userId,
      action: 'logout_all_devices',
      resourceType: 'auth',
      newValues: { tokensRevoked: count },
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json({
      success: true,
      message: `Logged out from ${count} device(s)`,
      data: { tokensRevoked: count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error during logout-all', {
      error: error.message,
      userId: req.user?.userId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to logout from all devices',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @openapi
 * /api/auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: Get active sessions
 *     description: Returns all active sessions (refresh tokens) for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved
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
 *                     $ref: '#/components/schemas/Session'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const tokens = await tokenService.getUserTokens(req.user.userId);

    // Format for frontend (hide sensitive data)
    const sessions = tokens.map((t) => ({
      id: t.token_id,
      createdAt: t.created_at,
      lastUsedAt: t.last_used_at,
      expiresAt: t.expires_at,
      ipAddress: t.ip_address,
      userAgent: t.user_agent,
      isCurrent: false, // Frontend can determine this by comparing creation time
    }));

    res.json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting sessions', {
      error: error.message,
      userId: req.user?.userId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to get active sessions',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
