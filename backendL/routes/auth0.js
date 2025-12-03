/**
 * Auth0 Authentication Routes
 *
 * ALWAYS uses Auth0Strategy - independent of AUTH_MODE.
 * This allows Auth0 login to work alongside dev auth.
 */
const express = require('express');
const _crypto = require('crypto');
const _User = require('../db/models/User');
const Auth0Strategy = require('../services/auth/Auth0Strategy');
const tokenService = require('../services/token-service');
const auditService = require('../services/audit-service');
const { HTTP_STATUS } = require('../config/constants');
const { logger } = require('../config/logger');
const { refreshLimiter } = require('../middleware/rate-limit');
const {
  validateAuthCallback,
  validateAuth0Token,
  validateAuth0Refresh,
} = require('../validators');

const router = express.Router();

// Create dedicated Auth0 strategy instance
const auth0Strategy = new Auth0Strategy();

/**
 * POST /api/auth0/callback
 * Exchange authorization code for tokens
 *
 * ALWAYS uses Auth0Strategy - works regardless of AUTH_MODE
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const tokens = await tokenService.generateTokenPair(
      authResult.user,
      ipAddress,
      userAgent,
    );

    // Log successful login
    await auditService.log({
      userId: authResult.user.id,
      action: 'login',
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });

    // Return tokens and user info to client
    res.json({
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await auditService.log({
      userId: null,
      action: 'login_failed',
      resourceType: 'auth',
      newValues: { email: req.body.email || 'unknown', reason: error.message },
      ipAddress,
      userAgent,
      result: 'failure',
      errorMessage: error.message,
    });

    res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth0/validate
 * Validate Auth0 ID token (for PKCE flow)
 *
 * ALWAYS uses Auth0Strategy - works regardless of AUTH_MODE
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

    res.json({
      token: result.token,
      app_token: result.token,
      user: result.user,
      provider: 'auth0',
    });
  } catch (error) {
    logger.error('🔐 Auth0 token validation failed', {
      error: error.message,
    });

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token validation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth0/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshLimiter, validateAuth0Refresh, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const result = await auth0Strategy.refreshToken(refresh_token);

    res.json({
      access_token: result.token,
      expires_in: result.expires_in,
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token refresh failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth0/logout
 * Get Auth0 logout URL
 */
router.get('/logout', async (req, res) => {
  try {
    const result = await auth0Strategy.logout();

    res.json({
      success: true,
      logout_url: result.logoutUrl,
      message: 'Redirect to logout_url to complete Auth0 logout',
    });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });

    res.status(HTTP_STATUS.SERVER_ERROR).json({
      error: 'Logout failed',
      message: error.message,
    });
  }
});

module.exports = router;
