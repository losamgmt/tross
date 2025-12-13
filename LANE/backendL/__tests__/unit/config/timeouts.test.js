/**
 * Timeouts Config - Unit Tests
 *
 * Tests timeout configuration constants and helpers
 *
 * KISS: Config file testing - verify structure and helpers
 */

const {
  TIMEOUTS,
  getTimeoutConfig,
  validateTimeoutHierarchy,
} = require('../../../config/timeouts');

describe('Timeouts Configuration', () => {
  describe('TIMEOUTS constants', () => {
    it('should define SERVER timeouts', () => {
      expect(TIMEOUTS.SERVER).toBeDefined();
      expect(TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS).toBe(120000);
      expect(TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS).toBe(125000);
      expect(TIMEOUTS.SERVER.HEADERS_TIMEOUT_MS).toBe(130000);
    });

    it('should define REQUEST timeouts', () => {
      expect(TIMEOUTS.REQUEST).toBeDefined();
      expect(TIMEOUTS.REQUEST.DEFAULT_MS).toBe(30000);
      expect(TIMEOUTS.REQUEST.LONG_RUNNING_MS).toBe(90000);
      expect(TIMEOUTS.REQUEST.QUICK_MS).toBe(5000);
    });

    it('should define DATABASE timeouts', () => {
      expect(TIMEOUTS.DATABASE).toBeDefined();
      expect(TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS).toBe(20000);
      expect(TIMEOUTS.DATABASE.QUERY_TIMEOUT_MS).toBe(20000);
      expect(TIMEOUTS.DATABASE.CONNECTION_TIMEOUT_MS).toBe(5000);
      expect(TIMEOUTS.DATABASE.IDLE_TIMEOUT_MS).toBe(30000);
    });

    it('should define DATABASE test timeouts', () => {
      expect(TIMEOUTS.DATABASE.TEST).toBeDefined();
      expect(TIMEOUTS.DATABASE.TEST.STATEMENT_TIMEOUT_MS).toBe(10000);
      expect(TIMEOUTS.DATABASE.TEST.QUERY_TIMEOUT_MS).toBe(10000);
      expect(TIMEOUTS.DATABASE.TEST.CONNECTION_TIMEOUT_MS).toBe(3000);
      expect(TIMEOUTS.DATABASE.TEST.IDLE_TIMEOUT_MS).toBe(1000);
    });

    it('should define SERVICES timeouts', () => {
      expect(TIMEOUTS.SERVICES).toBeDefined();
      expect(TIMEOUTS.SERVICES.HEALTH_CHECK_MS).toBe(5000);
      expect(TIMEOUTS.SERVICES.EXTERNAL_API_MS).toBe(10000);
      expect(TIMEOUTS.SERVICES.FILE_PROCESSING_MS).toBe(60000);
      expect(TIMEOUTS.SERVICES.EMAIL_DELIVERY_MS).toBe(15000);
    });

    it('should define MONITORING thresholds', () => {
      expect(TIMEOUTS.MONITORING).toBeDefined();
      expect(TIMEOUTS.MONITORING.SLOW_REQUEST_MS).toBe(3000);
      expect(TIMEOUTS.MONITORING.VERY_SLOW_REQUEST_MS).toBe(10000);
      expect(TIMEOUTS.MONITORING.SLOW_QUERY_MS).toBe(1000);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(TIMEOUTS)).toBe(true);
      expect(Object.isFrozen(TIMEOUTS.SERVER)).toBe(true);
      expect(Object.isFrozen(TIMEOUTS.REQUEST)).toBe(true);
      expect(Object.isFrozen(TIMEOUTS.DATABASE)).toBe(true);
      expect(Object.isFrozen(TIMEOUTS.SERVICES)).toBe(true);
      expect(Object.isFrozen(TIMEOUTS.MONITORING)).toBe(true);
    });
  });

  describe('getTimeoutConfig', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return production config by default', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const config = getTimeoutConfig();

      // Assert
      expect(config.server).toBe(TIMEOUTS.SERVER);
      expect(config.request).toBe(TIMEOUTS.REQUEST);
      expect(config.database.statementTimeoutMs).toBe(20000);
      expect(config.database.queryTimeoutMs).toBe(20000);
      expect(config.database.connectionTimeoutMs).toBe(5000);
      expect(config.database.idleTimeoutMs).toBe(30000);
      expect(config.services).toBe(TIMEOUTS.SERVICES);
      expect(config.monitoring).toBe(TIMEOUTS.MONITORING);
    });

    it('should return test config for test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act
      const config = getTimeoutConfig();

      // Assert
      expect(config.database).toBe(TIMEOUTS.DATABASE.TEST);
      expect(config.database.STATEMENT_TIMEOUT_MS).toBe(10000);
      expect(config.database.QUERY_TIMEOUT_MS).toBe(10000);
    });

    it('should accept environment parameter', () => {
      // Act
      const prodConfig = getTimeoutConfig('production');
      const testConfig = getTimeoutConfig('test');

      // Assert
      expect(prodConfig.database.statementTimeoutMs).toBe(20000);
      expect(testConfig.database.STATEMENT_TIMEOUT_MS).toBe(10000);
    });
  });

  describe('validateTimeoutHierarchy', () => {
    it('should validate successfully with current constants', () => {
      // Should not throw
      expect(() => validateTimeoutHierarchy()).not.toThrow();
    });

    it('should enforce timeout hierarchy rules', () => {
      // Verify hierarchy is correct
      expect(TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS).toBeLessThan(
        TIMEOUTS.REQUEST.DEFAULT_MS,
      );
      expect(TIMEOUTS.REQUEST.DEFAULT_MS).toBeLessThan(
        TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS,
      );
      expect(TIMEOUTS.SERVER.REQUEST_TIMEOUT_MS).toBeLessThan(
        TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS,
      );
      expect(TIMEOUTS.SERVER.KEEP_ALIVE_TIMEOUT_MS).toBeLessThan(
        TIMEOUTS.SERVER.HEADERS_TIMEOUT_MS,
      );
      expect(TIMEOUTS.SERVICES.HEALTH_CHECK_MS).toBeLessThan(
        TIMEOUTS.REQUEST.DEFAULT_MS,
      );
    });
  });
});
