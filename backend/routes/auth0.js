/**
 * Auth0 Authentication Routes
 *
 * ALWAYS uses Auth0Strategy - independent of AUTH_MODE.
 * This allows Auth0 login to work alongside dev auth.
 */
const express = require('express');
// crypto and User model removed - not used in this file
const ResponseFormatter = require('../utils/response-formatter');
const Auth0Strategy = require('../services/auth/Auth0Strategy');
const tokenService = require('../services/token-service');
const auditService = require('../services/audit-service');
const { AuditActions, ResourceTypes, AuditResults } = require('../services/audit-constants');
const { logger } = require('../config/logger');
const { refreshLimiter } = require('../middleware/rate-limit');
const { getClientIp, getUserAgent } = require('../utils/request-helpers');
const { asyncHandler } = require('../middleware/utils');
const {
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
} = require('../validators');

const router = express.Router();

// Create dedicated Auth0 strategy instance
const auth0Strategy = new Auth0Strategy();

/**
 * @openapi
 * /api/auth0/callback:
 *   post:
 *     tags: [Auth0]
 *     summary: Exchange Auth0 authorization code for tokens
 *     description: |
 *       OAuth2 callback endpoint for authorization code flow.
 *       ALWAYS uses Auth0Strategy - works regardless of AUTH_MODE.
 *       Exchanges authorization code for access/refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Auth0
 *               redirect_uri:
 *                 type: string
 *                 description: Redirect URI (must match Auth0 config)
 *                 default: http://localhost:8080/callback
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: JWT access token
 *                 refresh_token:
 *                   type: string
 *                   description: Refresh token for token renewal
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 provider:
 *                   type: string
 *                   example: auth0
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/callback', validateAuthCallback, async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    logger.info('🔐 Auth0 callback: Exchanging authorization code for tokens');

    // Use Auth0 strategy directly - always works regardless of AUTH_MODE
    const authResult = await auth0Strategy.authenticate({
      code,
      redirect_uri: redirect_uri || 'http://localhost:8080/callback',
    });

    logger.info('🔐 Auth0 authentication successful', {
      userId: authResult.user.id,
      email: authResult.user.email,
      role: authResult.user.role,
    });

    // Generate refresh token pair
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const tokens = await tokenService.generateTokenPair(
      authResult.user,
      ipAddress,
      userAgent,
      'auth0',
      authResult.auth0Id, // Pass auth0Id explicitly (user object has it filtered out)
    );

    // Log successful login
    await auditService.log({
      userId: authResult.user.id,
      action: AuditActions.LOGIN,
      resourceType: ResourceTypes.AUTH,
      ipAddress,
      userAgent,
    });

    // Return tokens and user info to client
    return ResponseFormatter.get(res, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: authResult.user,
      provider: 'auth0',
    });
  } catch (error) {
    logger.error('🔐 Auth0 callback failed', {
      error: error.message,
      stack: error.stack,
    });

    // Log failed login attempt
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    await auditService.log({
      userId: null,
      action: AuditActions.LOGIN_FAILED,
      resourceType: ResourceTypes.AUTH,
      newValues: { email: req.body.email || 'unknown', reason: error.message },
      ipAddress,
      userAgent,
      result: AuditResults.FAILURE,
      errorMessage: error.message,
    });

    return ResponseFormatter.unauthorized(res, error.message);
  }
});

/**
 * @openapi
 * /api/auth0/validate:
 *   post:
 *     tags: [Auth0]
 *     summary: Validate Auth0 ID token (PKCE flow)
 *     description: |
 *       Validates Auth0 ID token from PKCE flow, generates app token,
 *       and creates a refresh token stored in the database for session management.
 *       ALWAYS uses Auth0Strategy - works regardless of AUTH_MODE.
 *       Used by frontend after successful PKCE authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_token
 *             properties:
 *               id_token:
 *                 type: string
 *                 description: Auth0 ID token from PKCE flow
 *     responses:
 *       200:
 *         description: Token validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: App JWT access token (15 min expiry)
 *                 app_token:
 *                   type: string
 *                   description: App JWT access token (alias)
 *                 refresh_token:
 *                   type: string
 *                   description: Refresh token for session renewal (7 day expiry)
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 provider:
 *                   type: string
 *                   example: auth0
 *       401:
 *         description: Token validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/validate', validateAuth0Token, async (req, res) => {
  try {
    // Extract ID token from request body (frontend sends it there)
    const { id_token } = req.body;

    // Use Auth0 strategy to validate ID token and generate app token
    const result = await auth0Strategy.validateIdToken(id_token);

    logger.info('🔐 Auth0: User authenticated', {
      userId: result.user.id,
      email: result.user.email,
    });

    // Generate refresh token pair and store in database
    // This enables server-side session management (revocation, logout-all, etc.)
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const tokens = await tokenService.generateTokenPair(
      result.user,
      ipAddress,
      userAgent,
      'auth0',
      result.auth0Id, // Pass auth0Id explicitly (user object has it filtered out)
    );

    // Log successful login
    await auditService.log({
      userId: result.user.id,
      action: AuditActions.LOGIN,
      resourceType: ResourceTypes.AUTH,
      newValues: { provider: 'auth0', method: 'validate' },
      ipAddress,
      userAgent,
      result: AuditResults.SUCCESS,
    });

    return ResponseFormatter.get(res, {
      token: tokens.accessToken,
      app_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: result.user,
      provider: 'auth0',
    });
  } catch (error) {
    logger.error('🔐 Auth0 token validation failed', {
      error: error.message,
    });

    return ResponseFormatter.unauthorized(res, error.message);
  }
});

/**
 * @openapi
 * /api/auth0/refresh:
 *   post:
 *     tags: [Auth0]
 *     summary: Refresh access token
 *     description: Refresh expired access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: New JWT access token
 *                 expires_in:
 *                   type: integer
 *                   description: Token expiration time in seconds
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refreshLimiter, validateAuth0Refresh, asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  const result = await auth0Strategy.refreshToken(refresh_token);

  return ResponseFormatter.get(res, {
    access_token: result.token,
    expires_in: result.expires_in,
  });
}));

/**
 * @openapi
 * /api/auth0/logout:
 *   get:
 *     tags: [Auth0]
 *     summary: Get Auth0 logout URL
 *     description: Returns Auth0 logout URL for client-side redirect
 *     responses:
 *       200:
 *         description: Logout URL retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logout_url:
 *                   type: string
 *                   description: Auth0 logout URL
 *                 message:
 *                   type: string
 *       500:
 *         description: Logout failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/logout', asyncHandler(async (req, res) => {
  const result = await auth0Strategy.logout();

  ResponseFormatter.success(
    res,
    { logout_url: result.logoutUrl },
    { message: 'Redirect to logout_url to complete Auth0 logout' },
  );
}));

module.exports = router;
