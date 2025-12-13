/**
 * Generic Entity Service Tests
 *
 * Tests the metadata-driven generic CRUD service
 *
 * MOCKING STRATEGY (uses centralized mocks ONLY):
 * - db/connection: createDBMock() from __tests__/mocks
 * - config/logger: createLoggerMock() from __tests__/mocks
 * - type-coercion: NOT mocked (pure function, no side effects)
 * - PaginationService: NOT mocked (pure functions, no side effects)
 * - QueryBuilderService: NOT mocked (pure functions, no side effects)
 *
 * Coverage:
 * - Step 1.1: _getMetadata - metadata lookup foundation
 * - Step 1.2: findById - single entity retrieval by primary key
 * - Step 1.3: findAll - paginated list retrieval with search/filter/sort
 * - Step 1.4: create - new entity creation with field validation
 * - Step 1.5: update - entity update with field validation
 */

// ============================================================================
// CENTRALIZED MOCKS - inline require() pattern per Jest hoisting rules
// ============================================================================
jest.mock('../../../db/connection', () => require('../../mocks').createDBMock());
jest.mock('../../../config/logger', () => ({
  logger: require('../../mocks').createLoggerMock(),
}));

// ============================================================================
// IMPORTS - After mocks are set up
// ============================================================================
const GenericEntityService = require('../../../services/generic-entity-service');
const db = require('../../../db/connection');

describe('GenericEntityService', () => {
  // ==========================================================================
  // _getMetadata TESTS
  // ==========================================================================

  describe('_getMetadata', () => {
    // ------------------------------------------------------------------------
    // Happy Path: Valid Entities
    // ------------------------------------------------------------------------

    describe('valid entities', () => {
      test('should return metadata for "user" entity', () => {
        const metadata = GenericEntityService._getMetadata('user');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('users');
        expect(metadata.primaryKey).toBe('id');
        expect(metadata.identityField).toBe('email');
      });

      test('should return metadata for "role" entity', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('roles');
        expect(metadata.identityField).toBe('name');
      });

      test('should return metadata for "customer" entity', () => {
        const metadata = GenericEntityService._getMetadata('customer');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('customers');
        expect(metadata.identityField).toBe('email');
      });

      test('should return metadata for "technician" entity', () => {
        const metadata = GenericEntityService._getMetadata('technician');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('technicians');
        expect(metadata.identityField).toBe('license_number');
      });

      test('should return metadata for "workOrder" entity', () => {
        const metadata = GenericEntityService._getMetadata('workOrder');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('work_orders');
        expect(metadata.identityField).toBe('title');
      });

      test('should return metadata for "invoice" entity', () => {
        const metadata = GenericEntityService._getMetadata('invoice');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('invoices');
        expect(metadata.identityField).toBe('invoice_number');
      });

      test('should return metadata for "contract" entity', () => {
        const metadata = GenericEntityService._getMetadata('contract');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('contracts');
        expect(metadata.identityField).toBe('contract_number');
      });

      test('should return metadata for "inventory" entity', () => {
        const metadata = GenericEntityService._getMetadata('inventory');

        expect(metadata).toBeDefined();
        expect(metadata.tableName).toBe('inventory');
        expect(metadata.identityField).toBe('name');
      });
    });

    // ------------------------------------------------------------------------
    // Case Handling
    // ------------------------------------------------------------------------

    describe('case handling', () => {
      test('should preserve case for camelCase entity names', () => {
        const metadata = GenericEntityService._getMetadata('workOrder');
        expect(metadata.tableName).toBe('work_orders');
      });

      test('should handle entity name with whitespace', () => {
        const metadata = GenericEntityService._getMetadata('  user  ');
        expect(metadata.tableName).toBe('users');
      });

      test('should match exact case from metadata keys', () => {
        // These are the exact keys from config/models/index.js
        expect(() => GenericEntityService._getMetadata('user')).not.toThrow();
        expect(() => GenericEntityService._getMetadata('role')).not.toThrow();
        expect(() => GenericEntityService._getMetadata('workOrder')).not.toThrow();
        expect(() => GenericEntityService._getMetadata('inventory')).not.toThrow();
      });
    });

    // ------------------------------------------------------------------------
    // CRUD Properties Verification
    // ------------------------------------------------------------------------

    describe('CRUD properties present', () => {
      test('should have requiredFields property', () => {
        const metadata = GenericEntityService._getMetadata('user');

        expect(metadata.requiredFields).toBeDefined();
        expect(Array.isArray(metadata.requiredFields)).toBe(true);
      });

      test('should have immutableFields property', () => {
        // Phase 4: Exclusion pattern - immutableFields defines what CANNOT be updated
        const metadata = GenericEntityService._getMetadata('user');

        expect(metadata.immutableFields).toBeDefined();
        expect(Array.isArray(metadata.immutableFields)).toBe(true);
      });

      test('should have rlsResource property', () => {
        const metadata = GenericEntityService._getMetadata('user');

        expect(metadata.rlsResource).toBeDefined();
        expect(typeof metadata.rlsResource).toBe('string');
      });
    });

    // ------------------------------------------------------------------------
    // System Protection Properties (role-specific)
    // ------------------------------------------------------------------------

    describe('systemProtected configuration', () => {
      test('role metadata should have systemProtected property', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected).toBeDefined();
        expect(typeof metadata.systemProtected).toBe('object');
      });

      test('systemProtected should have values array', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected.values).toBeDefined();
        expect(Array.isArray(metadata.systemProtected.values)).toBe(true);
        expect(metadata.systemProtected.values.length).toBeGreaterThan(0);
      });

      test('systemProtected values should include all 5 system roles', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected.values).toContain('admin');
        expect(metadata.systemProtected.values).toContain('manager');
        expect(metadata.systemProtected.values).toContain('dispatcher');
        expect(metadata.systemProtected.values).toContain('technician');
        expect(metadata.systemProtected.values).toContain('customer');
      });

      test('systemProtected should have immutableFields array', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected.immutableFields).toBeDefined();
        expect(Array.isArray(metadata.systemProtected.immutableFields)).toBe(true);
      });

      test('immutableFields should include name and priority', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected.immutableFields).toContain('name');
        expect(metadata.systemProtected.immutableFields).toContain('priority');
      });

      test('systemProtected should have preventDelete flag', () => {
        const metadata = GenericEntityService._getMetadata('role');

        expect(metadata.systemProtected.preventDelete).toBeDefined();
        expect(metadata.systemProtected.preventDelete).toBe(true);
      });

      test('user metadata should NOT have systemProtected (only roles)', () => {
        const metadata = GenericEntityService._getMetadata('user');

        expect(metadata.systemProtected).toBeUndefined();
      });
    });

    // ------------------------------------------------------------------------
    // Error Cases
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw for unknown entity name', () => {
        expect(() => {
          GenericEntityService._getMetadata('nonexistent');
        }).toThrow('Unknown entity: nonexistent');
      });

      test('should include valid entities in error message', () => {
        expect(() => {
          GenericEntityService._getMetadata('invalid');
        }).toThrow(/Valid entities:/);
      });

      test('should throw for null entity name', () => {
        expect(() => {
          GenericEntityService._getMetadata(null);
        }).toThrow('Entity name is required and must be a string');
      });

      test('should throw for undefined entity name', () => {
        expect(() => {
          GenericEntityService._getMetadata(undefined);
        }).toThrow('Entity name is required and must be a string');
      });

      test('should throw for empty string entity name', () => {
        expect(() => {
          GenericEntityService._getMetadata('');
        }).toThrow('Entity name is required and must be a string');
      });

      test('should throw for non-string entity name (number)', () => {
        expect(() => {
          GenericEntityService._getMetadata(123);
        }).toThrow('Entity name is required and must be a string');
      });

      test('should throw for non-string entity name (object)', () => {
        expect(() => {
          GenericEntityService._getMetadata({ name: 'user' });
        }).toThrow('Entity name is required and must be a string');
      });

      test('should throw for non-string entity name (array)', () => {
        expect(() => {
          GenericEntityService._getMetadata(['user']);
        }).toThrow('Entity name is required and must be a string');
      });
    });
  });

  // ==========================================================================
  // findById TESTS
  // ==========================================================================

  describe('findById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ------------------------------------------------------------------------
    // Happy Path: Entity Found
    // ------------------------------------------------------------------------

    describe('entity found', () => {
      test('should return user entity by ID', async () => {
        // Arrange
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
        };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findById('user', 1);

        // Assert
        expect(result).toEqual(mockUser);
        // findById delegates to findByField with table-prefixed columns and JOINs
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('SELECT users.*');
        expect(query).toContain('FROM users');
        expect(query).toContain('WHERE users.id = $1');
        expect(query).toContain('LEFT JOIN roles'); // user has defaultIncludes: ['role']
        expect(query).toContain('LIMIT 1');
        expect(params).toEqual([1]);
      });

      test('should return role entity by ID', async () => {
        // Arrange
        const mockRole = {
          id: 5,
          name: 'Admin',
          is_active: true,
          status: 'active',
        };
        db.query.mockResolvedValue({ rows: [mockRole] });

        // Act
        const result = await GenericEntityService.findById('role', 5);

        // Assert
        expect(result).toEqual(mockRole);
        // findById delegates to findByField with table-prefixed columns
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('SELECT roles.*');
        expect(query).toContain('FROM roles');
        expect(query).toContain('WHERE roles.id = $1');
        expect(query).toContain('LIMIT 1');
        expect(params).toEqual([5]);
      });

      test('should return workOrder entity by ID', async () => {
        // Arrange
        const mockWorkOrder = {
          id: 42,
          title: 'Fix HVAC',
          status: 'pending',
        };
        db.query.mockResolvedValue({ rows: [mockWorkOrder] });

        // Act
        const result = await GenericEntityService.findById('workOrder', 42);

        // Assert
        expect(result).toEqual(mockWorkOrder);
        // findById delegates to findByField with table-prefixed columns
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('SELECT work_orders.*');
        expect(query).toContain('FROM work_orders');
        expect(query).toContain('WHERE work_orders.id = $1');
        expect(query).toContain('LIMIT 1');
        expect(params).toEqual([42]);
      });
    });

    // ------------------------------------------------------------------------
    // Entity Not Found
    // ------------------------------------------------------------------------

    describe('entity not found', () => {
      test('should return null when entity does not exist', async () => {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });

        // Act
        const result = await GenericEntityService.findById('user', 999);

        // Assert
        expect(result).toBeNull();
      });
    });

    // ------------------------------------------------------------------------
    // ID Type Coercion
    // ------------------------------------------------------------------------

    describe('ID type coercion', () => {
      test('should coerce string ID to integer', async () => {
        // Arrange
        const mockUser = { id: 123, email: 'test@example.com' };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findById('user', '123');

        // Assert
        expect(result).toEqual(mockUser);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(params).toEqual([123]); // Integer, not string
      });

      test('should coerce float to integer (truncated)', async () => {
        // Arrange
        const mockUser = { id: 42, email: 'test@example.com' };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findById('user', 42.9);

        // Assert
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(params).toEqual([42]); // Truncated to integer
      });
    });

    // ------------------------------------------------------------------------
    // Error Cases
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw for invalid entity name', async () => {
        await expect(
          GenericEntityService.findById('nonexistent', 1),
        ).rejects.toThrow('Unknown entity: nonexistent');
      });

      test('should throw for null ID', async () => {
        await expect(
          GenericEntityService.findById('user', null),
        ).rejects.toThrow('id is required');
      });

      test('should throw for undefined ID', async () => {
        await expect(
          GenericEntityService.findById('user', undefined),
        ).rejects.toThrow('id is required');
      });

      test('should throw for non-numeric string ID', async () => {
        await expect(
          GenericEntityService.findById('user', 'abc'),
        ).rejects.toThrow('id must be a valid integer');
      });

      test('should throw for negative ID', async () => {
        await expect(
          GenericEntityService.findById('user', -5),
        ).rejects.toThrow('id must be at least 1');
      });

      test('should throw for zero ID', async () => {
        await expect(
          GenericEntityService.findById('user', 0),
        ).rejects.toThrow('id must be at least 1');
      });

      test('should propagate database errors', async () => {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          GenericEntityService.findById('user', 1),
        ).rejects.toThrow('Connection refused');
      });
    });

    // ------------------------------------------------------------------------
    // Query Structure Verification
    // ------------------------------------------------------------------------

    describe('query structure', () => {
      test('should use correct table name from metadata', async () => {
        db.query.mockResolvedValue({ rows: [] });

        // Test multiple entities to verify table name resolution
        // findById delegates to findByField with table-prefixed columns
        await GenericEntityService.findById('customer', 1);
        let [query] = db.query.mock.calls[db.query.mock.calls.length - 1];
        expect(query).toContain('FROM customers');
        expect(query).toContain('WHERE customers.id = $1');

        await GenericEntityService.findById('technician', 2);
        [query] = db.query.mock.calls[db.query.mock.calls.length - 1];
        expect(query).toContain('FROM technicians');
        expect(query).toContain('WHERE technicians.id = $1');

        await GenericEntityService.findById('invoice', 3);
        [query] = db.query.mock.calls[db.query.mock.calls.length - 1];
        expect(query).toContain('FROM invoices');
        expect(query).toContain('WHERE invoices.id = $1');

        await GenericEntityService.findById('contract', 4);
        [query] = db.query.mock.calls[db.query.mock.calls.length - 1];
        expect(query).toContain('FROM contracts');
        expect(query).toContain('WHERE contracts.id = $1');

        await GenericEntityService.findById('inventory', 5);
        [query] = db.query.mock.calls[db.query.mock.calls.length - 1];
        expect(query).toContain('FROM inventory');
        expect(query).toContain('WHERE inventory.id = $1');
      });

      test('should use correct primary key from metadata', async () => {
        db.query.mockResolvedValue({ rows: [] });

        // All our entities use 'id' as primary key, but test verifies
        // the query uses metadata.primaryKey (table-prefixed in findByField)
        await GenericEntityService.findById('user', 100);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(params).toEqual([100]);
      });

      test('should use parameterized query to prevent SQL injection', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await GenericEntityService.findById('user', 1);

        // Verify query uses $1 placeholder with table-prefixed columns
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(query).toContain('LIMIT 1');
        expect(params).toEqual([1]);
        // The ID value (1) is in params array, not interpolated into query string
        expect(params[0]).toBe(1);
      });
    });

    // ------------------------------------------------------------------------
    // RLS (Row-Level Security) Integration
    // ------------------------------------------------------------------------

    describe('RLS integration', () => {
      test('should apply own_record_only RLS filter', async () => {
        // Arrange
        const mockUser = { id: 42, email: 'test@example.com' };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findById('user', 42, {
          policy: 'own_record_only',
          userId: 42,
        });

        // Assert
        expect(result).toEqual(mockUser);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(query).toContain('AND id = $2'); // RLS filter
        expect(params).toEqual([42, 42]);
      });

      test('should apply all_records RLS (no additional filter)', async () => {
        // Arrange
        const mockUser = { id: 1, email: 'admin@example.com' };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findById('user', 1, {
          policy: 'all_records',
          userId: 99,
        });

        // Assert
        expect(result).toEqual(mockUser);
        // all_records should not add any filter beyond the base WHERE
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(query).not.toContain('AND id = $2'); // No additional RLS filter
        expect(params).toEqual([1]);
      });

      test('should apply deny_all RLS (always returns null)', async () => {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });

        // Act
        const result = await GenericEntityService.findById('invoice', 1, {
          policy: 'deny_all',
          userId: 99,
        });

        // Assert
        expect(result).toBeNull();
        // deny_all adds WHERE 1=0
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE invoices.id = $1');
        expect(query).toContain('AND 1=0');
        expect(params).toEqual([1]);
      });

      test('should work without RLS context (backward compatible)', async () => {
        // Arrange
        const mockUser = { id: 1, email: 'test@example.com' };
        db.query.mockResolvedValue({ rows: [mockUser] });

        // Act - no rlsContext parameter
        const result = await GenericEntityService.findById('user', 1);

        // Assert - should work with table-prefixed columns
        expect(result).toEqual(mockUser);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('SELECT users.*');
        expect(query).toContain('WHERE users.id = $1');
        expect(params).toEqual([1]);
      });

      test('should return null when RLS blocks access to existing record', async () => {
        // Arrange: User 42 exists but user 99 tries to access it
        db.query.mockResolvedValue({ rows: [] }); // RLS filter returns no rows

        // Act
        const result = await GenericEntityService.findById('user', 42, {
          policy: 'own_record_only',
          userId: 99, // Different user
        });

        // Assert
        expect(result).toBeNull();
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE users.id = $1');
        expect(query).toContain('AND id = $2');
        expect(params).toEqual([42, 99]);
      });

      test('should apply assigned_work_orders_only RLS for technicians', async () => {
        // Arrange
        const mockWorkOrder = { id: 10, title: 'Fix AC', assigned_technician_id: 5 };
        db.query.mockResolvedValue({ rows: [mockWorkOrder] });

        // Act
        const result = await GenericEntityService.findById('workOrder', 10, {
          policy: 'assigned_work_orders_only',
          userId: 5,
        });

        // Assert
        expect(result).toEqual(mockWorkOrder);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE work_orders.id = $1');
        expect(query).toContain('AND assigned_technician_id = $2');
        expect(params).toEqual([10, 5]);
      });

      test('should apply own_work_orders_only RLS for customers', async () => {
        // Arrange
        const mockWorkOrder = { id: 10, title: 'Fix AC', customer_id: 42 };
        db.query.mockResolvedValue({ rows: [mockWorkOrder] });

        // Act
        const result = await GenericEntityService.findById('workOrder', 10, {
          policy: 'own_work_orders_only',
          userId: 42,
        });

        // Assert
        expect(result).toEqual(mockWorkOrder);
        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain('WHERE work_orders.id = $1');
        expect(query).toContain('AND customer_id = $2');
        expect(params).toEqual([10, 42]);
      });
    });
  });

  // ==========================================================================
  // findAll TESTS
  // ==========================================================================

  describe('findAll', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ------------------------------------------------------------------------
    // Happy Path: Basic Pagination
    // ------------------------------------------------------------------------

    describe('basic pagination', () => {
      test('should return paginated results with default options', async () => {
        // Arrange
        const mockUsers = [
          { id: 1, email: 'user1@test.com', is_active: true },
          { id: 2, email: 'user2@test.com', is_active: true },
        ];
        // COUNT query first, then SELECT query
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          .mockResolvedValueOnce({ rows: mockUsers });

        // Act
        const result = await GenericEntityService.findAll('user');

        // Assert
        expect(result.data).toEqual(mockUsers);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });
      });

      test('should respect custom page and limit', async () => {
        // Arrange
        const mockUsers = [{ id: 51, email: 'user51@test.com' }];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '100' }] })
          .mockResolvedValueOnce({ rows: mockUsers });

        // Act
        const result = await GenericEntityService.findAll('user', {
          page: 2,
          limit: 50,
        });

        // Assert
        expect(result.pagination.page).toBe(2);
        expect(result.pagination.limit).toBe(50);
        expect(result.pagination.total).toBe(100);
        expect(result.pagination.totalPages).toBe(2);
        expect(result.pagination.hasNext).toBe(false);
        expect(result.pagination.hasPrev).toBe(true);
      });

      test('should include LIMIT and OFFSET in query', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '100' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await GenericEntityService.findAll('user', { page: 3, limit: 25 });

        // Assert - check the SELECT query (second call)
        const selectQuery = db.query.mock.calls[1][0];
        expect(selectQuery).toContain('LIMIT 25');
        expect(selectQuery).toContain('OFFSET 50'); // (page 3 - 1) * 25 = 50
      });
    });

    // ------------------------------------------------------------------------
    // is_active Filtering
    // ------------------------------------------------------------------------

    describe('is_active filtering', () => {
      test('should filter by is_active=true by default', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await GenericEntityService.findAll('user');

        // Assert - both queries should include is_active filter
        const countQuery = db.query.mock.calls[0][0];
        const selectQuery = db.query.mock.calls[1][0];
        expect(countQuery).toContain('WHERE');
        expect(selectQuery).toContain('WHERE');
      });

      test('should include inactive when includeInactive=true', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '10' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll('user', {
          includeInactive: true,
        });

        // Assert
        expect(result.appliedFilters.filters.is_active).toBeUndefined();
      });
    });

    // ------------------------------------------------------------------------
    // Sorting
    // ------------------------------------------------------------------------

    describe('sorting', () => {
      test('should use default sort when not specified', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await GenericEntityService.findAll('role');

        // Assert - check the SELECT query has ORDER BY
        const selectQuery = db.query.mock.calls[1][0];
        expect(selectQuery).toContain('ORDER BY');
      });

      test('should track applied sort in response', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll('user', {
          sortBy: 'email',
          sortOrder: 'DESC',
        });

        // Assert
        expect(result.appliedFilters.sortBy).toBe('email');
        expect(result.appliedFilters.sortOrder).toBe('DESC');
      });
    });

    // ------------------------------------------------------------------------
    // Response Structure
    // ------------------------------------------------------------------------

    describe('response structure', () => {
      test('should return data, pagination, and appliedFilters', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll('customer');

        // Assert
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(result).toHaveProperty('appliedFilters');
        expect(Array.isArray(result.data)).toBe(true);
      });

      test('should track search term in appliedFilters', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll('user', {
          search: 'john',
        });

        // Assert
        expect(result.appliedFilters.search).toBe('john');
      });

      test('should track filters in appliedFilters', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll('role', {
          filters: { priority: 5 },
        });

        // Assert
        expect(result.appliedFilters.filters).toHaveProperty('priority', 5);
      });
    });

    // ------------------------------------------------------------------------
    // Multiple Entities
    // ------------------------------------------------------------------------

    describe('works with all entities', () => {
      test('should query correct table for each entity', async () => {
        // Arrange
        db.query
          .mockResolvedValue({ rows: [{ total: '0' }] });

        // Act & Assert - test a sampling of entities
        const entities = [
          { name: 'user', table: 'users' },
          { name: 'role', table: 'roles' },
          { name: 'customer', table: 'customers' },
          { name: 'workOrder', table: 'work_orders' },
          { name: 'inventory', table: 'inventory' },
        ];

        for (const entity of entities) {
          jest.clearAllMocks();
          db.query
            .mockResolvedValueOnce({ rows: [{ total: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

          await GenericEntityService.findAll(entity.name);

          const countQuery = db.query.mock.calls[0][0];
          expect(countQuery).toContain(`FROM ${entity.table}`);
        }
      });
    });

    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw for invalid entity name', async () => {
        await expect(
          GenericEntityService.findAll('nonexistent'),
        ).rejects.toThrow('Unknown entity: nonexistent');
      });

      test('should propagate database errors', async () => {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          GenericEntityService.findAll('user'),
        ).rejects.toThrow('Connection refused');
      });
    });

    // ------------------------------------------------------------------------
    // Query Structure
    // ------------------------------------------------------------------------

    describe('query structure', () => {
      test('should execute COUNT query before SELECT query', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await GenericEntityService.findAll('user');

        // Assert - COUNT should be first call
        expect(db.query).toHaveBeenCalledTimes(2);
        const countQuery = db.query.mock.calls[0][0];
        const selectQuery = db.query.mock.calls[1][0];
        expect(countQuery).toContain('COUNT(*)');
        // findAll uses table-prefixed columns with optional JOINs
        expect(selectQuery).toContain('SELECT users.*');
        expect(selectQuery).toContain('FROM users');
      });

      test('should use parameterized queries', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await GenericEntityService.findAll('user');

        // Assert - params should be arrays (for parameterized queries)
        const [, countParams] = db.query.mock.calls[0];
        const [, selectParams] = db.query.mock.calls[1];
        expect(Array.isArray(countParams)).toBe(true);
        expect(Array.isArray(selectParams)).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // RLS (Row-Level Security) Integration
    // ------------------------------------------------------------------------

    describe('RLS integration', () => {
      test('should apply own_record_only RLS filter to findAll', async () => {
        // Arrange
        const mockUser = { id: 42, email: 'test@example.com', is_active: true };
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [mockUser] });

        // Act
        const result = await GenericEntityService.findAll(
          'user',
          { page: 1, limit: 10 },
          { policy: 'own_record_only', userId: 42 }
        );

        // Assert
        expect(result.data).toEqual([mockUser]);
        // Check the SELECT query includes RLS filter
        const selectQuery = db.query.mock.calls[1][0];
        const selectParams = db.query.mock.calls[1][1];
        expect(selectQuery).toContain('id =');
        expect(selectParams).toContain(42);
      });

      test('should apply all_records RLS (no additional filter)', async () => {
        // Arrange
        const mockUsers = [
          { id: 1, email: 'admin@example.com', is_active: true },
          { id: 2, email: 'user@example.com', is_active: true },
        ];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          .mockResolvedValueOnce({ rows: mockUsers });

        // Act
        const result = await GenericEntityService.findAll(
          'user',
          { page: 1, limit: 10 },
          { policy: 'all_records', userId: 1 }
        );

        // Assert
        expect(result.data).toEqual(mockUsers);
        expect(result.pagination.total).toBe(2);
      });

      test('should apply deny_all RLS (returns empty array)', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        const result = await GenericEntityService.findAll(
          'invoice',
          { page: 1, limit: 10 },
          { policy: 'deny_all', userId: 99 }
        );

        // Assert
        expect(result.data).toEqual([]);
        expect(result.pagination.total).toBe(0);
        // Check the query includes 1=0
        const countQuery = db.query.mock.calls[0][0];
        expect(countQuery).toContain('1=0');
      });

      test('should work without RLS context (backward compatible)', async () => {
        // Arrange
        const mockUsers = [{ id: 1, email: 'test@example.com', is_active: true }];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: mockUsers });

        // Act - no rlsContext parameter
        const result = await GenericEntityService.findAll('user', { page: 1 });

        // Assert
        expect(result.data).toEqual(mockUsers);
      });

      test('should combine RLS filter with search and other filters', async () => {
        // Arrange
        const mockWorkOrders = [
          { id: 1, title: 'Fix AC', customer_id: 42, is_active: true },
        ];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: mockWorkOrders });

        // Act - customer searching their own work orders
        const result = await GenericEntityService.findAll(
          'workOrder',
          { page: 1, limit: 10, search: 'Fix' },
          { policy: 'own_work_orders_only', userId: 42 }
        );

        // Assert
        expect(result.data).toEqual(mockWorkOrders);
        // Should have both search params and RLS params
        const selectParams = db.query.mock.calls[1][1];
        expect(selectParams).toContain('%Fix%'); // Search param
        expect(selectParams).toContain(42); // RLS userId param
      });

      test('should apply assigned_work_orders_only for technicians', async () => {
        // Arrange
        const mockWorkOrders = [
          { id: 10, title: 'Repair', assigned_technician_id: 5, is_active: true },
        ];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: mockWorkOrders });

        // Act
        const result = await GenericEntityService.findAll(
          'workOrder',
          { page: 1 },
          { policy: 'assigned_work_orders_only', userId: 5 }
        );

        // Assert
        expect(result.data).toEqual(mockWorkOrders);
        const selectQuery = db.query.mock.calls[1][0];
        expect(selectQuery).toContain('assigned_technician_id =');
      });

      test('should apply own_invoices_only for customers', async () => {
        // Arrange
        const mockInvoices = [
          { id: 1, invoice_number: 'INV-001', customer_id: 100, is_active: true },
        ];
        db.query
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: mockInvoices });

        // Act
        const result = await GenericEntityService.findAll(
          'invoice',
          { page: 1 },
          { policy: 'own_invoices_only', userId: 100 }
        );

        // Assert
        expect(result.data).toEqual(mockInvoices);
        const selectQuery = db.query.mock.calls[1][0];
        expect(selectQuery).toContain('customer_id =');
      });
    });
  });

  // ==========================================================================
  // create TESTS
  // ==========================================================================

  describe('create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ------------------------------------------------------------------------
    // Happy Path: Successful Creation
    // ------------------------------------------------------------------------

    describe('successful creation', () => {
      test('should create entity with required fields only', async () => {
        // Arrange
        const createdCustomer = {
          id: 1,
          email: 'test@example.com',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.query.mockResolvedValue({ rows: [createdCustomer] });

        // Act
        const result = await GenericEntityService.create('customer', {
          email: 'test@example.com',
        });

        // Assert
        expect(result).toEqual(createdCustomer);
        expect(result.id).toBe(1);
      });

      test('should create entity with all createable fields', async () => {
        // Arrange
        const createdCustomer = {
          id: 1,
          email: 'test@example.com',
          phone: '555-1234',
          company_name: 'ACME Corp',
          status: 'active',
        };
        db.query.mockResolvedValue({ rows: [createdCustomer] });

        // Act
        const result = await GenericEntityService.create('customer', {
          email: 'test@example.com',
          phone: '555-1234',
          company_name: 'ACME Corp',
          status: 'active',
        });

        // Assert
        expect(result.email).toBe('test@example.com');
        expect(result.phone).toBe('555-1234');
        expect(result.company_name).toBe('ACME Corp');
      });

      test('should return created entity with RETURNING *', async () => {
        // Arrange
        const fullEntity = {
          id: 42,
          email: 'new@test.com',
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        db.query.mockResolvedValue({ rows: [fullEntity] });

        // Act
        const result = await GenericEntityService.create('customer', {
          email: 'new@test.com',
        });

        // Assert - should have all fields from RETURNING *
        expect(result.id).toBe(42);
        expect(result.created_at).toBeDefined();
        expect(result.updated_at).toBeDefined();
      });
    });

    // ------------------------------------------------------------------------
    // Field Filtering (Exclusion Pattern)
    // ------------------------------------------------------------------------

    describe('field filtering', () => {
      test('should exclude system-managed fields on create', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: 'test@example.com' }],
        });

        // Act - try to set id and created_at (system-managed)
        await GenericEntityService.create('customer', {
          email: 'test@example.com',
          id: 999, // Should be excluded (system-managed on create)
          created_at: '2020-01-01', // Should be excluded (system-managed on create)
        });

        // Assert - system-managed fields should be excluded
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('email');
        expect(query).not.toContain('id ='); // id is auto-generated
        expect(query).not.toContain('created_at'); // created_at is auto-set
      });

      test('should include provided fields in create', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: 'test@example.com', phone: '555-1234' }],
        });

        // Act
        await GenericEntityService.create('customer', {
          email: 'test@example.com',
          phone: '555-1234',
        });

        // Assert
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('email');
        expect(query).toContain('phone');
      });
    });

    // ------------------------------------------------------------------------
    // Required Fields Validation
    // ------------------------------------------------------------------------

    describe('required fields validation', () => {
      test('should throw when required field is missing', async () => {
        await expect(
          GenericEntityService.create('customer', {
            phone: '555-1234', // email is required but missing
          }),
        ).rejects.toThrow('Missing required fields for customer: email');
      });

      test('should throw when required field is null', async () => {
        await expect(
          GenericEntityService.create('customer', {
            email: null,
          }),
        ).rejects.toThrow('Missing required fields for customer: email');
      });

      test('should throw when required field is empty string', async () => {
        await expect(
          GenericEntityService.create('customer', {
            email: '',
          }),
        ).rejects.toThrow('Missing required fields for customer: email');
      });

      test('should list all missing required fields', async () => {
        // User requires: auth0_id, email, role_id
        await expect(
          GenericEntityService.create('user', {
            first_name: 'John', // Not required
          }),
        ).rejects.toThrow(/Missing required fields for user:/);
      });
    });

    // ------------------------------------------------------------------------
    // Data Validation
    // ------------------------------------------------------------------------

    describe('data validation', () => {
      test('should throw when data is null', async () => {
        await expect(
          GenericEntityService.create('customer', null),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw when data is undefined', async () => {
        await expect(
          GenericEntityService.create('customer', undefined),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw when data is an array', async () => {
        await expect(
          GenericEntityService.create('customer', [{ email: 'test@example.com' }]),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw when data is a string', async () => {
        await expect(
          GenericEntityService.create('customer', 'test@example.com'),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });
    });

    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw for invalid entity name', async () => {
        await expect(
          GenericEntityService.create('nonexistent', { name: 'test' }),
        ).rejects.toThrow('Unknown entity: nonexistent');
      });

      test('should propagate database errors', async () => {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          GenericEntityService.create('customer', { email: 'test@example.com' }),
        ).rejects.toThrow('Connection refused');
      });

      test('should propagate constraint violation errors', async () => {
        // Arrange
        const constraintError = new Error('duplicate key value');
        constraintError.code = '23505';
        db.query.mockRejectedValue(constraintError);

        // Act & Assert
        await expect(
          GenericEntityService.create('customer', { email: 'duplicate@example.com' }),
        ).rejects.toThrow('duplicate key value');
      });
    });

    // ------------------------------------------------------------------------
    // Query Structure
    // ------------------------------------------------------------------------

    describe('query structure', () => {
      test('should build INSERT ... RETURNING * query', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: 'test@example.com' }],
        });

        // Act
        await GenericEntityService.create('customer', {
          email: 'test@example.com',
        });

        // Assert
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('INSERT INTO customers');
        expect(query).toContain('VALUES');
        expect(query).toContain('RETURNING *');
      });

      test('should use parameterized query with $1, $2, etc', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: 'test@example.com', phone: '555-1234' }],
        });

        // Act
        await GenericEntityService.create('customer', {
          email: 'test@example.com',
          phone: '555-1234',
        });

        // Assert
        const [query, values] = db.query.mock.calls[0];
        expect(query).toContain('$1');
        expect(query).toContain('$2');
        expect(Array.isArray(values)).toBe(true);
        expect(values.length).toBe(2);
      });

      test('should use correct table name from metadata', async () => {
        // Arrange
        db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Admin', priority: 100 }] });

        // Act - role requires both name and priority
        await GenericEntityService.create('role', {
          name: 'Admin',
          priority: 100,
        });

        // Assert
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('INSERT INTO roles');
      });
    });

    // ------------------------------------------------------------------------
    // Multiple Entities
    // ------------------------------------------------------------------------

    describe('works with multiple entities', () => {
      test('should create role entity', async () => {
        // Arrange
        const createdRole = { id: 1, name: 'manager', priority: 50, is_active: true };
        db.query.mockResolvedValue({ rows: [createdRole] });

        // Act - role requires both name and priority
        const result = await GenericEntityService.create('role', {
          name: 'manager',
          priority: 50,
        });

        // Assert
        expect(result.name).toBe('manager');
      });

      test('should create technician entity', async () => {
        // Arrange
        const createdTech = {
          id: 1,
          license_number: 'TECH-001',
          user_id: 5,
        };
        db.query.mockResolvedValue({ rows: [createdTech] });

        // Act
        const result = await GenericEntityService.create('technician', {
          license_number: 'TECH-001',
          user_id: 5,
        });

        // Assert
        expect(result.license_number).toBe('TECH-001');
      });
    });
  });

  // ==========================================================================
  // update TESTS
  // ==========================================================================

  describe('update', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ------------------------------------------------------------------------
    // Happy Path: Successful Update
    // ------------------------------------------------------------------------

    describe('successful update', () => {
      test('should update entity and return updated record', async () => {
        // Arrange
        const updatedCustomer = {
          id: 1,
          email: 'original@test.com',
          phone: '555-9999',
          company_name: 'Updated Corp',
          is_active: true,
        };
        db.query.mockResolvedValue({ rows: [updatedCustomer] });

        // Act
        const result = await GenericEntityService.update('customer', 1, {
          phone: '555-9999',
          company_name: 'Updated Corp',
        });

        // Assert
        expect(result).toEqual(updatedCustomer);
        expect(result.phone).toBe('555-9999');
        expect(result.company_name).toBe('Updated Corp');
      });

      test('should return updated entity with RETURNING *', async () => {
        // Arrange
        const fullEntity = {
          id: 42,
          email: 'test@example.com',
          phone: '555-1234',
          is_active: true,
          updated_at: '2025-01-01T12:00:00Z',
        };
        db.query.mockResolvedValue({ rows: [fullEntity] });

        // Act
        const result = await GenericEntityService.update('customer', 42, {
          phone: '555-1234',
        });

        // Assert
        expect(result.id).toBe(42);
        expect(result.updated_at).toBeDefined();
      });

      test('should coerce string ID to integer', async () => {
        // Arrange
        db.query.mockResolvedValue({ rows: [{ id: 123, phone: '555-1234' }] });

        // Act
        await GenericEntityService.update('customer', '123', {
          phone: '555-1234',
        });

        // Assert - check the query params include integer ID
        const [, values] = db.query.mock.calls[0];
        expect(values[values.length - 1]).toBe(123); // ID is last param
      });
    });

    // ------------------------------------------------------------------------
    // Entity Not Found
    // ------------------------------------------------------------------------

    describe('entity not found', () => {
      test('should return null when entity does not exist', async () => {
        // Arrange
        db.query.mockResolvedValue({ rows: [] });

        // Act
        const result = await GenericEntityService.update('customer', 999, {
          phone: '555-1234',
        });

        // Assert
        expect(result).toBeNull();
      });
    });

    // ------------------------------------------------------------------------
    // Field Filtering
    // ------------------------------------------------------------------------

    describe('field filtering', () => {
      test('should reject requests containing universal immutable fields', async () => {
        // STRICT MODE: Attempting to update immutable fields should throw ImmutableFieldError
        // This prevents silent partial updates - the entire request is rejected

        await expect(
          GenericEntityService.update('customer', 1, {
            phone: '555-1234',
            id: 999, // Universal immutable - should trigger rejection
            created_at: '2020-01-01', // Universal immutable - should trigger rejection
          }),
        ).rejects.toThrow('Cannot update immutable field(s): id, created_at');
      });

      test('should only update provided fields', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: 'test@example.com', status: 'active' }],
        });

        // Act
        await GenericEntityService.update('customer', 1, {
          status: 'active',
          // email, phone NOT provided - should not be in query
        });

        // Assert
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('status');
        expect(query).not.toContain('email ='); // email not in SET clause
      });
    });

    // ------------------------------------------------------------------------
    // Data Validation
    // ------------------------------------------------------------------------

    describe('data validation', () => {
      test('should throw when data is null', async () => {
        await expect(
          GenericEntityService.update('customer', 1, null),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw when data is undefined', async () => {
        await expect(
          GenericEntityService.update('customer', 1, undefined),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw when data is an array', async () => {
        await expect(
          GenericEntityService.update('customer', 1, [{ phone: '555-1234' }]),
        ).rejects.toThrow('Data is required and must be an object for customer');
      });

      test('should throw ImmutableFieldError when only immutable fields provided', async () => {
        // STRICT MODE: Attempting to update ONLY immutable fields should throw ImmutableFieldError
        await expect(
          GenericEntityService.update('customer', 1, {
            id: 999, // Not updateable
            created_at: '2020-01-01', // Not updateable
          }),
        ).rejects.toThrow('Cannot update immutable field(s): id, created_at');
      });

      test('should throw when data object is empty', async () => {
        await expect(
          GenericEntityService.update('customer', 1, {}),
        ).rejects.toThrow('No valid updateable fields provided for customer');
      });
    });

    // ------------------------------------------------------------------------
    // ID Validation
    // ------------------------------------------------------------------------

    describe('ID validation', () => {
      test('should throw for null ID', async () => {
        await expect(
          GenericEntityService.update('customer', null, { phone: '555-1234' }),
        ).rejects.toThrow('id is required');
      });

      test('should throw for negative ID', async () => {
        await expect(
          GenericEntityService.update('customer', -5, { phone: '555-1234' }),
        ).rejects.toThrow('id must be at least 1');
      });

      test('should throw for non-numeric string ID', async () => {
        await expect(
          GenericEntityService.update('customer', 'abc', { phone: '555-1234' }),
        ).rejects.toThrow('id must be a valid integer');
      });
    });

    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw for invalid entity name', async () => {
        await expect(
          GenericEntityService.update('nonexistent', 1, { name: 'test' }),
        ).rejects.toThrow('Unknown entity: nonexistent');
      });

      test('should propagate database errors', async () => {
        // Arrange
        const dbError = new Error('Connection refused');
        db.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          GenericEntityService.update('customer', 1, { phone: '555-1234' }),
        ).rejects.toThrow('Connection refused');
      });

      test('should propagate constraint violation errors', async () => {
        // Arrange
        const constraintError = new Error('duplicate key value');
        constraintError.code = '23505';
        db.query.mockRejectedValue(constraintError);

        // Act & Assert
        await expect(
          GenericEntityService.update('customer', 1, { email: 'duplicate@example.com' }),
        ).rejects.toThrow('duplicate key value');
      });
    });

    // ------------------------------------------------------------------------
    // Query Structure
    // ------------------------------------------------------------------------

    describe('query structure', () => {
      test('should build UPDATE ... SET ... WHERE ... RETURNING query', async () => {
        // Arrange - UPDATE returns id, then findById re-fetches with JOINs
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [{ id: 1, phone: '555-1234' }] }); // findById re-fetch

        // Act
        await GenericEntityService.update('customer', 1, {
          phone: '555-1234',
        });

        // Assert - First call is UPDATE with RETURNING id (not RETURNING *)
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('UPDATE customers');
        expect(query).toContain('SET');
        expect(query).toContain('WHERE id =');
        expect(query).toContain('RETURNING id'); // Returns id, then re-fetches
      });

      test('should re-fetch entity via findById after update', async () => {
        // Arrange - UPDATE returns id, then findById re-fetches with JOINs
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [{ id: 1, phone: '555-1234' }] }); // findById re-fetch

        // Act
        await GenericEntityService.update('customer', 1, {
          phone: '555-1234',
        });

        // Assert - Second call is SELECT (findById)
        expect(db.query).toHaveBeenCalledTimes(2);
        const [selectQuery] = db.query.mock.calls[1];
        expect(selectQuery).toContain('SELECT customers.*');
        expect(selectQuery).toContain('FROM customers');
        expect(selectQuery).toContain('WHERE customers.id = $1');
      });

      test('should use parameterized query with $1, $2, etc', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [{ id: 1, phone: '555-1234', status: 'active' }] }); // findById re-fetch

        // Act
        await GenericEntityService.update('customer', 1, {
          phone: '555-1234',
          status: 'active',
        });

        // Assert
        const [query, values] = db.query.mock.calls[0];
        expect(query).toContain('$1');
        expect(query).toContain('$2');
        expect(query).toContain('$3'); // ID is last
        expect(Array.isArray(values)).toBe(true);
        expect(values.length).toBe(3); // 2 fields + ID
      });

      test('should use correct table name from metadata', async () => {
        // Arrange
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [{ id: 1, description: 'Updated' }] }); // findById re-fetch

        // Act
        await GenericEntityService.update('role', 1, {
          description: 'Updated',
        });

        // Assert
        const [query] = db.query.mock.calls[0];
        expect(query).toContain('UPDATE roles');
      });
    });

    // ------------------------------------------------------------------------
    // Multiple Entities
    // ------------------------------------------------------------------------

    describe('works with multiple entities', () => {
      test('should update role entity', async () => {
        // Arrange - UPDATE returns id, then findById re-fetches
        const updatedRole = { id: 1, description: 'New description', is_active: true };
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [updatedRole] }); // findById re-fetch

        // Act
        const result = await GenericEntityService.update('role', 1, {
          description: 'New description',
        });

        // Assert
        expect(result.description).toBe('New description');
      });

      test('should update workOrder entity', async () => {
        // Arrange - UPDATE returns id, then findById re-fetches
        const updatedWorkOrder = {
          id: 1,
          title: 'Updated Title',
          status: 'in_progress',
        };
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [updatedWorkOrder] }); // findById re-fetch

        // Act
        const result = await GenericEntityService.update('workOrder', 1, {
          title: 'Updated Title',
          status: 'in_progress',
        });

        // Assert
        expect(result.title).toBe('Updated Title');
        expect(result.status).toBe('in_progress');
      });
    });

    // ------------------------------------------------------------------------
    // System Protection (roles only)
    // ------------------------------------------------------------------------

    describe('system protection', () => {
      test('should block updating name on system role', async () => {
        // Arrange - findById returns a system role (admin)
        db.query.mockResolvedValue({
          rows: [{ id: 1, name: 'admin', priority: 100, description: 'Admin' }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.update('role', 1, { name: 'renamed-admin' }),
        ).rejects.toThrow('Cannot modify name on system role: admin');
      });

      test('should block updating priority on system role', async () => {
        // Arrange - findById returns a system role (manager)
        db.query.mockResolvedValue({
          rows: [{ id: 2, name: 'manager', priority: 80, description: 'Manager' }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.update('role', 2, { priority: 99 }),
        ).rejects.toThrow('Cannot modify priority on system role: manager');
      });

      test('should block updating multiple immutable fields on system role', async () => {
        // Arrange - findById returns a system role (customer)
        db.query.mockResolvedValue({
          rows: [{ id: 5, name: 'customer', priority: 10, description: 'Customer' }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.update('role', 5, { name: 'client', priority: 15 }),
        ).rejects.toThrow(/Cannot modify name, priority on system role: customer/);
      });

      test('should allow updating description on system role', async () => {
        // Arrange
        // description is NOT in immutableFields, so protection check is skipped entirely
        // UPDATE + re-fetch via findById (for JOINs)
        const updatedRole = {
          id: 1,
          name: 'admin',
          priority: 100,
          description: 'Updated admin description',
        };
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [updatedRole] }); // findById re-fetch

        // Act
        const result = await GenericEntityService.update('role', 1, {
          description: 'Updated admin description',
        });

        // Assert
        expect(result.description).toBe('Updated admin description');
        expect(result.name).toBe('admin'); // unchanged
        // Two query calls: UPDATE + re-fetch via findById
        expect(db.query).toHaveBeenCalledTimes(2);
      });

      test('should allow updating is_active on system role', async () => {
        // Arrange
        // is_active is NOT in immutableFields, so protection check is skipped
        // UPDATE + re-fetch via findById (for JOINs)
        const updatedRole = {
          id: 3,
          name: 'dispatcher',
          priority: 60,
          is_active: false,
        };
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [updatedRole] }); // findById re-fetch

        // Act
        const result = await GenericEntityService.update('role', 3, {
          is_active: false,
        });

        // Assert
        expect(result.is_active).toBe(false);
        // Two query calls: UPDATE + re-fetch via findById
        expect(db.query).toHaveBeenCalledTimes(2);
      });

      test('should allow updating priority on non-system role', async () => {
        // Arrange - findById returns a NON-system role for protection check
        // Then UPDATE + re-fetch for the actual update
        const customRole = { id: 10, name: 'custom-role', priority: 25 };
        const updatedRole = { id: 10, name: 'custom-role', priority: 99 };
        db.query
          .mockResolvedValueOnce({ rows: [customRole] }) // Pre-check: findById for system protection
          .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // UPDATE RETURNING id
          .mockResolvedValueOnce({ rows: [updatedRole] }); // findById re-fetch

        // Act - priority IS updateable, and since it's not a system role, it should work
        const result = await GenericEntityService.update('role', 10, {
          priority: 99,
        });

        // Assert
        expect(result.priority).toBe(99);
      });

      test('should not apply protection to non-role entities', async () => {
        // Arrange - customer entity doesn't have systemProtected
        const updatedCustomer = { id: 1, email: 'new@example.com' };
        db.query.mockResolvedValue({ rows: [updatedCustomer] });

        // Act
        const result = await GenericEntityService.update('customer', 1, {
          email: 'new@example.com',
        });

        // Assert
        expect(result.email).toBe('new@example.com');
        // Two query calls: UPDATE + re-fetch via findByField (for JOINs)
        // No protection check for non-role entities
        expect(db.query).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // delete TESTS (Step 1.6)
  // ==========================================================================

  describe('delete', () => {
    const { createMockClient } = require('../../mocks');
    let mockClient;

    beforeEach(() => {
      jest.clearAllMocks();

      // Create fresh mock client for each test and wire up getClient
      mockClient = createMockClient();
      db.getClient = jest.fn().mockResolvedValue(mockClient);

      // Mock db.query for protection check (findById call before transaction)
      // Default: return a non-protected record so protection check passes
      db.query = jest.fn().mockResolvedValue({
        rows: [{ id: 1, name: 'NonSystemRecord' }],
      });
    });

    // ------------------------------------------------------------------------
    // Happy Path: Successful Deletion
    // ------------------------------------------------------------------------

    describe('successful deletion', () => {
      test('should delete entity and return deleted record', async () => {
        // Arrange
        const mockRecord = { id: 1, name: 'Admin', is_active: true };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // SELECT (exists check)
          .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // CASCADE DELETE audit_logs
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // DELETE RETURNING
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        // Act
        const result = await GenericEntityService.delete('role', 1);

        // Assert
        expect(result).toEqual(mockRecord);
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('should cascade delete dependents before deleting entity', async () => {
        // Arrange
        const mockRecord = { id: 5, email: 'test@example.com' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // SELECT
          .mockResolvedValueOnce({ rows: [], rowCount: 7 }) // CASCADE DELETE
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 }) // DELETE
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        // Act
        await GenericEntityService.delete('user', 5);

        // Assert - verify cascade delete was called
        const calls = mockClient.query.mock.calls;
        expect(calls.some(call => call[0].includes('DELETE FROM audit_logs'))).toBe(true);
      });

      test('should commit transaction on success', async () => {
        // Arrange
        const mockRecord = { id: 1, email: 'customer@test.com' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        // Act
        await GenericEntityService.delete('customer', 1);

        // Assert
        const queries = mockClient.query.mock.calls.map(c => c[0]);
        expect(queries[0]).toBe('BEGIN');
        expect(queries[queries.length - 1]).toBe('COMMIT');
      });

      test('should release client on success', async () => {
        // Arrange
        const mockRecord = { id: 1, license_number: 'ABC123' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('technician', 1);

        // Assert
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    // ------------------------------------------------------------------------
    // Not Found Cases
    // ------------------------------------------------------------------------

    describe('not found', () => {
      test('should return null when entity does not exist', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT (not found)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

        // Act
        const result = await GenericEntityService.delete('role', 999);

        // Assert
        expect(result).toBeNull();
      });

      test('should rollback transaction when entity not found', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('user', 999);

        // Assert
        const queries = mockClient.query.mock.calls.map(c => c[0]);
        expect(queries).toContain('ROLLBACK');
        expect(queries).not.toContain('COMMIT');
      });

      test('should release client when entity not found', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('customer', 999);

        // Assert
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------

    describe('error handling', () => {
      test('should throw error for unknown entity', async () => {
        // Act & Assert
        await expect(
          GenericEntityService.delete('unknownEntity', 1),
        ).rejects.toThrow('Unknown entity: unknownEntity');
      });

      test('should throw error for invalid ID (string that is not a number)', async () => {
        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 'abc'),
        ).rejects.toThrow();
      });

      test('should throw error for invalid ID (zero)', async () => {
        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 0),
        ).rejects.toThrow();
      });

      test('should throw error for invalid ID (negative)', async () => {
        // Act & Assert
        await expect(
          GenericEntityService.delete('role', -1),
        ).rejects.toThrow();
      });

      test('should rollback on cascade error', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // SELECT
          .mockRejectedValueOnce(new Error('Cascade failed')); // CASCADE DELETE fails

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 1),
        ).rejects.toThrow('Cascade failed');

        const queries = mockClient.query.mock.calls.map(c => c[0]);
        expect(queries).toContain('ROLLBACK');
      });

      test('should rollback on delete error', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // SELECT
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE
          .mockRejectedValueOnce(new Error('FK constraint violation')); // DELETE fails

        // Act & Assert
        await expect(
          GenericEntityService.delete('customer', 1),
        ).rejects.toThrow('FK constraint violation');

        const queries = mockClient.query.mock.calls.map(c => c[0]);
        expect(queries).toContain('ROLLBACK');
      });

      test('should release client on error', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockRejectedValueOnce(new Error('Database error'));

        // Act
        await expect(
          GenericEntityService.delete('role', 1),
        ).rejects.toThrow('Database error');

        // Assert
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    // ------------------------------------------------------------------------
    // ID Coercion
    // ------------------------------------------------------------------------

    describe('ID type coercion', () => {
      test('should accept string ID and coerce to integer', async () => {
        // Arrange
        const mockRecord = { id: 5, name: 'Test Role' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        const result = await GenericEntityService.delete('role', '5');

        // Assert
        expect(result).toEqual(mockRecord);

        // Verify the ID was passed as integer
        const selectCall = mockClient.query.mock.calls[1];
        expect(selectCall[1]).toEqual([5]);
      });

      test('should accept numeric string with spaces', async () => {
        // Arrange
        const mockRecord = { id: 10, invoice_number: 'INV-001' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act - toSafeInteger trims whitespace
        const result = await GenericEntityService.delete('invoice', ' 10 ');

        // Assert
        expect(result).toEqual(mockRecord);
      });
    });

    // ------------------------------------------------------------------------
    // Query Structure
    // ------------------------------------------------------------------------

    describe('query structure', () => {
      test('should use correct table name from metadata', async () => {
        // Arrange
        const mockRecord = { id: 1, title: 'Test Work Order' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('workOrder', 1);

        // Assert
        const selectCall = mockClient.query.mock.calls[1][0];
        expect(selectCall).toContain('FROM work_orders');
      });

      test('should use DELETE ... WHERE id = $1 RETURNING * pattern', async () => {
        // Arrange
        const mockRecord = { id: 1, name: 'Test Item' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('inventory', 1);

        // Assert
        const deleteCall = mockClient.query.mock.calls[3][0];
        expect(deleteCall).toContain('DELETE FROM inventory');
        expect(deleteCall).toContain('WHERE id = $1');
        expect(deleteCall).toContain('RETURNING *');
      });

      test('should use parameterized query for ID', async () => {
        // Arrange
        const mockRecord = { id: 42, contract_number: 'CON-001' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockRecord], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // Act
        await GenericEntityService.delete('contract', 42);

        // Assert
        const deleteCall = mockClient.query.mock.calls[3];
        expect(deleteCall[1]).toEqual([42]);
      });
    });

    // ------------------------------------------------------------------------
    // System Protection (roles only)
    // ------------------------------------------------------------------------

    describe('system protection', () => {
      test('should block deleting system role (admin)', async () => {
        // Arrange - db.query (findById) returns a system role
        db.query.mockResolvedValue({
          rows: [{ id: 1, name: 'admin', priority: 100 }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 1),
        ).rejects.toThrow('Cannot delete system role: admin');

        // Transaction should never start
        expect(db.getClient).not.toHaveBeenCalled();
      });

      test('should block deleting system role (manager)', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 2, name: 'manager', priority: 80 }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 2),
        ).rejects.toThrow('Cannot delete system role: manager');
      });

      test('should block deleting system role (dispatcher)', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 3, name: 'dispatcher', priority: 60 }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 3),
        ).rejects.toThrow('Cannot delete system role: dispatcher');
      });

      test('should block deleting system role (technician)', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 4, name: 'technician', priority: 40 }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 4),
        ).rejects.toThrow('Cannot delete system role: technician');
      });

      test('should block deleting system role (customer)', async () => {
        // Arrange
        db.query.mockResolvedValue({
          rows: [{ id: 5, name: 'customer', priority: 10 }],
        });

        // Act & Assert
        await expect(
          GenericEntityService.delete('role', 5),
        ).rejects.toThrow('Cannot delete system role: customer');
      });

      test('should allow deleting non-system role', async () => {
        // Arrange - findById returns a custom (non-system) role
        const customRole = { id: 10, name: 'custom-role', priority: 25 };
        db.query.mockResolvedValue({ rows: [customRole] });

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [customRole], rowCount: 1 }) // SELECT
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE
          .mockResolvedValueOnce({ rows: [customRole], rowCount: 1 }) // DELETE
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        // Act
        const result = await GenericEntityService.delete('role', 10);

        // Assert
        expect(result).toEqual(customRole);
        expect(mockClient.query).toHaveBeenCalled();
      });

      test('should not apply protection to non-role entities', async () => {
        // Arrange - customer deletion should not check protection
        const mockCustomer = { id: 1, email: 'test@example.com' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 }) // SELECT
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CASCADE
          .mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 }) // DELETE
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

        // Reset db.query to ensure it's not called for protection check
        db.query.mockClear();

        // Act
        const result = await GenericEntityService.delete('customer', 1);

        // Assert - customer deleted successfully
        expect(result).toEqual(mockCustomer);
        // db.query should NOT be called (no protection check for customer)
        expect(db.query).not.toHaveBeenCalled();
      });

      test('should allow delete when record not found (no protection needed)', async () => {
        // Arrange - findById returns no record
        db.query.mockResolvedValue({ rows: [] });

        mockClient.query
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT (not found)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

        // Act
        const result = await GenericEntityService.delete('role', 999);

        // Assert - returns null for not found
        expect(result).toBeNull();
      });
    });

    // ------------------------------------------------------------------------
    // Works with Multiple Entities
    // ------------------------------------------------------------------------

    describe('works with all entities', () => {
      const entities = [
        { name: 'user', table: 'users', cascadeCount: 2 },  // 2 audit_logs cascades
        { name: 'role', table: 'roles', cascadeCount: 1 },
        { name: 'customer', table: 'customers', cascadeCount: 1 },
        { name: 'technician', table: 'technicians', cascadeCount: 1 },
        { name: 'workOrder', table: 'work_orders', cascadeCount: 1 },
        { name: 'invoice', table: 'invoices', cascadeCount: 1 },
        { name: 'contract', table: 'contracts', cascadeCount: 1 },
        { name: 'inventory', table: 'inventory', cascadeCount: 1 },
      ];

      entities.forEach(({ name, table, cascadeCount }) => {
        test(`should delete ${name} entity from ${table}`, async () => {
          // Arrange
          const mockRecord = { id: 1 };

          // Build mock responses: BEGIN, SELECT, [cascade deletes...], DELETE, COMMIT
          const mockResponses = [
            { rows: [], rowCount: 0 },  // BEGIN
            { rows: [mockRecord], rowCount: 1 },  // SELECT (exists check)
          ];
          for (let i = 0; i < cascadeCount; i++) {
            mockResponses.push({ rows: [], rowCount: 0 });  // CASCADE DELETE
          }
          mockResponses.push({ rows: [mockRecord], rowCount: 1 });  // DELETE
          mockResponses.push({ rows: [], rowCount: 0 });  // COMMIT

          mockClient.query.mockImplementation(() => 
            Promise.resolve(mockResponses.shift()),
          );

          // Act
          const result = await GenericEntityService.delete(name, 1);

          // Assert
          expect(result).toEqual(mockRecord);
          
          // Find the DELETE FROM <table> call (not cascade deletes)
          const calls = mockClient.query.mock.calls.map(c => c[0]);
          const deleteCall = calls.find(q => 
            q.includes(`DELETE FROM ${table}`) && q.includes('RETURNING'),
          );
          expect(deleteCall).toBeDefined();

          // Reset for next iteration
          jest.clearAllMocks();
        });
      });
    });
  });
});
