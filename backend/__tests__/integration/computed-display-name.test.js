/**
 * COMPUTED display-name compute-on-read (P1)
 *
 * A COMPUTED entity's `name` is composed at READ time from its `computedName`
 * template — own fields + the fresh `<fk>_display` projection — and is never
 * stored. This proves the read-path wiring end-to-end (findById + list) with a
 * real FK-display JOIN, including the core freshness guarantee: renaming the
 * related customer changes the work order's displayed name on the next read
 * without ever touching the work order.
 */

const request = require('supertest');
const app = require('../../server');
const { createTestUser, cleanupTestDatabase } = require('../helpers/test-db');
const { getUniqueValues } = require('../helpers/test-helpers');

describe('COMPUTED display name (compute-on-read)', () => {
  let adminToken;
  let customerId;
  let customerName;

  beforeAll(async () => {
    adminToken = (await createTestUser('admin')).token;
    const cust = getUniqueValues();
    customerName = `${cust.firstName} ${cust.lastName}`;
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: cust.firstName,
        last_name: cust.lastName,
        email: cust.email,
      });
    expect(res.status).toBe(201);
    customerId = res.body.data.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('findById composes "{customer}: {summary}: {number}" from own fields + fresh FK display', async () => {
    const create = await request(app)
      .post('/api/work_orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, summary: 'Fix the sink' });
    expect(create.status).toBe(201);
    const { id, work_order_number: woNumber } = create.body.data;

    const res = await request(app)
      .get(`/api/work_orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(`${customerName}: Fix the sink: ${woNumber}`);
  });

  test('list read composes the name per row', async () => {
    const create = await request(app)
      .post('/api/work_orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, summary: 'Replace filter' });
    expect(create.status).toBe(201);
    const woNumber = create.body.data.work_order_number;

    const res = await request(app)
      .get(`/api/work_orders?customer_id=${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const row = res.body.data.find((w) => w.work_order_number === woNumber);
    expect(row).toBeDefined();
    expect(row.name).toBe(`${customerName}: Replace filter: ${woNumber}`);
  });

  test('read-only: a user-supplied name is ignored (composed name wins)', async () => {
    const create = await request(app)
      .post('/api/work_orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, summary: 'Paint wall', name: 'HACKED TITLE' });
    expect(create.status).toBe(201);
    const { id, work_order_number: woNumber } = create.body.data;

    const res = await request(app)
      .get(`/api/work_orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.name).toBe(`${customerName}: Paint wall: ${woNumber}`);
    expect(res.body.data.name).not.toContain('HACKED');
  });

  test('freshness: renaming the customer changes the composed name on next read (never stored)', async () => {
    const create = await request(app)
      .post('/api/work_orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, summary: 'Inspect roof' });
    const { id, work_order_number: woNumber } = create.body.data;

    // Rename the customer — HUMAN `name` is generated from first/last.
    const upd = await request(app)
      .patch(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Renamed' });
    expect(upd.status).toBe(200);
    const newName = upd.body.data.name;
    expect(newName).not.toBe(customerName);

    const res = await request(app)
      .get(`/api/work_orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // The work order was never touched, yet its display name reflects the rename.
    expect(res.body.data.name).toBe(`${newName}: Inspect roof: ${woNumber}`);
  });
});
