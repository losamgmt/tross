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
 */
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const ResponseFormatter = require('../utils/response-formatter');
const {
  validatePreferencesUpdate,
  validateSinglePreferenceUpdate,
} = require('../validators/preferences-validators');
const { validateIdParam } = require('../validators');
const preferencesService = require('../services/preferences-service');
const { logger } = require('../config/logger');

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
  async (req, res) => {
    try {
      const userId = req.dbUser.id;

      // Dev users (id: null) get defaults from metadata - no DB access
      if (userId === null) {
        const preferencesMetadata = require('../config/models/preferences-metadata');
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
    } catch (error) {
      logger.error('Error retrieving preferences', {
        error: error.message,
        userId: req.dbUser?.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
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
  async (req, res) => {
    try {
      const userId = req.dbUser.id;
      const updates = req.body;

      // Note: Dev users are blocked at auth middleware (read-only)
      // This code only runs for Auth0-authenticated users

      const preferences = await preferencesService.updatePreferences(userId, updates);

      return ResponseFormatter.updated(res, preferences, 'Preferences updated successfully');
    } catch (error) {
      if (error.validationErrors) {
        return ResponseFormatter.badRequest(res, error.message, error.validationErrors);
      }

      logger.error('Error updating preferences', {
        error: error.message,
        userId: req.dbUser?.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
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
  async (req, res) => {
    try {
      const userId = req.dbUser.id;
      const { key } = req.params;
      const { value } = req.body;

      // Note: Dev users are blocked at auth middleware (read-only)
      // This code only runs for Auth0-authenticated users

      const preferences = await preferencesService.updatePreference(userId, key, value);

      return ResponseFormatter.updated(res, preferences, `Preference '${key}' updated successfully`);
    } catch (error) {
      if (error.validationErrors) {
        return ResponseFormatter.badRequest(res, error.message, error.validationErrors);
      }

      logger.error('Error updating single preference', {
        error: error.message,
        userId: req.dbUser?.id,
        key: req.params?.key,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
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
  async (req, res) => {
    try {
      const userId = req.dbUser.id;

      const preferences = await preferencesService.resetPreferences(userId);

      return ResponseFormatter.updated(res, preferences, 'Preferences reset to defaults');
    } catch (error) {
      logger.error('Error resetting preferences', {
        error: error.message,
        userId: req.dbUser?.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
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
  async (req, res) => {
    try {
      const schema = preferencesService.getPreferenceSchema();
      const defaults = preferencesService.getDefaults();

      return ResponseFormatter.get(res, {
        schema,
        defaults,
      });
    } catch (error) {
      logger.error('Error retrieving preference schema', { error: error.message });
      return ResponseFormatter.internalError(res, error);
    }
  },
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
  requirePermission('preferences', 'admin'),
  validateIdParam({ paramName: 'userId' }),
  async (req, res) => {
    try {
      const { userId } = req.params;

      const preferences = await preferencesService.getPreferences(parseInt(userId, 10));

      return ResponseFormatter.get(res, preferences);
    } catch (error) {
      logger.error('Error retrieving user preferences', {
        error: error.message,
        targetUserId: req.params?.userId,
        adminUserId: req.dbUser?.id,
      });
      return ResponseFormatter.internalError(res, error);
    }
  },
);

module.exports = router;
