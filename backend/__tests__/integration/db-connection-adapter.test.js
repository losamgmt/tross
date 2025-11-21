/**
 * Database Connection Integration Tests
 * Testing deployment-adapter integration with db/connection.js
 */

const { getDatabaseConfig } = require('../../config/deployment-adapter');
const { pool, testConnection, closePool } = require('../../db/connection');

describe('Database Connection - Deployment Adapter Integration', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterAll(async () => {
    // Restore original env vars
    process.env = { ...originalEnv };
    // Close pool connection
    await closePool();
  });

  describe('getDatabaseConfig Integration', () => {
    test('should use deployment-adapter for database configuration', () => {
      // Verify deployment-adapter is being used
      const config = getDatabaseConfig();

      // In test environment with individual vars, should return object
      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('user');
      expect(config).toHaveProperty('password');
    });

    test('should support DATABASE_URL format (Railway/Heroku)', () => {
      // Simulate Railway/Heroku environment
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://testuser:testpass@testhost:5432/testdb';

      const config = getDatabaseConfig();

      // Should return string (DATABASE_URL)
      expect(typeof config).toBe('string');
      expect(config).toBe('postgresql://testuser:testpass@testhost:5432/testdb');

      // Restore
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    test('should support individual env vars (AWS/local)', () => {
      // Ensure DATABASE_URL is not set
      const originalDbUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const config = getDatabaseConfig();

      // Should return object with individual properties
      expect(typeof config).toBe('object');
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.user).toBeDefined();
      expect(config.password).toBeDefined();

      // Restore
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      }
    });
  });

  describe('Database Connection Pool', () => {
    test('should connect to test database successfully', async () => {
      // Verify connection works
      const result = await testConnection();
      expect(result).toBe(true);
    });

    test('should use test database configuration (port 5433)', () => {
      // In test environment, should use port 5433
      const poolConfig = pool.options;

      expect(poolConfig.port).toBe(5433);
      expect(poolConfig.database).toContain('test');
    });

    test('should execute simple query', async () => {
      const client = await pool.connect();

      const result = await client.query('SELECT 1 + 1 as sum');
      client.release();

      expect(result.rows[0].sum).toBe(2);
    });

    test('should handle pool connection and release', async () => {
      const client = await pool.connect();

      // Verify client is connected
      expect(client).toBeDefined();

      // Release client back to pool
      client.release();

      // Should be able to get another client
      const client2 = await pool.connect();
      expect(client2).toBeDefined();
      client2.release();
    });
  });

  describe('Platform-Agnostic Configuration', () => {
    test('should work with default local development config', () => {
      const config = getDatabaseConfig();

      // Should have sensible defaults for local dev
      if (typeof config === 'object') {
        expect(config.host).toBe(process.env.DB_HOST || 'localhost');
        expect(config.port).toBe(parseInt(process.env.DB_PORT || '5432'));
        expect(config.min).toBe(2);
        expect(config.max).toBe(10);
      }
    });

    test('should respect custom pool sizes from env vars', () => {
      const originalMin = process.env.DB_POOL_MIN;
      const originalMax = process.env.DB_POOL_MAX;

      process.env.DB_POOL_MIN = '5';
      process.env.DB_POOL_MAX = '20';

      const config = getDatabaseConfig();

      if (typeof config === 'object') {
        expect(config.min).toBe(5);
        expect(config.max).toBe(20);
      }

      // Restore
      if (originalMin) {
        process.env.DB_POOL_MIN = originalMin;
      } else {
        delete process.env.DB_POOL_MIN;
      }

      if (originalMax) {
        process.env.DB_POOL_MAX = originalMax;
      } else {
        delete process.env.DB_POOL_MAX;
      }
    });
  });

  describe('Connection Error Handling', () => {
    test('should handle connection with existing pool gracefully', async () => {
      // Multiple connections should work fine
      const client1 = await pool.connect();
      const client2 = await pool.connect();

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();

      client1.release();
      client2.release();
    });
  });
});
