/**
 * Development Authentication Routes
 *
 * ALWAYS uses DevAuthStrategy - independent of AUTH_MODE.
 * This allows dev login buttons to work alongside Auth0.
 */
const express = require('express');
const DevAuthStrategy = require('../services/auth/DevAuthStrategy');
// User model removed - not used in this file
const { ROLE_HIERARCHY } = require('../config/constants');
const ResponseFormatter = require('../utils/response-formatter');
const { asyncHandler } = require('../middleware/utils');
const AppError = require('../utils/app-error');

const router = express.Router();

// Create dedicated dev strategy instance
const devStrategy = new DevAuthStrategy();

/**
 * @openapi
 * /api/dev/token:
 *   get:
 *     tags: [Development]
 *     summary: Generate test token (any role)
 *     description: |
 *       Generate a JWT token for testing with any role.
 *       **DEVELOPMENT ONLY** - Always available regardless of AUTH_MODE.
 *       Token is valid for 24 hours.
 *
 *       Supports all roles: admin, manager, dispatcher, technician, customer.
 *       Defaults to technician if no role specified (backward compatible).
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, dispatcher, technician, customer]
 *         required: false
 *         description: Role for the test token (defaults to technician)
 *     responses:
 *       200:
 *         description: Test token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                   description: JWT token for Authorization header
 *                 user:
 *                   type: object
 *                   properties:
 *                     auth0_id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                 provider:
 *                   type: string
 *                   example: development
 *                 expires_in:
 *                   type: integer
 *                   description: Token validity in seconds
 *                 instructions:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid role specified
 */
router.get('/token', asyncHandler(async (req, res) => {
  // Get role from query param, default to technician (backward compatible)
  const requestedRole = req.query.role || 'technician';

  // Validate role using centralized ROLE_HIERARCHY (no hardcoding!)
  if (!ROLE_HIERARCHY.includes(requestedRole)) {
    throw new AppError(`Invalid role. Role must be one of: ${ROLE_HIERARCHY.join(', ')}`, 400, 'BAD_REQUEST');
  }

  // Use dev strategy directly - always works regardless of AUTH_MODE
  const { token, user } = await devStrategy.authenticate({
    role: requestedRole,
  });

  // Note: DevAuthStrategy already logs token generation

  return ResponseFormatter.success(res, {
    token,
    user: {
      auth0_id: user.auth0_id,
      email: user.email,
      name: user.first_name + ' ' + user.last_name,
      role: user.role,
    },
    provider: 'development',
    expires_in: 86400,
    instructions: 'Use this token in Authorization header: Bearer <token>',
  }, { message: 'Test token generated successfully' });
}));

/**
 * @openapi
 * /api/dev/status:
 *   get:
 *     tags: [Development]
 *     summary: Show development auth configuration
 *     description: |
 *       Displays current dev auth configuration and available endpoints.
 *       **ALWAYS AVAILABLE** - Works regardless of AUTH_MODE setting.
 *       Dev auth is designed to run alongside Auth0 for testing purposes.
 *     responses:
 *       200:
 *         description: Dev auth status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dev_auth_enabled:
 *                   type: boolean
 *                   example: true
 *                 provider:
 *                   type: string
 *                   example: development
 *                 message:
 *                   type: string
 *                 available_endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "GET /api/dev/token?role=<role> - Get test token"
 *                     - "GET /api/dev/status - This endpoint"
 *                 note:
 *                   type: string
 */
router.get('/status', (req, res) => {
  return ResponseFormatter.success(
    res,
    {
      dev_auth_enabled: true,
      provider: 'development',
      supported_roles: ROLE_HIERARCHY,
      available_endpoints: [
        `GET /api/dev/token?role=<role> - Get test token for any role (${ROLE_HIERARCHY.join(', ')})`,
        'GET /api/dev/status - This endpoint',
      ],
      note: 'Dev auth works alongside Auth0 - use for testing and internal users',
    },
    'Dev auth always available (independent of AUTH_MODE)',
  );
});

module.exports = router;
