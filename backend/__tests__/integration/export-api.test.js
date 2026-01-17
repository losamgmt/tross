/**
 * Export API Integration Tests
 *
 * UNIFIED DATA FLOW:
 * - requirePermission reads resource from req.entityMetadata.rlsResource
 * - enforceRLS reads resource from req.entityMetadata.rlsResource
 * - extractEntity sets req.entityMetadata from URL param
 */

const request = require('supertest');
const express = require('express');
const exportRoutes = require('../../routes/export');

// Setup minimal express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware - unified signature
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { role: 'admin', userId: 1, email: 'admin@test.com' };
    next();
  },
  requireMinimumRole: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next(),
}));

// Mock RLS middleware - unified signature (no args)
jest.mock('../../middleware/row-level-security', () => ({
  enforceRLS: (req, res, next) => {
    req.rlsContext = { policy: 'all_records', userId: 1 };
    next();
  },
}));

// Mock generic-entity middleware - only extractEntity needed now
jest.mock('../../middleware/generic-entity', () => ({
  extractEntity: (req, res, next) => {
    const entity = req.params.entity;
    const allMetadata = require('../../config/models');
    
    // Normalize entity name
    const normalizedName = entity.replace(/-/g, '_');
    
    if (!allMetadata[normalizedName]) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    req.entityName = normalizedName;
    req.entityMetadata = allMetadata[normalizedName];
    next();
  },
}));

// Mock database
jest.mock('../../db/connection', () => ({
  query: jest.fn(),
}));

const db = require('../../db/connection');

// Mount routes
app.use('/api/export', exportRoutes);

describe('Export API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/export/:entity', () => {
    it('should return CSV file for customer export', async () => {
      db.query.mockResolvedValue({
        rows: [
          { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        ],
      });

      const response = await request(app)
        .get('/api/export/customer')
        .expect(200);

      // Check content type
      expect(response.headers['content-type']).toContain('text/csv');
      
      // Check content disposition for download
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
      
      // Check row count header
      expect(response.headers['x-row-count']).toBe('2');
      
      // Check CSV content
      expect(response.text).toContain('john@example.com');
      expect(response.text).toContain('jane@example.com');
    });

    it('should return CSV with headers only when no data', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/export/customer')
        .expect(200);

      expect(response.headers['x-row-count']).toBe('0');
      // Should have header row
      expect(response.text.split('\n').filter(Boolean).length).toBe(1);
    });

    it('should apply filters to export query', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/export/customer?status=active')
        .expect(200);

      // Check that filter was passed to query
      const queryCall = db.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
    });

    it('should return 404 for unknown entity', async () => {
      const response = await request(app)
        .get('/api/export/unknown_entity')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/export/:entity/fields', () => {
    it('should return list of exportable fields', async () => {
      const response = await request(app)
        .get('/api/export/customer/fields')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entity).toBe('customer');
      expect(Array.isArray(response.body.data.fields)).toBe(true);
      expect(response.body.data.fields.length).toBeGreaterThan(0);
      
      // Each field should have field and label
      const firstField = response.body.data.fields[0];
      expect(firstField).toHaveProperty('field');
      expect(firstField).toHaveProperty('label');
    });

    it('should return 404 for unknown entity', async () => {
      const response = await request(app)
        .get('/api/export/unknown_entity/fields')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });
});
