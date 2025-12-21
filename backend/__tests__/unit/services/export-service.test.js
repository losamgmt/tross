/**
 * Export Service Unit Tests
 */

const ExportService = require('../../../services/export-service');

// Mock dependencies
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/models', () => ({
  customer: {
    name: 'customer',
    tableName: 'customers',
    searchableFields: ['first_name', 'last_name', 'email'],
    filterableFields: ['email', 'is_active', 'status'],
    sortableFields: ['first_name', 'created_at'],
    defaultSort: { field: 'created_at', order: 'DESC' },
    fields: [
      { name: 'id', label: 'ID' },
      { name: 'first_name', label: 'First Name' },
      { name: 'last_name', label: 'Last Name' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone' },
      { name: 'is_active', label: 'Active' },
      { name: 'created_at', label: 'Created At' },
    ],
  },
  user: {
    name: 'user',
    tableName: 'users',
    searchableFields: ['email'],
    filterableFields: ['email', 'is_active'],
    sortableFields: ['email', 'created_at'],
    defaultSort: { field: 'created_at', order: 'DESC' },
    fields: [
      { name: 'id', label: 'ID' },
      { name: 'email', label: 'Email' },
      { name: 'auth0_id', label: 'Auth0 ID' }, // Should be excluded (sensitive)
      { name: 'is_active', label: 'Active' },
    ],
  },
}));

const db = require('../../../db/connection');

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToCSV()', () => {
    it('should export all non-sensitive fields by default', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '555-1234', is_active: true, created_at: '2024-01-01' },
          { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '555-5678', is_active: true, created_at: '2024-01-02' },
        ],
      });

      const result = await ExportService.exportToCSV('customer');

      expect(result).toHaveProperty('csv');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('count', 2);
      expect(result.filename).toMatch(/^customer_export_\d{4}-\d{2}-\d{2}\.csv$/);
      
      // Check CSV content
      expect(result.csv).toContain('ID,First Name,Last Name,Email,Phone,Active,Created At');
      expect(result.csv).toContain('john@example.com');
      expect(result.csv).toContain('jane@example.com');
    });

    it('should exclude sensitive fields from export', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'test@example.com', is_active: true },
        ],
      });

      const result = await ExportService.exportToCSV('user');

      // auth0_id should NOT be in the export
      expect(result.csv).not.toContain('Auth0 ID');
      expect(result.csv).not.toContain('auth0_id');
    });

    it('should export only selected fields when specified', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { first_name: 'John', email: 'john@example.com' },
        ],
      });

      const result = await ExportService.exportToCSV(
        'customer',
        {},
        null,
        ['first_name', 'email'],
      );

      expect(result.columns).toEqual(['First Name', 'Email']);
      expect(result.csv).toContain('First Name,Email');
      expect(result.csv).not.toContain('Last Name');
    });

    it('should escape CSV values with special characters', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, first_name: 'John, Jr.', last_name: 'O"Brien', email: 'john@example.com', phone: '555-1234', is_active: true, created_at: '2024-01-01' },
        ],
      });

      const result = await ExportService.exportToCSV('customer');

      // Comma in value should be quoted
      expect(result.csv).toContain('"John, Jr."');
      // Quote in value should be escaped (doubled) and quoted
      expect(result.csv).toContain('"O""Brien"');
    });

    it('should return headers only when no data', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await ExportService.exportToCSV('customer');

      expect(result.count).toBe(0);
      expect(result.csv).toContain('ID,First Name');
      expect(result.csv.split('\n').filter(Boolean).length).toBe(1); // Just header
    });

    it('should apply search filter to query', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await ExportService.exportToCSV('customer', { search: 'john' });

      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain('ILIKE');
      expect(queryCall[1]).toContain('%john%');
    });

    it('should apply field filters to query', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await ExportService.exportToCSV('customer', { filters: { status: 'active' } });

      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
    });

    it('should throw error for unknown entity', async () => {
      await expect(
        ExportService.exportToCSV('unknown_entity'),
      ).rejects.toThrow('Unknown entity: unknown_entity');
    });
  });

  describe('getExportableFields()', () => {
    it('should return all non-sensitive fields', () => {
      const fields = ExportService.getExportableFields('customer');

      expect(fields).toHaveLength(7);
      expect(fields.map(f => f.field)).toContain('first_name');
      expect(fields.map(f => f.field)).toContain('email');
    });

    it('should exclude sensitive fields', () => {
      const fields = ExportService.getExportableFields('user');

      const fieldNames = fields.map(f => f.field);
      expect(fieldNames).not.toContain('auth0_id');
    });

    it('should throw error for unknown entity', () => {
      expect(() => ExportService.getExportableFields('unknown')).toThrow(
        'Unknown entity: unknown',
      );
    });
  });
});
