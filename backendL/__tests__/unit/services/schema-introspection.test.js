/**
 * Schema Introspection Service - Unit Tests
 *
 * Tests business logic ONLY:
 * - Type mapping
 * - UI type inference
 * - Label generation
 * - Column enrichment
 *
 * KISS: Test private method outputs through public API results
 * No DB mocking - integration tests cover DB queries
 */

const SchemaIntrospectionService = require('../../../services/schema-introspection');
const db = require('../../../db/connection');

// Mock DB connection
jest.mock('../../../db/connection');

describe('SchemaIntrospectionService - Business Logic', () => {
  describe('getTableSchema', () => {
    it('should return enriched schema with all metadata', async () => {
      // Arrange - Mock minimal DB responses
      db.query.mockResolvedValueOnce({
        // Columns
        rows: [
          {
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: "nextval('users_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
            udt_name: 'int4',
            ordinal_position: 1,
          },
          {
            column_name: 'email',
            data_type: 'character varying',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 2,
          },
          {
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO',
            column_default: 'CURRENT_TIMESTAMP',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'timestamp',
            ordinal_position: 3,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] }) // Constraints
        .mockResolvedValueOnce({ rows: [] }) // Foreign keys
        .mockResolvedValueOnce({ rows: [] }); // Indexes

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('users');

      // Assert
      expect(result).toMatchObject({
        tableName: 'users',
        displayName: 'Users',
        columns: expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            type: 'number',
            uiType: 'readonly',
            label: 'ID',
            readonly: true,
            nullable: false,
          }),
          expect.objectContaining({
            name: 'email',
            type: 'string',
            uiType: 'email',
            label: 'Email Address',
            readonly: false,
            nullable: false,
            maxLength: 255,
          }),
          expect.objectContaining({
            name: 'created_at',
            type: 'datetime',
            uiType: 'readonly',
            label: 'Created',
            readonly: true,
            nullable: false,
          }),
        ]),
      });
    });
  });

  describe('getAllTables', () => {
    it('should return all public schema tables with display names', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          { table_name: 'users', description: 'System users' },
          { table_name: 'roles', description: 'User roles' },
          { table_name: 'audit_logs', description: null },
        ],
      });

      // Act
      const result = await SchemaIntrospectionService.getAllTables();

      // Assert
      expect(result).toEqual([
        { name: 'users', displayName: 'Users', description: 'System users' },
        { name: 'roles', displayName: 'Roles', description: 'User roles' },
        { name: 'audit_logs', displayName: 'Audit Logs', description: null },
      ]);
    });
  });

  describe('Type Mapping Logic', () => {
    it('should map PostgreSQL numeric types correctly', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'count',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
            udt_name: 'int4',
            ordinal_position: 1,
          },
          {
            column_name: 'price',
            data_type: 'numeric',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: null,
            numeric_precision: 10,
            numeric_scale: 2,
            udt_name: 'numeric',
            ordinal_position: 2,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('products');

      // Assert
      expect(result.columns[0]).toMatchObject({
        name: 'count',
        type: 'number',
        uiType: 'number',
        precision: 32,
        scale: 0,
      });
      expect(result.columns[1]).toMatchObject({
        name: 'price',
        type: 'number',
        uiType: 'number',
        precision: 10,
        scale: 2,
      });
    });

    it('should map PostgreSQL text types correctly', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'description',
            data_type: 'text',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'text',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0]).toMatchObject({
        type: 'string',
        uiType: 'textarea',
      });
    });

    it('should map PostgreSQL boolean correctly', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'is_active',
            data_type: 'boolean',
            is_nullable: 'NO',
            column_default: 'true',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'bool',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0]).toMatchObject({
        type: 'boolean',
        uiType: 'boolean',
      });
    });
  });

  describe('UI Type Inference Logic', () => {
    it('should infer email input for email columns', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'contact_email',
            data_type: 'character varying',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].uiType).toBe('email');
    });

    it('should infer url input for url columns', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'website_url',
            data_type: 'character varying',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].uiType).toBe('url');
    });

    it('should infer tel input for phone columns', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'phone_number',
            data_type: 'character varying',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: 20,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].uiType).toBe('tel');
    });

    it('should infer select dropdown for foreign keys', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'role_id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
            udt_name: 'int4',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          // Foreign key
          rows: [
            {
              column_name: 'role_id',
              foreign_table_name: 'roles',
              foreign_column_name: 'id',
              update_rule: 'CASCADE',
              delete_rule: 'RESTRICT',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('users');

      // Assert
      expect(result.columns[0]).toMatchObject({
        name: 'role_id',
        uiType: 'select',
        foreignKey: {
          table: 'roles',
          column: 'id',
          updateRule: 'CASCADE',
          deleteRule: 'RESTRICT',
        },
      });
    });
  });

  describe('Label Generation Logic', () => {
    it('should convert snake_case to Title Case', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'first_name',
            data_type: 'character varying',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: 100,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].label).toBe('First Name');
    });

    it('should use special labels for known fields', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'auth0_id',
            data_type: 'character varying',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].label).toBe('Auth0 ID');
    });
  });

  describe('Readonly Field Logic', () => {
    it('should mark system fields as readonly', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: "nextval('test_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
            udt_name: 'int4',
            ordinal_position: 1,
          },
          {
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO',
            column_default: 'CURRENT_TIMESTAMP',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'timestamp',
            ordinal_position: 2,
          },
          {
            column_name: 'updated_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO',
            column_default: 'CURRENT_TIMESTAMP',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'timestamp',
            ordinal_position: 3,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].readonly).toBe(true); // id
      expect(result.columns[1].readonly).toBe(true); // created_at
      expect(result.columns[2].readonly).toBe(true); // updated_at
    });

    it('should mark user fields as editable', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].readonly).toBe(false);
    });
  });

  describe('Searchable Field Logic', () => {
    it('should mark text fields as searchable', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'NO',
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'varchar',
            ordinal_position: 1,
          },
          {
            column_name: 'description',
            data_type: 'text',
            is_nullable: 'YES',
            column_default: null,
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'text',
            ordinal_position: 2,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].searchable).toBe(true); // varchar
      expect(result.columns[1].searchable).toBe(true); // text
    });

    it('should not mark id and timestamp fields as searchable', async () => {
      // Arrange
      db.query.mockResolvedValueOnce({
        rows: [
          {
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: "nextval('test_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
            udt_name: 'int4',
            ordinal_position: 1,
          },
          {
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO',
            column_default: 'CURRENT_TIMESTAMP',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
            udt_name: 'timestamp',
            ordinal_position: 2,
          },
        ],
      });

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await SchemaIntrospectionService.getTableSchema('test');

      // Assert
      expect(result.columns[0].searchable).toBe(false); // id
      expect(result.columns[1].searchable).toBe(false); // created_at
    });
  });

  describe('getForeignKeyOptions', () => {
    it('should return foreign key dropdown options', async () => {
      // Arrange - Mock getTableSchema call
      db.query
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: null, character_maximum_length: null, numeric_precision: 32, numeric_scale: 0, udt_name: 'int4', ordinal_position: 1 },
            { column_name: 'name', data_type: 'character varying', is_nullable: 'NO', column_default: null, character_maximum_length: 100, numeric_precision: null, numeric_scale: null, udt_name: 'varchar', ordinal_position: 2 },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Mock actual options query
      db.query.mockResolvedValueOnce({
        rows: [
          { value: 1, label: 'Admin' },
          { value: 2, label: 'User' },
        ],
      });

      // Act
      const result = await SchemaIntrospectionService.getForeignKeyOptions('roles');

      // Assert
      expect(result).toEqual([
        { value: 1, label: 'Admin' },
        { value: 2, label: 'User' },
      ]);
    });
  });
});
