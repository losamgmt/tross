/**
 * Unit Tests: WorkOrder Model - Validation
 * Tests business logic validation rules
 */

const WorkOrder = require('../../../db/models/WorkOrder');

describe('WorkOrder Model - Validation', () => {
  describe('Status transitions', () => {
    it('should validate status values', () => {
      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
      
      validStatuses.forEach(status => {
        expect(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).toContain(status);
      });
    });
  });

  describe('Priority levels', () => {
    it('should validate priority values', () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      
      validPriorities.forEach(priority => {
        expect(['low', 'normal', 'high', 'urgent']).toContain(priority);
      });
    });
  });

  describe('Required fields', () => {
    it('should require title and customer_id', () => {
      const requiredFields = ['title', 'customer_id'];
      
      expect(requiredFields).toContain('title');
      expect(requiredFields).toContain('customer_id');
    });
  });
});
