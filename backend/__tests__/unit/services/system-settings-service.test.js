/**
 * System Settings Service - Unit Tests
 *
 * Comprehensive tests covering all branches of system-settings-service.
 */

// Mock dependencies
jest.mock('../../../db/connection');
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logSecurityEvent: jest.fn(),
}));

const SystemSettingsService = require('../../../services/system-settings-service');
const { query: db } = require('../../../db/connection');
const { logSecurityEvent } = require('../../../config/logger');

describe('SystemSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetting', () => {
    it('should return setting from database when exists', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'test_key', value: { enabled: true }, description: 'Test', updated_at: new Date(), updated_by: 1 }],
      });

      const result = await SystemSettingsService.getSetting('test_key');

      expect(result).toBeDefined();
      expect(result.key).toBe('test_key');
      expect(result.value.enabled).toBe(true);
    });

    it('should return default for known key when not in database', async () => {
      db.mockResolvedValue({ rows: [] });

      const result = await SystemSettingsService.getSetting('maintenance_mode');

      expect(result).toBeDefined();
      expect(result.key).toBe('maintenance_mode');
      expect(result.is_default).toBe(true);
      expect(result.value.enabled).toBe(false);
    });

    it('should return null for unknown key not in database', async () => {
      db.mockResolvedValue({ rows: [] });

      const result = await SystemSettingsService.getSetting('unknown_key');

      expect(result).toBeNull();
    });

    it('should throw for empty key', async () => {
      await expect(SystemSettingsService.getSetting(''))
        .rejects.toThrow('Setting key is required');
    });

    it('should throw for null key', async () => {
      await expect(SystemSettingsService.getSetting(null))
        .rejects.toThrow('Setting key is required');
    });

    it('should throw for non-string key', async () => {
      await expect(SystemSettingsService.getSetting(123))
        .rejects.toThrow('Setting key is required');
    });
  });

  describe('getAllSettings', () => {
    it('should return all settings from database', async () => {
      db.mockResolvedValue({
        rows: [
          { key: 'setting1', value: { test: 1 } },
          { key: 'setting2', value: { test: 2 } },
        ],
      });

      const result = await SystemSettingsService.getAllSettings();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('setting1');
      expect(result[1].key).toBe('setting2');
    });

    it('should return empty array when no settings exist', async () => {
      db.mockResolvedValue({ rows: [] });

      const result = await SystemSettingsService.getAllSettings();

      expect(result).toEqual([]);
    });
  });

  describe('updateSetting', () => {
    it('should update existing setting', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'test_key', value: { updated: true }, description: null, updated_at: new Date(), updated_by: 1 }],
      });

      const result = await SystemSettingsService.updateSetting('test_key', { updated: true }, 1);

      expect(result.key).toBe('test_key');
      expect(result.value.updated).toBe(true);
    });

    it('should throw for empty key', async () => {
      await expect(SystemSettingsService.updateSetting('', { test: true }, 1))
        .rejects.toThrow('Setting key is required');
    });

    it('should throw for undefined value', async () => {
      await expect(SystemSettingsService.updateSetting('test_key', undefined, 1))
        .rejects.toThrow('Setting value is required');
    });
  });

  describe('getMaintenanceMode', () => {
    it('should return database value when exists', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, message: 'Down for updates' } }],
      });

      const result = await SystemSettingsService.getMaintenanceMode();

      expect(result.enabled).toBe(true);
      expect(result.message).toBe('Down for updates');
    });

    it('should return default when not in database', async () => {
      db.mockResolvedValue({ rows: [] });

      const result = await SystemSettingsService.getMaintenanceMode();

      expect(result.enabled).toBe(false);
    });
  });

  describe('enableMaintenanceMode', () => {
    it('should enable maintenance with custom message', async () => {
      // First call gets current mode
      db.mockResolvedValueOnce({ rows: [] });
      // Second call updates
      db.mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, message: 'Custom message' } }],
      });

      const result = await SystemSettingsService.enableMaintenanceMode({ message: 'Custom message' }, 1);

      expect(logSecurityEvent).toHaveBeenCalledWith('MAINTENANCE_MODE_ENABLED', expect.any(Object));
    });

    it('should enable maintenance with default message when none provided', async () => {
      db.mockResolvedValueOnce({ rows: [] });
      db.mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: { enabled: true } }],
      });

      await SystemSettingsService.enableMaintenanceMode({}, 1);

      expect(db).toHaveBeenCalled();
    });

    it('should set estimated_end when provided', async () => {
      db.mockResolvedValueOnce({ rows: [] });
      db.mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, estimated_end: '2024-12-01T12:00:00Z' } }],
      });

      await SystemSettingsService.enableMaintenanceMode({ estimated_end: '2024-12-01T12:00:00Z' }, 1);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        'MAINTENANCE_MODE_ENABLED',
        expect.objectContaining({ estimatedEnd: '2024-12-01T12:00:00Z' }),
      );
    });
  });

  describe('disableMaintenanceMode', () => {
    it('should disable maintenance mode', async () => {
      db.mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, message: 'Down' } }],
      });
      db.mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: { enabled: false } }],
      });

      await SystemSettingsService.disableMaintenanceMode(1);

      expect(logSecurityEvent).toHaveBeenCalledWith('MAINTENANCE_MODE_DISABLED', { userId: 1 });
    });
  });

  describe('isRoleAllowedDuringMaintenance', () => {
    it('should return true when maintenance is disabled', async () => {
      db.mockResolvedValue({ rows: [] }); // Returns default (disabled)

      const result = await SystemSettingsService.isRoleAllowedDuringMaintenance('technician');

      expect(result).toBe(true);
    });

    it('should return true for allowed role when maintenance enabled', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, allowed_roles: ['admin'] } }],
      });

      const result = await SystemSettingsService.isRoleAllowedDuringMaintenance('admin');

      expect(result).toBe(true);
    });

    it('should return false for non-allowed role when maintenance enabled', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'maintenance_mode', value: { enabled: true, allowed_roles: ['admin'] } }],
      });

      const result = await SystemSettingsService.isRoleAllowedDuringMaintenance('technician');

      expect(result).toBe(false);
    });
  });

  describe('getFeatureFlags', () => {
    it('should return feature flags from database', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'feature_flags', value: { dark_mode: false, new_feature: true } }],
      });

      const result = await SystemSettingsService.getFeatureFlags();

      expect(result.dark_mode).toBe(false);
      expect(result.new_feature).toBe(true);
    });

    it('should return defaults when not in database', async () => {
      db.mockResolvedValue({ rows: [] });

      const result = await SystemSettingsService.getFeatureFlags();

      expect(result.dark_mode).toBe(true);
      expect(result.file_attachments).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'feature_flags', value: { test_feature: true } }],
      });

      const result = await SystemSettingsService.isFeatureEnabled('test_feature');

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'feature_flags', value: { test_feature: false } }],
      });

      const result = await SystemSettingsService.isFeatureEnabled('test_feature');

      expect(result).toBe(false);
    });

    it('should return false for unknown feature', async () => {
      db.mockResolvedValue({
        rows: [{ key: 'feature_flags', value: {} }],
      });

      const result = await SystemSettingsService.isFeatureEnabled('unknown_feature');

      expect(result).toBe(false);
    });
  });
});
