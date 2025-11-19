/**
 * Unit Tests: Invoice Model - Relationships
 */

const Invoice = require('../../../db/models/Invoice');
const db = require('../../../db/connection');

jest.mock('../../../db/connection');

describe('Invoice Model - Relationships', () => {
  it('should belong to customer', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, customer_id: 10 }], rowCount: 1 });
    const result = await Invoice.findById(1);
    expect(result.customer_id).toBe(10);
  });

  it('should optionally link to work_order', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, work_order_id: 5 }], rowCount: 1 });
    const result = await Invoice.findById(1);
    expect(result.work_order_id).toBe(5);
  });
});
