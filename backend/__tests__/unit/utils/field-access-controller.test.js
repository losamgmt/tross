/**
 * Response Transform Unit Tests
 *
 * Tests for field-level access control and response filtering.
 * This is SECURITY-CRITICAL code that ensures users only see/write
 * fields their role permits.
 *
 * @group unit
 * @group security
 */

const {
  normalizeRoleName,
  getRoleIndex,
  hasFieldPermission,
  getFieldsForOperation,
  canAccessField,
  filterDataByRole,
  filterWritableFields,
  validateFieldAccess,
  pickFields,
  omitFields,
} = require('../../../utils/field-access-controller');

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Mock metadata simulating a work order entity
 * with various field access levels
 */
const mockWorkOrderMetadata = {
  tableName: 'work_orders',
  fieldAccess: {
    id: { create: 'none', read: 'customer', update: 'none', delete: 'none' },
    work_order_number: { create: 'none', read: 'customer', update: 'none', delete: 'none' },
    summary: { create: 'customer', read: 'customer', update: 'dispatcher', delete: 'none' },
    customer_id: { create: 'customer', read: 'technician', update: 'none', delete: 'none' },
    assigned_technician_id: { create: 'dispatcher', read: 'customer', update: 'dispatcher', delete: 'none' },
    internal_notes: { create: 'dispatcher', read: 'dispatcher', update: 'dispatcher', delete: 'none' },
    admin_override: { create: 'admin', read: 'admin', update: 'admin', delete: 'admin' },
  },
};

/**
 * Sample work order data for filtering tests
 */
const sampleWorkOrder = {
  id: 1,
  work_order_number: 'WO-2025-0001',
  summary: 'Fix HVAC unit',
  customer_id: 42,
  assigned_technician_id: 5,
  internal_notes: 'Customer is difficult',
  admin_override: 'Special pricing applied',
};

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('field-access-controller', () => {
  describe('normalizeRoleName', () => {
    test('converts string roles to lowercase', () => {
      expect(normalizeRoleName('Admin')).toBe('admin');
      expect(normalizeRoleName('CUSTOMER')).toBe('customer');
      expect(normalizeRoleName('Dispatcher')).toBe('dispatcher');
    });

    test('maps priority numbers to role names', () => {
      expect(normalizeRoleName(1)).toBe('customer');
      expect(normalizeRoleName(2)).toBe('technician');
      expect(normalizeRoleName(3)).toBe('dispatcher');
      expect(normalizeRoleName(4)).toBe('manager');
      expect(normalizeRoleName(5)).toBe('admin');
    });

    test('defaults to customer for unknown values', () => {
      expect(normalizeRoleName(99)).toBe('customer');
      expect(normalizeRoleName(null)).toBe('customer');
      expect(normalizeRoleName(undefined)).toBe('customer');
    });
  });

  describe('getRoleIndex', () => {
    test('returns correct hierarchy index for roles', () => {
      expect(getRoleIndex('customer')).toBe(0);
      expect(getRoleIndex('technician')).toBe(1);
      expect(getRoleIndex('dispatcher')).toBe(2);
      expect(getRoleIndex('manager')).toBe(3);
      expect(getRoleIndex('admin')).toBe(4);
    });

    test('handles priority numbers', () => {
      expect(getRoleIndex(1)).toBe(0); // customer
      expect(getRoleIndex(5)).toBe(4); // admin
    });

    test('returns -1 for unknown roles', () => {
      expect(getRoleIndex('unknown')).toBe(-1);
    });
  });

  describe('hasFieldPermission', () => {
    test('returns false when required role is none', () => {
      expect(hasFieldPermission('admin', 'none')).toBe(false);
    });

    test('customer can access customer-level fields', () => {
      expect(hasFieldPermission('customer', 'customer')).toBe(true);
    });

    test('higher roles can access lower-level fields', () => {
      expect(hasFieldPermission('admin', 'customer')).toBe(true);
      expect(hasFieldPermission('manager', 'technician')).toBe(true);
      expect(hasFieldPermission('dispatcher', 'customer')).toBe(true);
    });

    test('lower roles cannot access higher-level fields', () => {
      expect(hasFieldPermission('customer', 'dispatcher')).toBe(false);
      expect(hasFieldPermission('technician', 'manager')).toBe(false);
      expect(hasFieldPermission('dispatcher', 'admin')).toBe(false);
    });

    test('handles role priority numbers', () => {
      expect(hasFieldPermission(5, 'customer')).toBe(true); // admin
      expect(hasFieldPermission(1, 'admin')).toBe(false);   // customer
    });
  });

  // =============================================================================
  // FIELD ACCESS TESTS
  // =============================================================================

  describe('getFieldsForOperation', () => {
    test('customer can only read customer-level fields', () => {
      const fields = getFieldsForOperation(mockWorkOrderMetadata, 'customer', 'read');
      expect(fields).toContain('id');
      expect(fields).toContain('work_order_number');
      expect(fields).toContain('summary');
      expect(fields).toContain('assigned_technician_id');
      expect(fields).not.toContain('internal_notes'); // dispatcher+
      expect(fields).not.toContain('admin_override'); // admin only
    });

    test('dispatcher can read dispatcher-level fields', () => {
      const fields = getFieldsForOperation(mockWorkOrderMetadata, 'dispatcher', 'read');
      expect(fields).toContain('internal_notes');
      expect(fields).not.toContain('admin_override');
    });

    test('admin can read all fields', () => {
      const fields = getFieldsForOperation(mockWorkOrderMetadata, 'admin', 'read');
      expect(fields).toContain('id');
      expect(fields).toContain('internal_notes');
      expect(fields).toContain('admin_override');
    });

    test('customer can create customer-level fields only', () => {
      const fields = getFieldsForOperation(mockWorkOrderMetadata, 'customer', 'create');
      expect(fields).toContain('summary');
      expect(fields).toContain('customer_id');
      expect(fields).not.toContain('assigned_technician_id'); // dispatcher
      expect(fields).not.toContain('id'); // none
    });

    test('dispatcher can create dispatcher-level fields', () => {
      const fields = getFieldsForOperation(mockWorkOrderMetadata, 'dispatcher', 'create');
      expect(fields).toContain('summary');
      expect(fields).toContain('assigned_technician_id');
      expect(fields).toContain('internal_notes');
    });
  });

  describe('canAccessField', () => {
    test('returns true when user has permission', () => {
      expect(canAccessField(mockWorkOrderMetadata, 'customer', 'summary', 'read')).toBe(true);
      expect(canAccessField(mockWorkOrderMetadata, 'dispatcher', 'internal_notes', 'read')).toBe(true);
    });

    test('returns false when user lacks permission', () => {
      expect(canAccessField(mockWorkOrderMetadata, 'customer', 'internal_notes', 'read')).toBe(false);
      expect(canAccessField(mockWorkOrderMetadata, 'technician', 'admin_override', 'read')).toBe(false);
    });

    test('returns false for undefined fields', () => {
      expect(canAccessField(mockWorkOrderMetadata, 'admin', 'nonexistent_field', 'read')).toBe(false);
    });
  });

  // =============================================================================
  // DATA FILTERING TESTS (SECURITY CRITICAL)
  // =============================================================================

  describe('filterDataByRole', () => {
    test('customer sees only customer-readable fields', () => {
      const filtered = filterDataByRole(sampleWorkOrder, mockWorkOrderMetadata, 'customer', 'read');
      
      expect(filtered.id).toBe(1);
      expect(filtered.work_order_number).toBe('WO-2025-0001');
      expect(filtered.summary).toBe('Fix HVAC unit');
      expect(filtered.assigned_technician_id).toBe(5);
      // Should NOT include these
      expect(filtered.internal_notes).toBeUndefined();
      expect(filtered.admin_override).toBeUndefined();
    });

    test('technician sees technician-readable fields', () => {
      const filtered = filterDataByRole(sampleWorkOrder, mockWorkOrderMetadata, 'technician', 'read');
      
      expect(filtered.customer_id).toBe(42);
      expect(filtered.internal_notes).toBeUndefined(); // dispatcher+
    });

    test('dispatcher sees dispatcher-readable fields', () => {
      const filtered = filterDataByRole(sampleWorkOrder, mockWorkOrderMetadata, 'dispatcher', 'read');
      
      expect(filtered.internal_notes).toBe('Customer is difficult');
      expect(filtered.admin_override).toBeUndefined(); // admin only
    });

    test('admin sees all fields', () => {
      const filtered = filterDataByRole(sampleWorkOrder, mockWorkOrderMetadata, 'admin', 'read');
      
      expect(filtered.id).toBe(1);
      expect(filtered.internal_notes).toBe('Customer is difficult');
      expect(filtered.admin_override).toBe('Special pricing applied');
    });

    test('filters arrays of records', () => {
      const records = [sampleWorkOrder, { ...sampleWorkOrder, id: 2 }];
      const filtered = filterDataByRole(records, mockWorkOrderMetadata, 'customer', 'read');
      
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBe(2);
      expect(filtered[0].internal_notes).toBeUndefined();
      expect(filtered[1].internal_notes).toBeUndefined();
    });
  });

  describe('filterWritableFields', () => {
    test('customer can only write customer-creatable fields', () => {
      const input = {
        summary: 'New summary',
        customer_id: 42,
        assigned_technician_id: 5, // dispatcher only
        internal_notes: 'Hacking attempt', // dispatcher only
      };
      
      const filtered = filterWritableFields(input, mockWorkOrderMetadata, 'customer', 'create');
      
      expect(filtered.summary).toBe('New summary');
      expect(filtered.customer_id).toBe(42);
      expect(filtered.assigned_technician_id).toBeUndefined();
      expect(filtered.internal_notes).toBeUndefined();
    });

    test('dispatcher can write dispatcher-level fields', () => {
      const input = {
        summary: 'Updated',
        assigned_technician_id: 5,
        internal_notes: 'Notes',
        admin_override: 'Hacking', // admin only
      };
      
      const filtered = filterWritableFields(input, mockWorkOrderMetadata, 'dispatcher', 'update');
      
      expect(filtered.summary).toBe('Updated');
      expect(filtered.assigned_technician_id).toBe(5);
      expect(filtered.internal_notes).toBe('Notes');
      expect(filtered.admin_override).toBeUndefined();
    });
  });

  describe('validateFieldAccess', () => {
    test('does not throw when user has permission for all fields', () => {
      const data = { summary: 'Test' };
      expect(() => {
        validateFieldAccess(data, mockWorkOrderMetadata, 'customer', 'create');
      }).not.toThrow();
    });

    test('throws when user lacks permission for any field', () => {
      const data = { 
        summary: 'Test',
        assigned_technician_id: 5, // dispatcher only
      };
      expect(() => {
        validateFieldAccess(data, mockWorkOrderMetadata, 'customer', 'create');
      }).toThrow(/assigned_technician_id/);
    });

    test('error message includes role and operation', () => {
      const data = { internal_notes: 'Hack' };
      expect(() => {
        validateFieldAccess(data, mockWorkOrderMetadata, 'customer', 'create');
      }).toThrow(/customer.*create/i);
    });
  });

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================

  describe('pickFields', () => {
    test('picks only specified fields', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pickFields(obj, new Set(['a', 'c']));
      expect(result).toEqual({ a: 1, c: 3 });
    });

    test('handles missing fields gracefully', () => {
      const obj = { a: 1 };
      const result = pickFields(obj, new Set(['a', 'b']));
      expect(result).toEqual({ a: 1 });
    });

    test('returns input for non-objects', () => {
      expect(pickFields(null, new Set(['a']))).toBe(null);
      expect(pickFields(undefined, new Set(['a']))).toBe(undefined);
      expect(pickFields(42, new Set(['a']))).toBe(42);
    });
  });

  describe('omitFields', () => {
    test('omits specified fields', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omitFields(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    test('handles missing fields gracefully', () => {
      const obj = { a: 1, b: 2 };
      const result = omitFields(obj, ['c', 'd']);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('returns input for non-objects', () => {
      expect(omitFields(null, ['a'])).toBe(null);
      expect(omitFields(undefined, ['a'])).toBe(undefined);
    });
  });
});
