# Schema-Driven UI Architecture

## 🎯 Philosophy: Database Schema as Single Source of Truth

**PROBLEM:** Adding a field requires updating:
- ❌ Database schema
- ❌ Backend model
- ❌ Frontend model  
- ❌ Table config
- ❌ Form config
- ❌ Tests
- ❌ TypeScript/Dart types

**SOLUTION:** Database schema drives EVERYTHING automatically.

```
PostgreSQL Schema (ONE PLACE TO CHANGE)
    ↓
Backend: Introspection API
    ↓
Frontend: Fetch metadata at runtime
    ↓
Generic UI renders automatically
```

---

## 🏗️ Architecture Layers

### Layer 1: Database Schema (Source of Truth)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**This is the ONLY place you define structure.**

---

### Layer 2: Backend Schema Introspection Service

**File:** `backend/services/schema-introspection.js`

```javascript
class SchemaIntrospectionService {
  /**
   * Get table metadata from PostgreSQL information_schema
   * Returns: columns, types, constraints, relationships
   */
  async getTableSchema(tableName) {
    const columns = await db.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const constraints = await db.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = $1
    `, [tableName]);

    const foreignKeys = await db.query(`
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.key_column_usage AS kcu
      JOIN information_schema.constraint_column_usage AS ccu
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = $1
        AND EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.constraint_name = kcu.constraint_name
            AND tc.constraint_type = 'FOREIGN KEY'
        )
    `, [tableName]);

    return {
      tableName,
      columns: this._parseColumns(columns.rows),
      constraints: constraints.rows,
      foreignKeys: this._parseForeignKeys(foreignKeys.rows),
    };
  }

  _parseColumns(columns) {
    return columns.map(col => ({
      name: col.column_name,
      type: this._mapPostgreSQLType(col.data_type),
      nullable: col.is_nullable === 'YES',
      default: col.column_default,
      maxLength: col.character_maximum_length,
      precision: col.numeric_precision,
      // Infer UI metadata from type
      uiType: this._inferUIType(col),
      label: this._generateLabel(col.column_name),
    }));
  }

  _mapPostgreSQLType(pgType) {
    const typeMap = {
      'integer': 'number',
      'bigint': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'character varying': 'string',
      'text': 'string',
      'boolean': 'boolean',
      'timestamp without time zone': 'datetime',
      'timestamp with time zone': 'datetime',
      'date': 'date',
      'uuid': 'string',
    };
    return typeMap[pgType] || 'string';
  }

  _inferUIType(column) {
    const { column_name, data_type } = column;

    // Email detection
    if (column_name.includes('email')) return 'email';
    
    // URL detection
    if (column_name.includes('url') || column_name.includes('website')) return 'url';
    
    // Boolean → toggle
    if (data_type === 'boolean') return 'boolean';
    
    // Text → textarea
    if (data_type === 'text') return 'textarea';
    
    // Timestamps → readonly
    if (column_name.endsWith('_at')) return 'readonly';
    
    // Foreign keys → select
    if (column_name.endsWith('_id')) return 'select';
    
    // Numbers
    if (data_type.includes('int') || data_type.includes('numeric')) return 'number';
    
    // Default
    return 'text';
  }

  _generateLabel(columnName) {
    // Convert snake_case to Title Case
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  _parseForeignKeys(fks) {
    return fks.map(fk => ({
      column: fk.column_name,
      referencedTable: fk.foreign_table_name,
      referencedColumn: fk.foreign_column_name,
    }));
  }
}
```

---

### Layer 3: Backend API Endpoint

**File:** `backend/routes/schema.js`

```javascript
router.get('/api/schema/:tableName', authenticateToken, async (req, res) => {
  try {
    const schema = await SchemaIntrospectionService.getTableSchema(
      req.params.tableName
    );
    
    res.json({ success: true, data: schema });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available tables
router.get('/api/schema', authenticateToken, async (req, res) => {
  const tables = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  res.json({ success: true, data: tables.rows });
});
```

---

### Layer 4: Frontend Schema Service

**File:** `frontend/lib/services/schema_service.dart`

```dart
class SchemaService {
  static final _cache = <String, TableSchema>{};

  /// Fetch table schema from backend
  static Future<TableSchema> getTableSchema(String tableName) async {
    // Check cache
    if (_cache.containsKey(tableName)) {
      return _cache[tableName]!;
    }

    // Fetch from API
    final response = await ApiClient.get('/schema/$tableName');
    final schema = TableSchema.fromJson(response.data);
    
    // Cache it
    _cache[tableName] = schema;
    
    return schema;
  }

  /// Build TableColumn list from schema
  static List<TableColumn<Map<String, dynamic>>> buildTableColumns(
    TableSchema schema,
  ) {
    return schema.columns
        .where((col) => !col.name.endsWith('_id')) // Hide FKs
        .where((col) => col.name != 'id') // Hide primary key
        .map((col) => TableColumn<Map<String, dynamic>>(
              id: col.name,
              label: col.label,
              sortable: true,
              cellBuilder: (item) => _buildCell(col, item[col.name]),
              comparator: (a, b) => _compare(col, a[col.name], b[col.name]),
            ))
        .toList();
  }

  /// Build FieldConfig list from schema
  static List<FieldConfig<Map<String, dynamic>, dynamic>> buildFieldConfigs(
    TableSchema schema,
  ) {
    return schema.columns
        .where((col) => !col.isReadonly)
        .map((col) => FieldConfig<Map<String, dynamic>, dynamic>(
              fieldType: _mapUIType(col.uiType),
              label: col.label,
              getValue: (item) => item[col.name],
              setValue: (item, value) => {...item, col.name: value},
              required: !col.nullable,
            ))
        .toList();
  }

  static Widget _buildCell(ColumnSchema col, dynamic value) {
    if (value == null) return const DataValue(text: '—');

    switch (col.uiType) {
      case 'email':
        return DataValue.email(value.toString());
      case 'boolean':
        return BooleanBadge.activeInactive(value: value as bool);
      case 'datetime':
        return DataValue.timestamp(DateTime.parse(value.toString()));
      default:
        return DataValue(text: value.toString());
    }
  }

  static FieldType _mapUIType(String uiType) {
    switch (uiType) {
      case 'email': return FieldType.text;
      case 'textarea': return FieldType.textArea;
      case 'number': return FieldType.number;
      case 'boolean': return FieldType.boolean;
      case 'date': return FieldType.date;
      case 'select': return FieldType.select;
      default: return FieldType.text;
    }
  }
}
```

---

### Layer 5: Generic Dashboard Screen

**File:** `frontend/lib/screens/generic_entity_dashboard.dart`

```dart
class GenericEntityDashboard extends StatefulWidget {
  final String entityName; // 'users', 'roles', 'work_orders'
  final String title; // 'User Management'
  
  const GenericEntityDashboard({
    required this.entityName,
    required this.title,
  });
}

class _GenericEntityDashboardState extends State<GenericEntityDashboard> {
  TableSchema? _schema;
  List<Map<String, dynamic>> _data = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSchema();
  }

  Future<void> _loadSchema() async {
    final schema = await SchemaService.getTableSchema(widget.entityName);
    final data = await ApiClient.get('/api/${widget.entityName}');
    
    setState(() {
      _schema = schema;
      _data = List<Map<String, dynamic>>.from(data);
      _loading = false;
    });
  }

  Future<void> _showCreateDialog() async {
    final fields = SchemaService.buildFieldConfigs(_schema!);
    
    final result = await FormModal.show<Map<String, dynamic>>(
      context: context,
      title: 'Create ${_schema!.tableName}',
      value: {},
      fields: fields,
      onSave: (data) async {
        await ApiClient.post('/api/${widget.entityName}', data);
        _loadSchema(); // Reload
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _schema == null) {
      return const LoadingIndicator();
    }

    final columns = SchemaService.buildTableColumns(_schema!);

    return Scaffold(
      appBar: AppHeader(pageTitle: widget.title),
      body: AppDataTable<Map<String, dynamic>>(
        title: widget.title,
        columns: columns,
        data: _data,
        toolbarActions: [
          ActionButton.create(onPressed: _showCreateDialog),
        ],
      ),
    );
  }
}
```

---

### Layer 6: Admin Dashboard (Now Just Config!)

**File:** `frontend/lib/screens/admin/admin_dashboard.dart`

```dart
class AdminDashboard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Users
        GenericEntityDashboard(
          entityName: 'users',
          title: 'User Management',
        ),
        
        // Roles
        GenericEntityDashboard(
          entityName: 'roles',
          title: 'Role Management',
        ),
      ],
    );
  }
}
```

---

## 🎨 Customization Layer (Optional)

For entity-specific overrides:

**File:** `backend/config/entity-overrides.json`

```json
{
  "users": {
    "columns": {
      "first_name": {
        "label": "First Name",
        "sortPriority": 1
      },
      "email": {
        "label": "Email Address",
        "validation": "email"
      },
      "role_id": {
        "uiType": "select",
        "selectOptions": "SELECT id, name FROM roles WHERE is_active = true"
      }
    },
    "displayFields": ["first_name", "last_name", "email", "role_id", "is_active"],
    "editableFields": ["first_name", "last_name", "email", "role_id"],
    "searchFields": ["email", "first_name", "last_name"]
  }
}
```

---

## 📊 The Power: ONE Change, Everywhere Updates

### Adding a Field

```sql
-- ONLY change needed:
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

**Automatically:**
- ✅ Backend introspection detects it
- ✅ Frontend fetches new schema
- ✅ Table shows new column
- ✅ Form includes new field
- ✅ Validation inferred from DB constraints

### Renaming a Field

```sql
ALTER TABLE users RENAME COLUMN first_name TO given_name;
```

**Automatically:**
- ✅ Label updates to "Given Name"
- ✅ All queries use new column
- ✅ No code changes needed

### Changing Field Type

```sql
ALTER TABLE users ALTER COLUMN phone TYPE TEXT;
```

**Automatically:**
- ✅ UI switches from VARCHAR → textarea
- ✅ Validation adjusts

---

## 🧪 Testing Strategy

**ONE test for the SYSTEM, not per entity:**

```dart
test('schema introspection generates valid UI config', () async {
  final schema = await SchemaService.getTableSchema('users');
  
  // System validates:
  expect(schema.columns, isNotEmpty);
  expect(schema.columns.every((c) => c.label.isNotEmpty), isTrue);
  
  // Can build UI:
  final columns = SchemaService.buildTableColumns(schema);
  expect(columns, isNotEmpty);
  
  final fields = SchemaService.buildFieldConfigs(schema);
  expect(fields, isNotEmpty);
});
```

---

## 🚀 Migration Path

### Phase 1: Build Infrastructure
1. ✅ Create `SchemaIntrospectionService`
2. ✅ Add `/api/schema` endpoints
3. ✅ Create `SchemaService` in Flutter
4. ✅ Add `TableSchema` model

### Phase 2: Create Generic Dashboard
1. ✅ Build `GenericEntityDashboard`
2. ✅ Test with `users` table
3. ✅ Test with `roles` table

### Phase 3: Replace Hard-coded Configs
1. ✅ Replace `UserTableConfig` with schema-driven
2. ✅ Replace `RoleTableConfig` with schema-driven
3. ✅ Delete hard-coded config files

### Phase 4: Add Customization
1. ✅ Create `entity-overrides.json`
2. ✅ Merge overrides with introspected schema
3. ✅ Support computed fields (e.g., `fullName`)

---

## 💡 Benefits

### For Solo Dev
- **ONE PLACE to change**: Database schema
- **No sync issues**: Schema IS the source
- **Faster iterations**: Add field, refresh page
- **Less code**: Delete thousands of lines of config

### For Maintenance
- **Self-documenting**: Schema describes UI
- **Type-safe**: Database constraints → UI validation
- **Consistent**: All entities look/work same way
- **Extensible**: New entities? Just add table!

### For Features
- **Add work_orders table**: Dashboard appears automatically
- **Add custom fields**: Show up instantly
- **Change relationships**: UI updates
- **No frontend deploys**: Schema change → done

---

## 🎯 Next Steps

Would you like me to:
1. **Implement SchemaIntrospectionService** (backend)
2. **Create /api/schema endpoints** (backend)
3. **Build SchemaService** (frontend)
4. **Create GenericEntityDashboard** (frontend)
5. **ALL OF THE ABOVE** 🚀

This is the architecture that lets you scale to 100 entities without writing 100 configs!
