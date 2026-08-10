/**
 * Batch delta integration tests (S6a deltas D1 + D2)
 *
 * Complements batch-operations.test.js (batch CRUD / RLS / rollback) with the two
 * S6a deltas that were only unit-covered:
 *   D1 - computed-entity identifiers auto-generate in the batch path (work_order -> WO-YYYY-NNNN).
 *   D2 - system-protection blocks a protected role op AND rolls the whole atomic batch back.
 */

const request = require('supertest');
const app = require('../../server');
const {
  createTestUser,
  cleanupTestDatabase,
  getTestPool,
} = require('../helpers/test-db');
const { getUniqueValues } = require('../helpers/test-helpers');

describe('Batch delta integration tests', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = (await createTestUser('admin')).token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ── D1 — computed identifiers auto-generate in the batch path ──────────────
  test('D1: batch-created work_orders each auto-generate a distinct WO-YYYY-NNNN', async () => {
    const cust = getUniqueValues();
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: cust.firstName,
        last_name: cust.lastName,
        email: cust.email,
      });
    expect(custRes.status).toBe(201);
    const customerId = custRes.body.data.id;

    const res = await request(app)
      .post('/api/work_orders/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operations: [
          { operation: 'create', data: { customer_id: customerId, summary: 'WO A' } },
          { operation: 'create', data: { customer_id: customerId, summary: 'WO B' } },
          { operation: 'create', data: { customer_id: customerId, summary: 'WO C' } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.created).toBe(3);

    const pool = getTestPool();
    const { rows } = await pool.query(
      'SELECT work_order_number FROM work_orders WHERE customer_id = $1',
      [customerId],
    );
    expect(rows).toHaveLength(3);
    const numbers = rows.map((r) => r.work_order_number);
    for (const n of numbers) {
      expect(n).toMatch(/^WO-\d{4}-\d+$/);
    }
    expect(new Set(numbers).size).toBe(3); // all distinct
  });

  // ── D2 — system-protection blocks the op and rolls the whole batch back ────
  test('D2: a system-protected role op aborts the atomic batch and rolls back the companion op', async () => {
    const pool = getTestPool();
    const before = await pool.query(
      "SELECT id, description FROM roles WHERE name = 'admin'",
    );
    const adminRoleId = before.rows[0].id;
    const originalDescription = before.rows[0].description;

    const res = await request(app)
      .post('/api/roles/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operations: [
          // Valid companion op (description is NOT a protected immutable field).
          {
            operation: 'update',
            id: adminRoleId,
            data: { description: 'ROLLBACK_PROBE' },
          },
          // Protected op: deleting a system role is blocked (preventDelete + protected name).
          { operation: 'delete', id: adminRoleId },
        ],
      });

    // Atomic batch: the protected delete throws 403 -> whole txn rolls back -> 400.
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);

    // Rollback: the admin role survives AND the companion description update is undone.
    const after = await pool.query(
      "SELECT id, description FROM roles WHERE name = 'admin'",
    );
    expect(after.rows).toHaveLength(1);
    expect(after.rows[0].description).toBe(originalDescription);
  });
});
