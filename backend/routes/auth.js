// Clean authentication routes
const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { attachEntity } = require("../middleware/generic-entity");
const { refreshLimiter } = require("../middleware/rate-limit");
const ResponseFormatter = require("../utils/response-formatter");
// User model removed - using GenericEntityService (strangler-fig Phase 4)
const tokenService = require("../services/token-service");
const auditService = require("../services/audit-service");
const {
  AuditActions,
  ResourceTypes,
  AuditResults,
} = require("../services/audit-constants");
const {
  validateProfileUpdate,
  validateRefreshToken,
} = require("../validators/body-validators");
const { validateIdParam } = require("../validators");
const { logger } = require("../config/logger");
const { getClientIp, getUserAgent } = require("../utils/request-helpers");
const { asyncHandler } = require("../middleware/utils");
const GenericEntityService = require("../services/generic-entity-service");
const AppError = require("../utils/app-error");

const router = express.Router();

/**
 * NOTE: Customer signup handled by Auth0 → /api/auth0/callback
 * This project uses Auth0 for authentication - no password-based signup endpoint needed
 * Users are created automatically during Auth0 callback with auth0_id
 * Customer/technician profiles are linked via polymorphic foreign keys:
 *   - users.customer_profile_id → customers(id)
 *   - users.technician_profile_id → technicians(id)
 */

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information. Auto-creates user in database if first time.
 *     security:
 *       - BearerAuth: []
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
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    // req.dbUser is already populated by authenticateToken middleware
    // with normalized role fields (role, role_priority, role_name)
    const user = req.dbUser;

    // Format user data for frontend with consistent field names
    const formattedUser = {
      ...user,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User",
      // Ensure role fields are present (normalize from JOIN field names)
      role: user.role || user.role_name,
      role_priority: user.role_priority,
    };

    return ResponseFormatter.get(res, formattedUser);
  }),
);

/**
 * @openapi
 * /api/auth/me:
 *   put:
 *     tags: [Authentication]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile (first name, last name only)
 *     security:
 *       - BearerAuth: []
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
  "/me",
  authenticateToken,
  validateProfileUpdate,
  asyncHandler(async (req, res) => {
    // Use GenericEntityService instead of User.findByAuth0Id
    const dbUser = await GenericEntityService.findByField(
      "user",
      "auth0_id",
      req.user.sub,
    );
    if (!dbUser) {
      throw new AppError(
        `User not found for Auth0 ID: ${req.user.sub}`,
        404,
        "NOT_FOUND",
      );
    }

    // Only allow updating certain fields
    const allowedUpdates = ["first_name", "last_name"];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError("No valid fields to update", 400, "BAD_REQUEST");
    }

    // Use GenericEntityService instead of User.update
    const updatedUser = await GenericEntityService.update(
      "user",
      dbUser.id,
      updates,
    );

    return ResponseFormatter.updated(
      res,
      updatedUser,
      "Profile updated successfully",
    );
  }),
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
  "/refresh",
  refreshLimiter,
  validateRefreshToken,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Generate new token pair (throws on error - global handler catches)
    const tokens = await tokenService.refreshAccessToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Log the refresh
    const decoded = jwt.decode(refreshToken);
    await auditService.log({
      userId: decoded.userId,
      action: AuditActions.TOKEN_REFRESH,
      resourceType: ResourceTypes.AUTH,
      ipAddress,
      userAgent,
    });

    return ResponseFormatter.get(res, tokens);
  }),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from current session
 *     description: Revoke refresh token and log out from current device
 *     security:
 *       - BearerAuth: []
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
router.post(
  "/logout",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.tokenId) {
        await tokenService.revokeToken(decoded.tokenId, "logout");
      }
    }

    // Get userId safely - handles both Auth0 (has userId) and dev (uses sub)
    const userId = req.user.userId || req.dbUser?.id || req.user.sub;

    // Log the logout
    await auditService.log({
      userId, // Now handles null safely for dev users
      action: AuditActions.LOGOUT,
      resourceType: ResourceTypes.AUTH,
      ipAddress,
      userAgent,
    });

    return ResponseFormatter.deleted(res, "Logged out successfully");
  }),
);

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for the authenticated user across all devices
 *     security:
 *       - BearerAuth: []
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
router.post(
  "/logout-all",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const count = await tokenService.revokeAllUserTokens(
      req.user.userId,
      "logout_all",
    );
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await auditService.log({
      userId: req.user.userId,
      action: AuditActions.LOGOUT_ALL_DEVICES,
      resourceType: ResourceTypes.AUTH,
      newValues: { tokensRevoked: count },
      ipAddress,
      userAgent,
      result: AuditResults.SUCCESS,
    });

    return ResponseFormatter.updated(
      res,
      { tokensRevoked: count },
      `Logged out from ${count} device(s)`,
    );
  }),
);

/**
 * @openapi
 * /api/auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: Get active sessions
 *     description: Returns all active sessions (refresh tokens) for the authenticated user
 *     security:
 *       - BearerAuth: []
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
router.get(
  "/sessions",
  authenticateToken,
  asyncHandler(async (req, res) => {
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

    return ResponseFormatter.get(res, sessions);
  }),
);

/**
 * @openapi
 * /api/auth/admin/revoke-user-sessions/{userId}:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke all sessions for a specific user (Admin only)
 *     description: |
 *       Immediately invalidates all refresh tokens for the specified user.
 *       Use this when a user account is compromised or needs to be force-logged out.
 *       Requires 'users:delete' permission (admin only).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user whose sessions to revoke
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for revoking sessions (for audit log)
 *                 example: "Account compromised"
 *     responses:
 *       200:
 *         description: Sessions revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Revoked 3 session(s) for user 42"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionsRevoked:
 *                       type: integer
 *                     targetUserId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.post(
  "/admin/revoke-user-sessions/:userId",
  authenticateToken,
  attachEntity("user"),
  requirePermission("delete"),
  validateIdParam({ paramName: "userId" }),
  asyncHandler(async (req, res) => {
    const targetUserId = req.validated.userId;
    const reason = req.body?.reason || "admin_revocation";

    // Verify target user exists
    const targetUser = await GenericEntityService.findById(
      "user",
      targetUserId,
    );
    if (!targetUser) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    // Revoke all tokens for the target user
    const count = await tokenService.revokeAllUserTokens(targetUserId, reason);

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Audit log for security tracking
    await auditService.log({
      userId: req.dbUser.id,
      action: AuditActions.ADMIN_REVOKE_SESSIONS,
      resourceType: ResourceTypes.USER,
      resourceId: targetUserId,
      newValues: {
        sessionsRevoked: count,
        reason,
        targetUserEmail: targetUser.email,
      },
      ipAddress,
      userAgent,
      result: AuditResults.SUCCESS,
    });

    logger.info("Admin revoked user sessions", {
      adminId: req.dbUser.id,
      targetUserId,
      sessionsRevoked: count,
      reason,
    });

    return ResponseFormatter.updated(
      res,
      { sessionsRevoked: count, targetUserId },
      `Revoked ${count} session(s) for user ${targetUserId}`,
    );
  }),
);

module.exports = router;
