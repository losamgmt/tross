/**
 * Unit Tests for services/preferences-service.js
 *
 * Tests preferences service functionality with mocked database.
 * Follows AAA pattern (Arrange, Act, Assert) and DRY principles.
 *
 * DESIGN: Uses shared PK pattern - id = userId (no separate user_id column)
 *
 * Test Coverage:
 * - getPreferences() - fetch and auto-create
 * - initializePreferences() - create default preferences
 * - updatePreferences() - update multiple keys
 * - updatePreference() - update single key
 * - resetPreferences() - reset to defaults
 * - validatePreferences() - validation logic
 */

// Mock dependencies BEFORE requiring the module
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const db = require('../../../db/connection');
const { logger } = require('../../../config/logger');
const preferencesService = require('../../../services/preferences-service');
const { DEFAULT_PREFERENCES, PREFERENCE_SCHEMA } = require('../../../services/preferences-service');

describe('services/preferences-service.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
  });

  describe('getPreferences()', () => {
    test('should return existing preferences merged with defaults', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockPrefs = {
        id: 42,
        preferences: { theme: 'dark' }, // Only theme set
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query.mockResolvedValueOnce({ rows: [mockPrefs] });

      // Act
      const result = await preferencesService.getPreferences(42);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [42]
      );
      expect(result.preferences).toEqual({
        theme: 'dark',
        notificationsEnabled: true, // Default merged in
      });
    });

    test('should create default preferences if none exist', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockNewPrefs = {
        id: 42,
        preferences: DEFAULT_PREFERENCES,
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT returns nothing
        .mockResolvedValueOnce({ rows: [mockNewPrefs] }); // INSERT returns new row

      // Act
      const result = await preferencesService.getPreferences(42);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'Creating default preferences for user',
        { userId: 42 }
      );
      expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    test('should throw error for invalid userId', async () => {
      // Act & Assert
      await expect(preferencesService.getPreferences(null)).rejects.toThrow(
        'userId is required'
      );
      await expect(preferencesService.getPreferences('invalid')).rejects.toThrow(
        'userId must be a valid integer'
      );
    });
  });

  describe('initializePreferences()', () => {
    test('should create preferences with defaults using UPSERT', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockPrefs = {
        id: 42,
        preferences: DEFAULT_PREFERENCES,
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query.mockResolvedValueOnce({ rows: [mockPrefs] });

      // Act
      const result = await preferencesService.initializePreferences(42);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [42, JSON.stringify(DEFAULT_PREFERENCES)]
      );
      expect(result).toEqual(mockPrefs);
    });

    test('should throw error for invalid userId', async () => {
      await expect(preferencesService.initializePreferences(null)).rejects.toThrow(
        'userId is required'
      );
    });
  });

  describe('updatePreferences()', () => {
    test('should update multiple preferences using JSONB merge', async () => {
      // Arrange - id = userId in shared PK pattern
      const updates = { theme: 'light', notificationsEnabled: false };
      const mockUpdated = {
        id: 42,
        preferences: updates,
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdated] }) // initializePreferences
        .mockResolvedValueOnce({ rows: [mockUpdated] }); // UPDATE

      // Act
      const result = await preferencesService.updatePreferences(42, updates);

      // Assert
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining('preferences || $2::jsonb'),
        [42, JSON.stringify(updates)]
      );
      expect(logger.info).toHaveBeenCalledWith('Preferences updated', {
        userId: 42,
        updatedKeys: ['theme', 'notificationsEnabled'],
      });
    });

    test('should throw error for invalid preference values', async () => {
      // Arrange
      const invalidUpdates = { theme: 'invalid-theme' };

      // Act & Assert
      await expect(
        preferencesService.updatePreferences(42, invalidUpdates)
      ).rejects.toMatchObject({
        message: 'Invalid preference values',
        validationErrors: expect.arrayContaining([
          expect.stringContaining('theme must be one of'),
        ]),
      });
    });

    test('should throw error for unknown preference keys', async () => {
      // Arrange
      const unknownKey = { unknownPref: 'value' };

      // Act & Assert
      await expect(
        preferencesService.updatePreferences(42, unknownKey)
      ).rejects.toMatchObject({
        validationErrors: expect.arrayContaining([
          expect.stringContaining('Unknown preference key'),
        ]),
      });
    });

    test('should throw error for non-object updates', async () => {
      await expect(
        preferencesService.updatePreferences(42, 'not-an-object')
      ).rejects.toThrow('Updates must be an object');
    });
  });

  describe('updatePreference()', () => {
    test('should update single preference key', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockUpdated = {
        id: 42,
        preferences: { theme: 'dark', notificationsEnabled: true },
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query
        .mockResolvedValueOnce({ rows: [mockUpdated] }) // initializePreferences
        .mockResolvedValueOnce({ rows: [mockUpdated] }); // UPDATE

      // Act
      const result = await preferencesService.updatePreference(42, 'theme', 'dark');

      // Assert
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining('preferences || $2::jsonb'),
        [42, JSON.stringify({ theme: 'dark' })]
      );
    });
  });

  describe('resetPreferences()', () => {
    test('should reset preferences to defaults', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockReset = {
        id: 42,
        preferences: DEFAULT_PREFERENCES,
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query.mockResolvedValueOnce({ rows: [mockReset] });

      // Act
      const result = await preferencesService.resetPreferences(42);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SET preferences = $2::jsonb'),
        [42, JSON.stringify(DEFAULT_PREFERENCES)]
      );
      expect(logger.info).toHaveBeenCalledWith('Preferences reset to defaults', {
        userId: 42,
      });
      expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    test('should create preferences if user has none when resetting', async () => {
      // Arrange - id = userId in shared PK pattern
      const mockCreated = {
        id: 42,
        preferences: DEFAULT_PREFERENCES,
        created_at: new Date(),
        updated_at: new Date(),
      };
      db.query
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns nothing
        .mockResolvedValueOnce({ rows: [mockCreated] }); // initializePreferences

      // Act
      const result = await preferencesService.resetPreferences(42);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('validatePreferences()', () => {
    test('should return empty array for valid preferences', () => {
      // Arrange
      const validPrefs = { theme: 'dark', notificationsEnabled: false };

      // Act
      const errors = preferencesService.validatePreferences(validPrefs);

      // Assert
      expect(errors).toEqual([]);
    });

    test('should return error for invalid enum value', () => {
      // Arrange
      const invalidPrefs = { theme: 'blue' };

      // Act
      const errors = preferencesService.validatePreferences(invalidPrefs);

      // Assert
      expect(errors).toContainEqual(
        expect.stringContaining('theme must be one of')
      );
    });

    test('should return error for invalid boolean type', () => {
      // Arrange
      const invalidPrefs = { notificationsEnabled: 'yes' };

      // Act
      const errors = preferencesService.validatePreferences(invalidPrefs);

      // Assert
      expect(errors).toContainEqual(
        expect.stringContaining('notificationsEnabled must be a boolean')
      );
    });

    test('should return error for unknown preference key', () => {
      // Arrange
      const unknownPrefs = { unknownKey: 'value' };

      // Act
      const errors = preferencesService.validatePreferences(unknownPrefs);

      // Assert
      expect(errors).toContainEqual(
        expect.stringContaining('Unknown preference key: unknownKey')
      );
    });

    // String type validation tests (timezone preference)
    test('should validate string preference type', () => {
      const validPrefs = { timezone: 'America/Los_Angeles' };
      const errors = preferencesService.validatePreferences(validPrefs);
      expect(errors).toEqual([]);
    });

    test('should return error for non-string value on string preference', () => {
      const invalidPrefs = { timezone: 12345 };
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('timezone must be a string')
      );
    });

    test('should return error for string exceeding maxLength', () => {
      const invalidPrefs = { timezone: 'A'.repeat(100) }; // Over 50 chars
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('timezone must be at most 50 characters')
      );
    });

    // Number type validation tests (autoRefreshInterval preference)
    test('should validate number preference type', () => {
      const validPrefs = { autoRefreshInterval: 60 };
      const errors = preferencesService.validatePreferences(validPrefs);
      expect(errors).toEqual([]);
    });

    test('should return error for non-number value on number preference', () => {
      const invalidPrefs = { autoRefreshInterval: 'fast' };
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('autoRefreshInterval must be a number')
      );
    });

    test('should return error for NaN on number preference', () => {
      const invalidPrefs = { autoRefreshInterval: NaN };
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('autoRefreshInterval must be a number')
      );
    });

    test('should return error for number below min', () => {
      const invalidPrefs = { autoRefreshInterval: -5 }; // min is 0
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('autoRefreshInterval must be at least 0')
      );
    });

    test('should return error for number above max', () => {
      const invalidPrefs = { autoRefreshInterval: 500 }; // max is 300
      const errors = preferencesService.validatePreferences(invalidPrefs);
      expect(errors).toContainEqual(
        expect.stringContaining('autoRefreshInterval must be at most 300')
      );
    });

    test('should accept number at min boundary', () => {
      const validPrefs = { autoRefreshInterval: 0 }; // min is 0
      const errors = preferencesService.validatePreferences(validPrefs);
      expect(errors).toEqual([]);
    });

    test('should accept number at max boundary', () => {
      const validPrefs = { autoRefreshInterval: 300 }; // max is 300
      const errors = preferencesService.validatePreferences(validPrefs);
      expect(errors).toEqual([]);
    });

    test('should validate multiple preference types in one call', () => {
      const validPrefs = {
        theme: 'dark',
        notificationsEnabled: true,
        timezone: 'Europe/London',
        autoRefreshInterval: 120,
      };
      const errors = preferencesService.validatePreferences(validPrefs);
      expect(errors).toEqual([]);
    });
  });

  describe('getPreferenceSchema()', () => {
    test('should return a copy of the preference schema', () => {
      // Act
      const schema = preferencesService.getPreferenceSchema();

      // Assert
      expect(schema).toEqual(PREFERENCE_SCHEMA);
      expect(schema).not.toBe(PREFERENCE_SCHEMA); // Should be a copy
    });
  });

  describe('getDefaults()', () => {
    test('should return a copy of default preferences', () => {
      // Act
      const defaults = preferencesService.getDefaults();

      // Assert
      expect(defaults).toEqual(DEFAULT_PREFERENCES);
      expect(defaults).not.toBe(DEFAULT_PREFERENCES); // Should be a copy
    });
  });
});
