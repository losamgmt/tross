/**
 * Unit Tests: WorkOrder Model - Relationships
 * Tests relationship queries and foreign key constraints
 */

const WorkOrder = require('../../../db/models/WorkOrder');
const db = require('../../../db/connection');

jest.mock('../../../db/connection');

describe('WorkOrder Model - Relationships', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer relationship', () => {
    it('should belong to a customer', async () => {
      const mockWorkOrderWithCustomer = {
        id: 1,
        title: 'Repair AC',
        customer_id: 10,
        customer_name: 'Acme Corp',
      };

      db.query.mockResolvedValue({ rows: [mockWorkOrderWithCustomer], rowCount: 1 });

      const result = await WorkOrder.findById(1);

      expect(result.customer_id).toBe(10);
      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('Technician relationship', () => {
    it('should optionally have an assigned technician', async () => {
      const mockWorkOrderWithTech = {
        id: 1,
        title: 'Repair AC',
        assigned_technician_id: 5,
        technician_name: 'John Doe',
      };

      db.query.mockResolvedValue({ rows: [mockWorkOrderWithTech], rowCount: 1 });

      const result = await WorkOrder.findById(1);

      expect(result.assigned_technician_id).toBe(5);
    });
  });

  describe('Invoice relationship', () => {
    it('should optionally have an associated invoice', async () => {
      const mockWorkOrderWithInvoice = {
        id: 1,
        title: 'Repair AC',
        invoice_id: 100,
      };

      db.query.mockResolvedValue({ rows: [mockWorkOrderWithInvoice], rowCount: 1 });

      const result = await WorkOrder.findById(1);

      expect(result.invoice_id).toBe(100);
    });
  });
});
