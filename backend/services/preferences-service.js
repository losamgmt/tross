/**
 * PreferencesService - User Preferences Management
 *
 * SRP: ONLY handles user preferences CRUD operations
 * - Get preferences for a user
 * - Create/initialize preferences for a user
 * - Update specific preference keys
 * - Validate preference values against schema
 *
 * DESIGN:
 * - 1:1 relationship with users via SHARED PRIMARY KEY pattern
 * - preferences.id = users.id (identifying relationship)
 * - JSONB storage for flexible schema evolution
 * - Application-level validation using preferenceSchema from metadata
 * - Automatic preference row creation on first access (upsert pattern)
 */

const { query: db } = require('../db/connection');
const { logger } = require('../config/logger');
const preferencesMetadata = require('../config/models/preferences-metadata');
const { toSafeInteger } = require('../validators/type-coercion');

/**
 * Default preference values
 * Applied when preferences row is created or when a key doesn't exist
 */
const DEFAULT_PREFERENCES = {
  theme: 'system',
  notificationsEnabled: true,
};

/**
 * Preference key validation schema
 * Defines valid types and values for each preference key
 */
const PREFERENCE_SCHEMA = preferencesMetadata.preferenceSchema;

class PreferencesService {
  /**
   * Get preferences for a user
   * Creates default preferences if none exist (upsert pattern)
   *
   * @param {number} userId - The user ID to get preferences for
   * @returns {Promise<Object>} The user's preferences
   */
  async getPreferences(userId) {
    const safeUserId = toSafeInteger(userId, 'userId');

    if (!safeUserId) {
      throw new Error('Valid userId is required');
    }

    // Try to get existing preferences (id = userId in shared PK pattern)
    const result = await db(
      `SELECT id, preferences, created_at, updated_at
       FROM preferences
       WHERE id = $1`,
      [safeUserId],
    );

    if (result.rows.length > 0) {
      // Merge with defaults to ensure all keys exist
      const storedPrefs = result.rows[0].preferences || {};
      return {
        ...result.rows[0],
        preferences: { ...DEFAULT_PREFERENCES, ...storedPrefs },
      };
    }

    // Create default preferences for user (upsert pattern)
    logger.info('Creating default preferences for user', { userId: safeUserId });
    return this.initializePreferences(safeUserId);
  }

  /**
   * Initialize preferences for a new user
   * Called automatically by getPreferences if none exist
   *
   * @param {number} userId - The user ID to initialize preferences for
   * @returns {Promise<Object>} The newly created preferences
   */
  async initializePreferences(userId) {
    const safeUserId = toSafeInteger(userId, 'userId');

    if (!safeUserId) {
      throw new Error('Valid userId is required');
    }

    // Shared PK: id = userId
    const result = await db(
      `INSERT INTO preferences (id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, preferences, created_at, updated_at`,
      [safeUserId, JSON.stringify(DEFAULT_PREFERENCES)],
    );

    return result.rows[0];
  }

  /**
   * Update one or more preference keys
   * Validates values against schema before updating
   *
   * @param {number} userId - The user ID to update preferences for
   * @param {Object} updates - Key-value pairs to update
   * @returns {Promise<Object>} The updated preferences
   */
  async updatePreferences(userId, updates) {
    const safeUserId = toSafeInteger(userId, 'userId');

    if (!safeUserId) {
      throw new Error('Valid userId is required');
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object');
    }

    // Validate each preference key and value
    const validationErrors = this.validatePreferences(updates);
    if (validationErrors.length > 0) {
      const error = new Error('Invalid preference values');
      error.validationErrors = validationErrors;
      throw error;
    }

    // Ensure preferences row exists
    await this.initializePreferences(safeUserId);

    // Update using JSONB merge (preserves existing keys not in updates)
    // Shared PK: id = userId
    const result = await db(
      `UPDATE preferences
       SET preferences = preferences || $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, preferences, created_at, updated_at`,
      [safeUserId, JSON.stringify(updates)],
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to update preferences');
    }

    logger.info('Preferences updated', {
      userId: safeUserId,
      updatedKeys: Object.keys(updates),
    });

    // Merge with defaults for response
    const storedPrefs = result.rows[0].preferences || {};
    return {
      ...result.rows[0],
      preferences: { ...DEFAULT_PREFERENCES, ...storedPrefs },
    };
  }

  /**
   * Update a single preference key
   * Convenience method for updating one key at a time
   *
   * @param {number} userId - The user ID
   * @param {string} key - The preference key to update
   * @param {*} value - The new value
   * @returns {Promise<Object>} The updated preferences
   */
  async updatePreference(userId, key, value) {
    return this.updatePreferences(userId, { [key]: value });
  }

  /**
   * Reset preferences to defaults for a user
   *
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} The reset preferences
   */
  async resetPreferences(userId) {
    const safeUserId = toSafeInteger(userId, 'userId');

    if (!safeUserId) {
      throw new Error('Valid userId is required');
    }

    // Shared PK: id = userId
    const result = await db(
      `UPDATE preferences
       SET preferences = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, preferences, created_at, updated_at`,
      [safeUserId, JSON.stringify(DEFAULT_PREFERENCES)],
    );

    if (result.rows.length === 0) {
      // User has no preferences row - create one
      return this.initializePreferences(safeUserId);
    }

    logger.info('Preferences reset to defaults', { userId: safeUserId });
    return result.rows[0];
  }

  /**
   * Validate preference values against the schema
   *
   * @param {Object} preferences - Key-value pairs to validate
   * @returns {Array<string>} Array of validation error messages (empty if valid)
   */
  validatePreferences(preferences) {
    const errors = [];

    for (const [key, value] of Object.entries(preferences)) {
      const schema = PREFERENCE_SCHEMA[key];

      if (!schema) {
        errors.push(`Unknown preference key: ${key}`);
        continue;
      }

      const keyError = this.validatePreferenceValue(key, value, schema);
      if (keyError) {
        errors.push(keyError);
      }
    }

    return errors;
  }

  /**
   * Validate a single preference value against its schema
   *
   * @param {string} key - The preference key
   * @param {*} value - The value to validate
   * @param {Object} schema - The schema definition for this key
   * @returns {string|null} Error message or null if valid
   */
  validatePreferenceValue(key, value, schema) {
    switch (schema.type) {
      case 'enum':
        if (!schema.values.includes(value)) {
          return `${key} must be one of: ${schema.values.join(', ')}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          return `${key} must be a string`;
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          return `${key} must be at most ${schema.maxLength} characters`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${key} must be a number`;
        }
        if (schema.min !== undefined && value < schema.min) {
          return `${key} must be at least ${schema.min}`;
        }
        if (schema.max !== undefined && value > schema.max) {
          return `${key} must be at most ${schema.max}`;
        }
        break;

      /* istanbul ignore next -- Defensive fallback for unknown type */
      default:
        // Unknown type - allow (for future extensibility)
        break;
    }

    return null;
  }

  /**
   * Get the preference schema
   * Useful for clients to know what preferences are available
   *
   * @returns {Object} The preference schema
   */
  getPreferenceSchema() {
    return { ...PREFERENCE_SCHEMA };
  }

  /**
   * Get default preference values
   *
   * @returns {Object} The default preferences
   */
  getDefaults() {
    return { ...DEFAULT_PREFERENCES };
  }
}

// Export singleton instance
module.exports = new PreferencesService();

// Also export class for testing
module.exports.PreferencesService = PreferencesService;

// Export constants for external use
module.exports.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
module.exports.PREFERENCE_SCHEMA = PREFERENCE_SCHEMA;
