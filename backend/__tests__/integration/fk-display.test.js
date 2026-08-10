/**
 * Foreign-key display embedding — Integration (UDN P4b)
 *
 * Proves the generic read path LEFT JOINs each FK target and returns
 * `<fk>_display` with the target's display value, gated by the FK id's read
 * permission. Uses user.role_id -> roles.name (a stable, authored label).
 */

const request = require('supertest');
const app = require('../../server');
const { cleanupTestDatabase, createTestUser } = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');

describe('Foreign-key display embedding (UDN P4b)', () => {
  let admin;

  beforeAll(async () => {
    admin = await createTestUser({ role: 'admin' });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('GET /api/users/:id embeds role_id_display (= roles.name) alongside role_id', async () => {
    const res = await request(app)
      .get(`/api/users/${admin.user.id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.data.role_id).toBeDefined();
    // Generic read LEFT JOINs roles and projects fk_role_id.name AS role_id_display.
    expect(res.body.data.role_id_display).toBe('admin');
  });

  test('GET /api/users list embeds role_id_display for the row', async () => {
    const res = await request(app)
      .get('/api/users?limit=200')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(HTTP_STATUS.OK);
    const me = res.body.data.find((u) => u.id === admin.user.id);
    expect(me).toBeDefined();
    expect(me.role_id_display).toBe('admin');
  });
});
