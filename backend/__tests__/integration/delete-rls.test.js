/**
 * DELETE Row-Level Security — Integration Tests (regression for `delete-rls-bypass`)
 *
 * SECURITY: A user must not be able to hard-delete another user's rows via the
 * generic DELETE route. Before the fix, GenericEntityService.delete ignored RLS,
 * so any user with resource-level delete permission could delete ANY row by id
 * (OWASP A01 / IDOR). These tests exercise the two entities where delete is
 * grantable to a row-scoped role:
 *   - notifications  (RLS: own user_id; delete = customer)
 *   - saved_views    (RLS: own user_id; delete = customer)
 */

const request = require('supertest');
const app = require('../../server');
const {
  getTestPool,
  cleanupTestDatabase,
  createTestUser,
} = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');

describe('DELETE row-level security (delete-rls-bypass regression)', () => {
  let pool;
  let customerA;
  let customerB;
  let adminToken;

  beforeAll(async () => {
    pool = getTestPool();
    customerA = await createTestUser({ role: 'customer' });
    customerB = await createTestUser({ role: 'customer' });
    adminToken = (await createTestUser({ role: 'admin' })).token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  async function seedNotification(userId, title) {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, title, body, type)
       VALUES ($1, $2, 'test body', 'info') RETURNING id`,
      [userId, title],
    );
    return rows[0].id;
  }

  async function seedSavedView(userId, name) {
    const { rows } = await pool.query(
      `INSERT INTO saved_views (user_id, view_name, entity_name, settings)
       VALUES ($1, $2, 'work_order', '{}'::jsonb) RETURNING id`,
      [userId, name],
    );
    return rows[0].id;
  }

  const existsIn = async (table, id) => {
    const { rows } = await pool.query(
      `SELECT id FROM ${table} WHERE id = $1`,
      [id],
    );
    return rows.length === 1;
  };

  describe('notifications', () => {
    test("customer CANNOT delete another user's notification → 404, row survives", async () => {
      const bId = await seedNotification(customerB.user.id, 'B private notification');

      const res = await request(app)
        .delete(`/api/notifications/${bId}`)
        .set('Authorization', `Bearer ${customerA.token}`);

      // SECURITY: out-of-scope row is hidden → 404, and it must NOT be deleted
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(await existsIn('notifications', bId)).toBe(true);
    });

    test('customer CAN delete their own notification → 200, row gone', async () => {
      const aId = await seedNotification(customerA.user.id, 'A own notification');

      const res = await request(app)
        .delete(`/api/notifications/${aId}`)
        .set('Authorization', `Bearer ${customerA.token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(await existsIn('notifications', aId)).toBe(false);
    });

    test("notifications scope every role: even admin cannot delete another user's notification → 404", async () => {
      // The notification RLS rule applies to roles:'*' (own user_id) with NO
      // admin-full-access rule, so the fix correctly scopes admin to their own
      // notifications too. This documents that behavior.
      const bId = await seedNotification(customerB.user.id, 'B notification vs admin');

      const res = await request(app)
        .delete(`/api/notifications/${bId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(await existsIn('notifications', bId)).toBe(true);
    });
  });

  describe('saved_views', () => {
    test("customer CANNOT delete another user's saved view → 404, row survives", async () => {
      const bId = await seedSavedView(customerB.user.id, 'B view');

      const res = await request(app)
        .delete(`/api/saved_views/${bId}`)
        .set('Authorization', `Bearer ${customerA.token}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(await existsIn('saved_views', bId)).toBe(true);
    });

    test('customer CAN delete their own saved view → 200, row gone', async () => {
      const aId = await seedSavedView(customerA.user.id, 'A view');

      const res = await request(app)
        .delete(`/api/saved_views/${aId}`)
        .set('Authorization', `Bearer ${customerA.token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(await existsIn('saved_views', aId)).toBe(false);
    });

    test("admin CAN delete another user's saved view (admin-full-access rule) → 200", async () => {
      // saved_views has a dedicated admin-full-access rule (access: null), so admin
      // is NOT row-scoped here — the fix must still allow the full-access role.
      const bId = await seedSavedView(customerB.user.id, 'B view for admin');

      const res = await request(app)
        .delete(`/api/saved_views/${bId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(await existsIn('saved_views', bId)).toBe(false);
    });
  });
});
