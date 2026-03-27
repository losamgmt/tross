/**
 * Unit Tests: db/database-manager.js
 *
 * Tests unified database lifecycle management.
 * SRP: Verify initialization modes, state tracking, and error handling.
 *
 * MOCKING STRATEGY (uses centralized mocks):
 * - config/logger: createLoggerMock() from __tests__/mocks
 * - db/connection: Custom mock using createMockClient() from __tests__/mocks
 * - fs: Inline mock (Node built-in, not app module)
 */

// ============================================================================
// CENTRALIZED MOCKS - inline require() pattern per Jest hoisting rules
// ============================================================================
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));
jest.mock('../../../db/connection', () => {
  const { createMockClient } = require('../../mocks');
  const mockClient = createMockClient();

  return {
    query: jest.fn(),
    pool: {
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    testConnection: jest.fn(),
    __getMockClient: () => mockClient,
  };
});
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

// ============================================================================
// IMPORTS - After mocks are set up
// ============================================================================
const fs = require('fs').promises;
const db = require('../../../db/connection');
const dbManager = require('../../../db/database-manager');

describe('db/database-manager.js', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dbManager.reset();

    // Get mock client reference from centralized mock
    mockClient = db.__getMockClient();

    // Re-establish pool.connect mock (cleared by resetAllMocks in afterEach)
    db.pool.connect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =============================================================================
  // MODES CONSTANT
  // =============================================================================
  describe('MODES', () => {
    test('should export init and migrate modes', () => {
      expect(dbManager.MODES.INIT).toBe('init');
      expect(dbManager.MODES.MIGRATE).toBe('migrate');
    });

    test('should be frozen', () => {
      expect(Object.isFrozen(dbManager.MODES)).toBe(true);
    });
  });

  // =============================================================================
  // INIT MODE
  // =============================================================================
  describe('initialize() - init mode', () => {
    test('should apply schema and seed in init mode', async () => {
      fs.readFile
        .mockResolvedValueOnce('CREATE TABLE test;') // schema.sql
        .mockResolvedValueOnce('INSERT INTO test;'); // seed-data.sql
      db.query.mockResolvedValue({ rows: [] });

      const result = await dbManager.initialize('init');

      expect(result.mode).toBe('init');
      expect(result.schema).toBe(true);
      expect(result.seed).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    test('should handle schema error gracefully', async () => {
      fs.readFile
        .mockResolvedValueOnce('INVALID SQL;') // schema.sql
        .mockResolvedValueOnce('INSERT INTO test;'); // seed-data.sql
      db.query
        .mockRejectedValueOnce(new Error('Syntax error')) // schema fails
        .mockResolvedValueOnce({ rows: [] }); // seed succeeds

      const result = await dbManager.initialize('init');

      expect(result.schema).toBe(false);
      expect(result.seed).toBe(true);
    });

    test('should handle seed error gracefully', async () => {
      fs.readFile
        .mockResolvedValueOnce('CREATE TABLE test;')
        .mockResolvedValueOnce('INVALID INSERT;');
      db.query
        .mockResolvedValueOnce({ rows: [] }) // schema succeeds
        .mockRejectedValueOnce(new Error('Constraint violation')); // seed fails

      const result = await dbManager.initialize('init');

      expect(result.schema).toBe(true);
      expect(result.seed).toBe(false);
    });
  });

  // =============================================================================
  // MIGRATE MODE
  // =============================================================================
  describe('initialize() - migrate mode', () => {
    beforeEach(() => {
      // Mock migrations table creation
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('000_create_migrations_table')) {
          return Promise.resolve('CREATE TABLE schema_migrations;');
        }
        if (filePath.includes('001_')) {
          return Promise.resolve('ALTER TABLE test ADD column;');
        }
        return Promise.reject(new Error('Unknown file'));
      });
    });

    test('should run pending migrations in migrate mode', async () => {
      // Setup: no applied migrations, one pending
      db.query
        .mockResolvedValueOnce({ rows: [] }) // create migrations table
        .mockResolvedValueOnce({ rows: [] }); // get applied (empty)
      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_add_column.sql',
      ]);

      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dbManager.initialize('migrate');

      expect(result.mode).toBe('migrate');
      expect(result.applied).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should skip already applied migrations', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // create migrations table
        .mockResolvedValueOnce({ rows: [{ version: '001', checksum: 'abc' }] }); // already applied
      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_add_column.sql',
      ]);

      const result = await dbManager.initialize('migrate');

      expect(result.applied).toBe(0);
      expect(result.pending).toBe(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should support dry-run mode', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_add_column.sql',
      ]);

      const result = await dbManager.initialize('migrate', { dryRun: true });

      expect(result.applied).toBe(0);
      expect(result.pending).toBe(1);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should rollback on migration error', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_add_column.sql',
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Migration failed')); // actual migration

      await expect(dbManager.initialize('migrate')).rejects.toThrow(
        'Migration failed',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle idempotent errors gracefully', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }) // get applied
        .mockResolvedValueOnce({ rows: [] }); // record skipped migration

      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_add_column.sql',
      ]);

      const idempotentError = new Error('column already exists');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(idempotentError); // already applied

      const result = await dbManager.initialize('migrate');

      expect(result.applied).toBe(1); // Still counts as applied
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // =============================================================================
  // STATE TRACKING
  // =============================================================================
  describe('State tracking', () => {
    test('should track initialization state', async () => {
      fs.readFile
        .mockResolvedValueOnce('CREATE TABLE;')
        .mockResolvedValueOnce('INSERT;');
      db.query.mockResolvedValue({ rows: [] });
      db.testConnection.mockResolvedValue(true);

      await dbManager.initialize('init');

      const status = await dbManager.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.mode).toBe('init');
      expect(status.timestamp).toBeInstanceOf(Date);
    });

    test('should reset state correctly', async () => {
      fs.readFile
        .mockResolvedValueOnce('CREATE TABLE;')
        .mockResolvedValueOnce('INSERT;');
      db.query.mockResolvedValue({ rows: [] });

      await dbManager.initialize('init');
      dbManager.reset();

      db.testConnection.mockResolvedValue(true);
      const status = await dbManager.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.mode).toBe(null);
    });
  });

  // =============================================================================
  // getStatus()
  // =============================================================================
  describe('getStatus()', () => {
    test('should report connection status', async () => {
      db.testConnection.mockResolvedValue(true);
      db.query.mockRejectedValue(new Error('no migrations table'));

      const status = await dbManager.getStatus();

      expect(status.connectionOk).toBe(true);
    });

    test('should handle connection failure', async () => {
      db.testConnection.mockRejectedValue(new Error('Connection refused'));
      db.query.mockRejectedValue(new Error('Connection refused'));

      const status = await dbManager.getStatus();

      expect(status.connectionOk).toBe(false);
    });

    test('should include migration counts when table exists', async () => {
      db.testConnection.mockResolvedValue(true);
      db.query.mockResolvedValue({
        rows: [
          { version: '001', checksum: 'abc' },
          { version: '002', checksum: 'def' },
        ],
      });
      fs.readdir.mockResolvedValue([
        '000_create_migrations_table.sql',
        '001_init.sql',
        '002_add.sql',
        '003_pending.sql',
      ]);

      const status = await dbManager.getStatus();

      expect(status.migrations.applied).toBe(2);
      expect(status.migrations.pending).toBe(1);
      expect(status.migrations.versions).toEqual(['001', '002']);
    });
  });

  // =============================================================================
  // verifyMigrations()
  // =============================================================================
  describe('verifyMigrations()', () => {
    test('should return true when all checksums match', async () => {
      const content = 'ALTER TABLE test;';
      const expectedChecksum = require('crypto')
        .createHash('sha256')
        .update(content)
        .digest('hex');

      db.query.mockResolvedValue({
        rows: [{ version: '001', checksum: expectedChecksum }],
      });
      fs.readdir.mockResolvedValue(['001_test.sql']);
      fs.readFile.mockResolvedValue(content);

      const result = await dbManager.verifyMigrations();

      expect(result).toBe(true);
    });

    test('should return false when file modified', async () => {
      db.query.mockResolvedValue({
        rows: [{ version: '001', checksum: 'original-checksum' }],
      });
      fs.readdir.mockResolvedValue(['001_test.sql']);
      fs.readFile.mockResolvedValue('MODIFIED CONTENT');

      const result = await dbManager.verifyMigrations();

      expect(result).toBe(false);
    });

    test('should return false when file deleted', async () => {
      db.query.mockResolvedValue({
        rows: [{ version: '001', checksum: 'abc' }],
      });
      fs.readdir.mockResolvedValue([]); // no matching file

      const result = await dbManager.verifyMigrations();

      expect(result).toBe(false);
    });
  });

  // =============================================================================
  // MODE DETECTION
  // =============================================================================
  describe('Mode detection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should use init mode for development by default', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DB_MODE;

      fs.readFile
        .mockResolvedValueOnce('CREATE;')
        .mockResolvedValueOnce('INSERT;');
      db.query.mockResolvedValue({ rows: [] });

      const result = await dbManager.initialize();

      expect(result.mode).toBe('init');
    });

    test('should use migrate mode for production by default', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DB_MODE;

      db.query.mockResolvedValue({ rows: [] });
      fs.readFile.mockResolvedValue('CREATE TABLE;');
      fs.readdir.mockResolvedValue(['000_create_migrations_table.sql']);

      const result = await dbManager.initialize();

      expect(result.mode).toBe('migrate');
    });

    test('should respect DB_MODE override', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_MODE = 'init';

      fs.readFile
        .mockResolvedValueOnce('CREATE;')
        .mockResolvedValueOnce('INSERT;');
      db.query.mockResolvedValue({ rows: [] });

      const result = await dbManager.initialize();

      expect(result.mode).toBe('init');
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  describe('Error handling', () => {
    test('should throw on unknown mode', async () => {
      await expect(dbManager.initialize('unknown')).rejects.toThrow(
        'Unknown database mode: unknown',
      );
    });

    test('should propagate migration file read errors', async () => {
      db.query.mockResolvedValue({ rows: [] });
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(dbManager.initialize('migrate')).rejects.toThrow(
        'File not found',
      );
    });
  });
});
