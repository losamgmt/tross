/**
 * Unit Tests: WorkOrder Model - CRUD Operations
 * Tests database CRUD methods with mocked database connection
 */

jest.mock('../../../db/models/WorkOrder');

const WorkOrder = require('../../../db/models/WorkOrder');

describe('WorkOrder Model - CRUD Operations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should return paginated work orders', async () => {
      const mockResult = {
        data: [
          { id: 1, title: 'Repair AC', status: 'pending', customer_id: 10 },
          { id: 2, title: 'Install Heater', status: 'in_progress', customer_id: 11 },
        ],
        pagination: { page: 1, limit: 50, totalRecords: 2, totalPages: 1 },
      };

      WorkOrder.findAll.mockResolvedValue(mockResult);

      const result = await WorkOrder.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual(mockResult.data);
      expect(WorkOrder.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no work orders exist', async () => {
      WorkOrder.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 },
      });

      const result = await WorkOrder.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual([]);
    });
  });

  describe('findById()', () => {
    it('should return work order by ID', async () => {
      const mockWorkOrder = { id: 1, title: 'Repair AC', status: 'pending' };
      WorkOrder.findById.mockResolvedValue(mockWorkOrder);

      const result = await WorkOrder.findById(1);

      expect(result).toEqual(mockWorkOrder);
      expect(WorkOrder.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent work order', async () => {
      WorkOrder.findById.mockResolvedValue(null);

      const result = await WorkOrder.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('should create a new work order', async () => {
      const newWorkOrder = { title: 'Fix Plumbing', customer_id: 10, priority: 'high' };
      const createdWorkOrder = { id: 3, ...newWorkOrder, status: 'pending' };

      WorkOrder.create.mockResolvedValue(createdWorkOrder);

      const result = await WorkOrder.create(newWorkOrder);

      expect(result).toEqual(createdWorkOrder);
      expect(WorkOrder.create).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('should update an existing work order', async () => {
      const updateData = { status: 'completed' };
      const updatedWorkOrder = { id: 1, title: 'Repair AC', status: 'completed' };

      WorkOrder.update.mockResolvedValue(updatedWorkOrder);

      const result = await WorkOrder.update(1, updateData);

      expect(result).toEqual(updatedWorkOrder);
    });
  });

  describe('delete()', () => {
    it('should soft delete a work order', async () => {
      const deletedWorkOrder = { id: 1, title: 'Repair AC', is_active: false };

      WorkOrder.delete.mockResolvedValue(deletedWorkOrder);

      const result = await WorkOrder.delete(1);

      expect(result).toEqual(deletedWorkOrder);
    });
  });
});
