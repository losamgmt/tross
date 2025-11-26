/**
 * Unit Tests: Contract Model - Relationships
 */

const Contract = require('../../../db/models/Contract');
const db = require('../../../db/connection');

jest.mock('../../../db/connection');

describe('Contract Model - Relationships', () => {
  test('should belong to customer', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, customer_id: 10 }], rowCount: 1 });
    const result = await Contract.findById(1);
    expect(result.customer_id).toBe(10);
  });
});
