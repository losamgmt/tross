/**
 * Technician Model - CRUD Operations Tests
 * Tests core CRUD operations with mocked database connection
 */

// Mock database
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const Technician = require('../../../db/models/Technician');
const db = require('../../../db/connection');

describe('Technician Model - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should return paginated technicians', async () => {
      const mockTechnicians = [
        { id: 1, license_number: 'TECH-001', status: 'available', is_active: true },
        { id: 2, license_number: 'TECH-002', status: 'on_job', is_active: true },
      ];
      db.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      db.query.mockResolvedValueOnce({ rows: mockTechnicians });

      const result = await Technician.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual(mockTechnicians);
      expect(result.pagination.total).toBe(2);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await Technician.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById()', () => {
    it('should return technician by ID', async () => {
      const mockTechnician = {
        id: 1,
        license_number: 'TECH-001',
        status: 'available',
        hourly_rate: 75.50,
        is_active: true,
      };
      db.query.mockResolvedValue({ rows: [mockTechnician] });

      const technician = await Technician.findById(1);

      expect(technician).toEqual(mockTechnician);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
    });

    it('should return null for non-existent technician', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const technician = await Technician.findById(999);

      expect(technician).toBeNull();
    });
  });

  describe('create()', () => {
    it('should create a new technician', async () => {
      const newTechnician = {
        license_number: 'TECH-003',
        hourly_rate: 85.00,
        skills: ['plumbing', 'electrical'],
      };
      const createdTechnician = { id: 3, ...newTechnician, is_active: true };
      db.query.mockResolvedValue({ rows: [createdTechnician] });

      const result = await Technician.create(newTechnician);

      expect(result).toEqual(createdTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO technicians'),
        expect.any(Array),
      );
    });
  });

  describe('update()', () => {
    it('should update a technician', async () => {
      const updateData = { status: 'on_job', hourly_rate: 90.00 };
      const updatedTechnician = { id: 1, license_number: 'TECH-001', ...updateData };
      db.query.mockResolvedValue({ rows: [updatedTechnician] });

      const result = await Technician.update(1, updateData);

      expect(result).toEqual(updatedTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE technicians'),
        expect.any(Array),
      );
    });
  });

  describe('delete()', () => {
    it('should hard delete a technician', async () => {
      const deletedTechnician = { id: 1, license_number: 'TECH-001', is_active: false };
      db.query.mockResolvedValue({ rows: [deletedTechnician] });

      const result = await Technician.delete(1);

      expect(result).toEqual(deletedTechnician);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM technicians'),
        [1],
      );
    });

    it('should throw error if technician not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(Technician.delete(999)).rejects.toThrow('Failed to delete technician');
    });
  });
});
