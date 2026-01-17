/**
 * User Preferences Routes
 * RESTful API for user preferences management
 *
 * DESIGN:
 * - All endpoints require authentication
 * - Users can only access their own preferences (RLS enforced)
 * - Admins can access any user's preferences
 *
 * ENDPOINTS:
 * - GET    /api/preferences           - Get current user's preferences
 * - PUT    /api/preferences           - Update multiple preferences
 * - PUT    /api/preferences/:key      - Update single preference
 * - POST   /api/preferences/reset     - Reset preferences to defaults
 * - GET    /api/preferences/schema    - Get preference schema (public)
 *
 * ADMIN ENDPOINTS:
 * - GET    /api/preferences/user/:userId - Get any user's preferences
 *
 * UNIFIED DATA FLOW:
 * - requirePermission(operation) reads resource from req.entityMetadata.rlsResource
 * - attachEntity middleware sets req.entityMetadata at factory time
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { attachEntity } = require('../middleware/generic-entity');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validatePreferencesUpdate,
  validateSinglePreferenceUpdate,
} = require('../validators/preferences-validators');
const { validateIdParam } = require('../validators');
const preferencesService = require('../services/preferences-service');
const preferencesMetadata = require('../config/models/preferences-metadata');
const { asyncHandler } = require('../middleware/utils');

const router = express.Router();

/**
 * @openapi
 * /api/preferences:
 *   get:
 *     tags: [Preferences]
 *     summary: Get current user's preferences
 *     description: |
 *       Retrieve the authenticated user's preferences.
 *       Creates default preferences if none exist.
 *       Uses shared PK pattern: preferences.id = users.id
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, description: "Same as user ID (shared PK)" }
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         theme: { type: string, enum: [system, light, dark] }
 *                         notificationsEnabled: { type: boolean }
 *                     created_at: { type: string, format: date-time }
 *                     updated_at: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.dbUser.id;

    // Dev users (id: null) get defaults from metadata - no DB access
    if (userId === null) {
      const schema = preferencesMetadata.preferenceSchema;

      // Build defaults from schema
      const defaultPreferences = {};
      for (const [key, config] of Object.entries(schema)) {
        defaultPreferences[key] = config.default;
      }

      // Shared PK pattern: id = userId, no separate user_id field
      return ResponseFormatter.get(res, {
        id: null,
        preferences: defaultPreferences,
        created_at: null,
        updated_at: null,
      });
    }

    const preferences = await preferencesService.getPreferences(userId);

    return ResponseFormatter.get(res, preferences);
  }),
);

/**
 * @openapi
 * /api/preferences:
 *   put:
 *     tags: [Preferences]
 *     summary: Update user preferences
 *     description: |
 *       Update one or more preferences for the authenticated user.
 *       Only known preference keys are accepted.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [system, light, dark]
 *               notificationsEnabled:
 *                 type: boolean
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid preference key or value
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/',
  authenticateToken,
  validatePreferencesUpdate,
  asyncHandler(async (req, res) => {
    const userId = req.dbUser.id;
    const updates = req.body;

    // Note: Dev users are blocked at auth middleware (read-only)
    // This code only runs for Auth0-authenticated users

    const preferences = await preferencesService.updatePreferences(userId, updates);

    return ResponseFormatter.updated(res, preferences, 'Preferences updated successfully');
  }),
);

/**
 * @openapi
 * /api/preferences/{key}:
 *   put:
 *     tags: [Preferences]
 *     summary: Update single preference
 *     description: Update a single preference by key
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [theme, notificationsEnabled]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: boolean
 *     responses:
 *       200:
 *         description: Preference updated successfully
 *       400:
 *         description: Invalid preference key or value
 */
router.put(
  '/:key',
  authenticateToken,
  validateSinglePreferenceUpdate,
  asyncHandler(async (req, res) => {
    const userId = req.dbUser.id;
    const { key } = req.params;
    const { value } = req.body;

    // Note: Dev users are blocked at auth middleware (read-only)
    // This code only runs for Auth0-authenticated users

    const preferences = await preferencesService.updatePreference(userId, key, value);

    return ResponseFormatter.updated(res, preferences, `Preference '${key}' updated successfully`);
  }),
);

/**
 * @openapi
 * /api/preferences/reset:
 *   post:
 *     tags: [Preferences]
 *     summary: Reset preferences to defaults
 *     description: Reset all preferences to their default values
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/reset',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.dbUser.id;

    const preferences = await preferencesService.resetPreferences(userId);

    return ResponseFormatter.updated(res, preferences, 'Preferences reset to defaults');
  }),
);

/**
 * @openapi
 * /api/preferences/schema:
 *   get:
 *     tags: [Preferences]
 *     summary: Get preference schema
 *     description: |
 *       Get the schema defining available preferences.
 *       Useful for clients to know what preferences exist and their types.
 *     responses:
 *       200:
 *         description: Schema retrieved successfully
 */
router.get(
  '/schema',
  asyncHandler(async (req, res) => {
    const schema = preferencesService.getPreferenceSchema();
    const defaults = preferencesService.getDefaults();

    return ResponseFormatter.get(res, {
      schema,
      defaults,
    });
  }),
);

/**
 * @openapi
 * /api/preferences/user/{userId}:
 *   get:
 *     tags: [Preferences]
 *     summary: Get user preferences by user ID (Admin only)
 *     description: Admin endpoint to view any user's preferences
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.get(
  '/user/:userId',
  authenticateToken,
  attachEntity('preferences'),
  requirePermission('admin'),
  validateIdParam({ paramName: 'userId' }),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const preferences = await preferencesService.getPreferences(parseInt(userId, 10));

    return ResponseFormatter.get(res, preferences);
  }),
);

module.exports = router;
