/**
 * Unit Tests for validators/preferences-validators.js
 *
 * Tests preference validation middleware with mocked Express objects.
 * Follows AAA pattern (Arrange, Act, Assert).
 *
 * Test Coverage:
 * - validatePreferencesUpdate - batch update validation
 * - validateSinglePreferenceUpdate - single key update validation
 */

const {
  validatePreferencesUpdate,
  validateSinglePreferenceUpdate,
} = require('../../../validators/preferences-validators');

// Mock ResponseFormatter
jest.mock('../../../utils/response-formatter', () => ({
  badRequest: jest.fn((res, message, details) => {
    res.status(400).json({ status: 'error', message, details });
  }),
}));

const ResponseFormatter = require('../../../utils/response-formatter');

describe('validators/preferences-validators.js', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validatePreferencesUpdate', () => {
    test('should pass valid preferences to next()', () => {
      // Arrange
      mockReq.body = { theme: 'dark', notificationsEnabled: false };

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).not.toHaveBeenCalled();
    });

    test('should pass valid single preference to next()', () => {
      // Arrange
      mockReq.body = { theme: 'light' };

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject invalid theme value', () => {
      // Arrange
      mockReq.body = { theme: 'invalid-theme' };

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('theme must be one of'),
        expect.any(Array)
      );
    });

    test('should reject invalid boolean type for notificationsEnabled', () => {
      // Arrange
      mockReq.body = { notificationsEnabled: 'yes' };

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('notificationsEnabled must be a boolean'),
        expect.any(Array)
      );
    });

    test('should reject empty object (min 1 preference required)', () => {
      // Arrange
      mockReq.body = {};

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('At least one preference must be provided'),
        expect.any(Array)
      );
    });

    test('should report unknown preference keys', () => {
      // Arrange
      mockReq.body = { unknownPref: 'value', theme: 'dark' };

      // Act
      validatePreferencesUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should accept all valid enum values for theme', () => {
      const validThemes = ['system', 'light', 'dark'];

      validThemes.forEach((theme) => {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        mockReq.body = { theme };

        // Act
        validatePreferencesUpdate(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(ResponseFormatter.badRequest).not.toHaveBeenCalled();
      });
    });

    test('should accept both true and false for notificationsEnabled', () => {
      [true, false].forEach((value) => {
        jest.clearAllMocks();
        mockReq.body = { notificationsEnabled: value };

        validatePreferencesUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('validateSinglePreferenceUpdate', () => {
    test('should pass valid single preference update to next()', () => {
      // Arrange
      mockReq.params = { key: 'theme' };
      mockReq.body = { value: 'dark' };

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).not.toHaveBeenCalled();
    });

    test('should reject unknown preference key', () => {
      // Arrange
      mockReq.params = { key: 'unknownKey' };
      mockReq.body = { value: 'anything' };

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        expect.stringContaining('Unknown preference key: unknownKey'),
        expect.any(Array)
      );
    });

    test('should reject missing value in body', () => {
      // Arrange
      mockReq.params = { key: 'theme' };
      mockReq.body = {}; // No value

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
        mockRes,
        'Value is required',
        expect.any(Array)
      );
    });

    test('should reject invalid value for theme', () => {
      // Arrange
      mockReq.params = { key: 'theme' };
      mockReq.body = { value: 'invalid-theme' };

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should reject invalid type for notificationsEnabled', () => {
      // Arrange
      mockReq.params = { key: 'notificationsEnabled' };
      mockReq.body = { value: 'not-a-boolean' };

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should accept valid boolean value for notificationsEnabled', () => {
      // Arrange
      mockReq.params = { key: 'notificationsEnabled' };
      mockReq.body = { value: false };

      // Act
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('buildPreferenceJoiSchema branch coverage', () => {
    // These tests exercise specific branches in buildPreferenceJoiSchema via validatePreferencesUpdate

    test('should handle string preference with maxLength', () => {
      // timezone is a string type with maxLength
      mockReq.body = { timezone: 'America/Chicago' };
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject string preference exceeding maxLength', () => {
      mockReq.body = { timezone: 'A'.repeat(100) }; // Over 50 char limit
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should handle number preference with min/max boundaries', () => {
      // autoRefreshInterval is a number type with min=0 and max=300
      mockReq.body = { autoRefreshInterval: 120 };
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should accept number preference at min boundary', () => {
      mockReq.body = { autoRefreshInterval: 0 }; // min=0
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should accept number preference at max boundary', () => {
      mockReq.body = { autoRefreshInterval: 300 }; // max=300
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject number preference below min', () => {
      mockReq.body = { autoRefreshInterval: -1 }; // Below min of 0
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should reject number preference above max', () => {
      mockReq.body = { autoRefreshInterval: 301 }; // Above max of 300
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should reject non-number for number preference', () => {
      mockReq.body = { autoRefreshInterval: 'fast' };
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should handle validation error with no details message', () => {
      // Force an edge case where error.details[0]?.message is undefined
      mockReq.body = {}; // Empty should trigger min(1) error
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should handle multiple preference types in one update', () => {
      mockReq.body = {
        theme: 'dark',
        notificationsEnabled: false,
        timezone: 'Europe/London',
        autoRefreshInterval: 60,
      };
      validatePreferencesUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('buildSinglePreferenceSchema branch coverage', () => {
    test('should handle string type preference in single update', () => {
      // If theme is enum, use it; this tests the enum branch
      mockReq.params = { key: 'theme' };
      mockReq.body = { value: 'dark' };
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle boolean type preference in single update', () => {
      mockReq.params = { key: 'notificationsEnabled' };
      mockReq.body = { value: true };
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should validate timezone string preference', () => {
      mockReq.params = { key: 'timezone' };
      mockReq.body = { value: 'America/Los_Angeles' };
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject timezone exceeding maxLength', () => {
      mockReq.params = { key: 'timezone' };
      mockReq.body = { value: 'A'.repeat(100) }; // Way over 50 char limit
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should validate autoRefreshInterval number preference', () => {
      mockReq.params = { key: 'autoRefreshInterval' };
      mockReq.body = { value: 60 };
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject autoRefreshInterval below min', () => {
      mockReq.params = { key: 'autoRefreshInterval' };
      mockReq.body = { value: -5 }; // Below min of 0
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should reject autoRefreshInterval above max', () => {
      mockReq.params = { key: 'autoRefreshInterval' };
      mockReq.body = { value: 500 }; // Above max of 300
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });

    test('should reject non-number for autoRefreshInterval', () => {
      mockReq.params = { key: 'autoRefreshInterval' };
      mockReq.body = { value: 'not-a-number' };
      validateSinglePreferenceUpdate(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(ResponseFormatter.badRequest).toHaveBeenCalled();
    });
  });
});
