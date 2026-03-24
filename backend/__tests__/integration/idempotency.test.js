/**
 * Idempotency Integration Tests
 *
 * Tests idempotency middleware and service with REAL PostgreSQL database.
 * Verifies:
 * - Idempotency keys are stored and retrieved correctly
 * - Cached responses are returned on replay
 * - Payload mismatches are detected
 * - User scoping prevents cross-user key collision
 * - Cleanup removes expired keys
 * - Race conditions are handled correctly
 */

const request = require('supertest');
const app = require('../../server');
const db = require('../../db/connection');
const {
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
} = require('../helpers/test-db');
const { withAuth } = require('../helpers/test-auth');
const { getUniqueValues } = require('../helpers/test-helpers');
const { API_OPERATIONS } = require('../../config/api-operations');
const IdempotencyService = require('../../services/idempotency-service');
const backgroundTasks = require('../../services/background-tasks');

const { IDEMPOTENCY } = API_OPERATIONS;

describe('Idempotency Integration Tests', () => {
  let adminUser;
  let adminToken;
  let dispatcherUser;
  let dispatcherToken;

  beforeAll(async () => {
    // Create test users
    adminUser = await createTestUser('admin');
    adminToken = adminUser.token;

    // Use dispatcher since they have customer.create permission
    dispatcherUser = await createTestUser('dispatcher');
    dispatcherToken = dispatcherUser.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean idempotency_keys table between tests
    const pool = getTestPool();
    await pool.query('DELETE FROM idempotency_keys');
  });

  // ═══════════════════════════════════════════════════════════════
  // STORE AND REPLAY
  // ═══════════════════════════════════════════════════════════════

  describe('Store and Replay', () => {
    test('returns cached response on replay with same key', async () => {
      const unique = getUniqueValues();
      const idempotencyKey = `test-key-${unique.id}`;
      const payload = {
        first_name: unique.firstName,
        last_name: unique.lastName,
        email: unique.email,
        organization_name: unique.companyName,
      };

      // First request - should create
      const response1 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send(payload);

      expect(response1.status).toBe(201);
      const createdId = response1.body.data.id;

      // Second request with same key - should return cached
      const response2 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send(payload);

      expect(response2.status).toBe(201);
      expect(response2.body.data.id).toBe(createdId);

      // Verify only one customer was created
      const pool = getTestPool();
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM customers WHERE email = $1',
        [unique.email],
      );
      expect(parseInt(countResult.rows[0].count)).toBe(1);
    });

    test('allows different keys for same payload', async () => {
      const unique = getUniqueValues();
      const payload = {
        first_name: unique.firstName,
        last_name: unique.lastName,
        email: unique.email,
        organization_name: unique.companyName,
      };

      // First request
      const response1 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, `key-1-${unique.id}`)
        .send(payload);

      expect(response1.status).toBe(201);

      // Second request with different key - should fail due to unique email
      const response2 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, `key-2-${unique.id}`)
        .send(payload);

      // Unique constraint on email - should be 409
      expect(response2.status).toBe(409);
    });

    test('works without idempotency key (opt-in behavior)', async () => {
      const unique = getUniqueValues();
      const payload = {
        first_name: unique.firstName,
        last_name: unique.lastName,
        email: unique.email,
        organization_name: unique.companyName,
      };

      // Request without idempotency key
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(response.status).toBe(201);

      // Verify no idempotency key was stored
      const pool = getTestPool();
      const result = await pool.query(
        'SELECT COUNT(*) FROM idempotency_keys WHERE user_id = $1',
        [adminUser.user.id],
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAYLOAD MISMATCH
  // ═══════════════════════════════════════════════════════════════

  describe('Payload Mismatch', () => {
    test('returns 422 when same key used with different payload', async () => {
      const unique = getUniqueValues();
      const idempotencyKey = `mismatch-key-${unique.id}`;

      // First request
      const response1 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send({
          first_name: unique.firstName,
          last_name: unique.lastName,
          email: unique.email,
          organization_name: unique.companyName,
        });

      expect(response1.status).toBe(201);

      // Second request with same key but different payload
      const unique2 = getUniqueValues();
      const response2 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send({
          first_name: unique2.firstName, // Different payload
          last_name: unique2.lastName,
          email: unique2.email,
          organization_name: unique2.companyName,
        });

      expect(response2.status).toBe(IDEMPOTENCY.STATUS_CONFLICT);
      expect(response2.body.code).toBe('IDEMPOTENCY_MISMATCH');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // USER SCOPING
  // ═══════════════════════════════════════════════════════════════

  describe('User Scoping', () => {
    test('scopes idempotency keys per user', async () => {
      const unique = getUniqueValues();
      const idempotencyKey = `shared-key-${unique.id}`;

      // Admin creates customer with key
      const adminPayload = {
        first_name: 'Admin',
        last_name: unique.lastName,
        email: `admin-${unique.email}`,
        organization_name: unique.companyName,
      };

      const response1 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send(adminPayload);

      expect(response1.status).toBe(201);
      const adminCustomerId = response1.body.data.id;

      // Dispatcher uses same key - should NOT get admin's cached response
      // (and should create new customer with different email)
      const dispatcherPayload = {
        first_name: 'Dispatcher',
        last_name: unique.lastName,
        email: `dispatcher-${unique.email}`,
        organization_name: unique.companyName,
      };

      const response2 = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send(dispatcherPayload);

      expect(response2.status).toBe(201);
      expect(response2.body.data.id).not.toBe(adminCustomerId);
      expect(response2.body.data.first_name).toBe('Dispatcher');
    });

    test('allows same key for different users', async () => {
      const idempotencyKey = 'user-scoped-key';

      // Verify both keys are stored separately in DB
      const pool = getTestPool();

      // Make requests that store idempotency keys
      const unique1 = getUniqueValues();
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send({
          first_name: unique1.firstName,
          last_name: unique1.lastName,
          email: unique1.email,
          organization_name: unique1.companyName,
        });

      const unique2 = getUniqueValues();
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
        .send({
          first_name: unique2.firstName,
          last_name: unique2.lastName,
          email: unique2.email,
          organization_name: unique2.companyName,
        });

      // Should have two separate records with same key but different user_id
      const result = await pool.query(
        'SELECT user_id FROM idempotency_keys WHERE idempotency_key = $1',
        [idempotencyKey],
      );

      expect(result.rows.length).toBe(2);
      const userIds = result.rows.map((r) => r.user_id);
      expect(userIds).toContain(adminUser.user.id);
      expect(userIds).toContain(dispatcherUser.user.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONCURRENT REQUESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Concurrent Requests', () => {
    test('handles race condition - exactly one request creates record', async () => {
      const unique = getUniqueValues();
      const idempotencyKey = `race-key-${unique.id}`;
      const payload = {
        first_name: unique.firstName,
        last_name: unique.lastName,
        email: unique.email,
        organization_name: unique.companyName,
      };

      // Fire 3 simultaneous requests with same key
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .set(IDEMPOTENCY.HEADER_NAME, idempotencyKey)
            .send(payload),
        );

      const responses = await Promise.all(requests);

      // All should return 201 (either fresh or cached)
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // All should have the same customer ID
      const ids = responses.map((r) => r.body.data.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(1);

      // Verify only one customer was created
      const pool = getTestPool();
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM customers WHERE email = $1',
        [unique.email],
      );
      expect(parseInt(countResult.rows[0].count)).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    test('runNow() removes expired keys from database', async () => {
      const pool = getTestPool();

      // Insert an expired key directly
      const expiredTime = new Date(Date.now() - IDEMPOTENCY.TTL_MS - 1000);
      await pool.query(
        `INSERT INTO idempotency_keys 
         (idempotency_key, user_id, request_method, request_path, request_body_hash, 
          response_status, response_body, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'expired-key',
          adminUser.user.id,
          'POST',
          '/api/customers',
          'hash123',
          201,
          JSON.stringify({ success: true }),
          expiredTime,
        ],
      );

      // Insert a fresh key
      await pool.query(
        `INSERT INTO idempotency_keys 
         (idempotency_key, user_id, request_method, request_path, request_body_hash, 
          response_status, response_body)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'fresh-key',
          adminUser.user.id,
          'POST',
          '/api/customers',
          'hash456',
          201,
          JSON.stringify({ success: true }),
        ],
      );

      // Run cleanup
      const deleted = await IdempotencyService.cleanup();

      expect(deleted).toBe(1);

      // Verify expired key is gone, fresh key remains
      const result = await pool.query(
        'SELECT idempotency_key FROM idempotency_keys WHERE user_id = $1',
        [adminUser.user.id],
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].idempotency_key).toBe('fresh-key');
    });

    test('background task runNow() executes cleanup', async () => {
      const pool = getTestPool();

      // Insert an expired key
      const expiredTime = new Date(Date.now() - IDEMPOTENCY.TTL_MS - 1000);
      await pool.query(
        `INSERT INTO idempotency_keys 
         (idempotency_key, user_id, request_method, request_path, request_body_hash, 
          response_status, response_body, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'bg-expired-key',
          adminUser.user.id,
          'POST',
          '/api/test',
          'bghash',
          200,
          JSON.stringify({}),
          expiredTime,
        ],
      );

      // Run background tasks now
      const results = await backgroundTasks.runNow();

      expect(results.idempotency).toBeGreaterThanOrEqual(1);

      // Verify key is gone
      const result = await pool.query(
        "SELECT COUNT(*) FROM idempotency_keys WHERE idempotency_key = 'bg-expired-key'",
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // KEY VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('Key Validation', () => {
    test('rejects invalid key format', async () => {
      const unique = getUniqueValues();

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, 'invalid@key!')
        .send({
          first_name: unique.firstName,
          last_name: unique.lastName,
          email: unique.email,
          organization_name: unique.companyName,
        });

      expect(response.status).toBe(400);
    });

    test('rejects key exceeding max length', async () => {
      const unique = getUniqueValues();
      const oversizedKey = 'a'.repeat(IDEMPOTENCY.MAX_KEY_LENGTH + 1);

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set(IDEMPOTENCY.HEADER_NAME, oversizedKey)
        .send({
          first_name: unique.firstName,
          last_name: unique.lastName,
          email: unique.email,
          organization_name: unique.companyName,
        });

      expect(response.status).toBe(400);
    });
  });
});
