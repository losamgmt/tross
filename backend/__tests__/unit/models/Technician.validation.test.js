/**
 * Technician Model - Validation Tests
 * Tests input validation, constraints, and error handling
 */

// Mock database
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

const Technician = require('../../../db/models/Technician');
const db = require('../../../db/connection');

describe('Technician Model - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('License Number Validation', () => {
    test('should reject duplicate license_number', async () => {
      db.query.mockRejectedValue({
        code: '23505',
        constraint: 'technicians_license_number_key',
        message: 'duplicate key value violates unique constraint',
      });

      await expect(
        Technician.create({ license_number: 'TECH-EXISTING' }),
      ).rejects.toThrow();
    });

    test('should reject null license_number', async () => {
      db.query.mockRejectedValue({
        code: '23502',
        message: 'null value in column "license_number" violates not-null constraint',
      });

      await expect(Technician.create({ license_number: null })).rejects.toThrow();
    });
  });

  describe('Status Validation', () => {
    test('should accept valid status values', async () => {
      const validStatuses = ['available', 'on_job', 'off_duty', 'suspended'];

      for (const status of validStatuses) {
        db.query.mockResolvedValueOnce({
          rows: [{ id: 1, license_number: 'TECH-001', status }],
        });

        const result = await Technician.create({ license_number: 'TECH-001', status });
        expect(result.status).toBe(status);
      }
    });

    test('should reject invalid status values', async () => {
      db.query.mockRejectedValue({
        code: '23514',
        message: 'new row for relation "technicians" violates check constraint',
      });

      await expect(
        Technician.create({ license_number: 'TECH-001', status: 'invalid_status' }),
      ).rejects.toThrow();
    });
  });

  describe('Field Constraints', () => {
    test('should handle missing optional fields', async () => {
      db.query.mockResolvedValue({
        rows: [{ id: 1, license_number: 'TECH-001', skills: null, certifications: null }],
      });

      const result = await Technician.create({ license_number: 'TECH-001' });

      expect(result.license_number).toBe('TECH-001');
      expect(result.skills).toBeNull();
    });

    test('should accept JSONB fields for skills and certifications', async () => {
      const skills = ['plumbing', 'electrical', 'hvac'];
      const certifications = [
        { name: 'Master Plumber', issued_by: 'State Board', expires_at: '2026-12-31' },
      ];
      db.query.mockResolvedValue({
        rows: [{ id: 1, license_number: 'TECH-001', skills, certifications }],
      });

      const result = await Technician.create({
        license_number: 'TECH-001',
        skills,
        certifications,
      });

      expect(result.skills).toEqual(skills);
      expect(result.certifications).toEqual(certifications);
    });

    test('should accept decimal hourly_rate', async () => {
      db.query.mockResolvedValue({
        rows: [{ id: 1, license_number: 'TECH-001', hourly_rate: 85.50 }],
      });

      const result = await Technician.create({
        license_number: 'TECH-001',
        hourly_rate: 85.50,
      });

      expect(result.hourly_rate).toBe(85.50);
    });
  });
});
