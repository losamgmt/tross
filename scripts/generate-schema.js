#!/usr/bin/env node
/**
 * Schema Generator - Generates SQL from entity metadata (SSOT).
 * Phases: LOAD → NORMALIZE → VALIDATE → GENERATE → ASSEMBLE
 */

const fs = require('fs');
const path = require('path');

// Shared utilities
const { BACKEND_MODELS_DIR, BACKEND_DIR } = require('./lib/paths');

// Field type utilities - SSOT for SQL type derivation
const {
  deriveSqlType,
  getEnumValues,
  NAME_PATTERNS,
  FIELD,
} = require('../backend/config/field-types');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  OUTPUT_DIR: path.join(BACKEND_DIR, 'generated'),
  OUTPUT_FILE: 'schema-generated.sql',
  SCHEMA_FILE: path.join(BACKEND_DIR, 'schema.sql'),

  /** Column ordering for consistent output */
  COLUMN_ORDER: Object.freeze({
    ID: 1,
    IDENTITY: 2,
    IS_ACTIVE: 3,
    CREATED_AT: 4,
    UPDATED_AT: 5,
    NAME_PATTERN: 10,
    STATUS: 20,
    OTHER: 30,
  }),

  /** TIER 1 fields - every entity gets these */
  TIER1_COLUMNS: Object.freeze([
    { name: 'id', sqlType: 'SERIAL', constraints: ['PRIMARY KEY'], order: 1 },
    { name: 'is_active', sqlType: 'BOOLEAN', constraints: ['DEFAULT true', 'NOT NULL'], order: 3 },
    { name: 'created_at', sqlType: 'TIMESTAMPTZ', constraints: ['DEFAULT CURRENT_TIMESTAMP', 'NOT NULL'], order: 4 },
    { name: 'updated_at', sqlType: 'TIMESTAMPTZ', constraints: ['DEFAULT CURRENT_TIMESTAMP', 'NOT NULL'], order: 5 },
  ]),

  /** Name pattern field definitions */
  NAME_PATTERN_COLUMNS: Object.freeze({
    [NAME_PATTERNS.HUMAN]: [
      { name: 'first_name', sqlType: FIELD.FIRST_NAME.sqlType, constraints: ['NOT NULL'] },
      { name: 'last_name', sqlType: FIELD.LAST_NAME.sqlType, constraints: ['NOT NULL'] },
    ],
    [NAME_PATTERNS.SIMPLE]: [
      { name: 'name', sqlType: FIELD.NAME.sqlType, constraints: ['NOT NULL'] },
    ],
    [NAME_PATTERNS.COMPUTED]: [],
    // namePattern: null entities (system tables, junctions) have no auto-generated name columns
  }),

  /** Table name pluralization overrides */
  TABLE_OVERRIDES: Object.freeze({
    inventory: 'inventory',
    property: 'properties',
  }),

  /** Enum VARCHAR padding */
  ENUM_PADDING: { multiplier: 1.5, base: 10 },
});

// ============================================================================
// HELPERS
// ============================================================================

/** Escape single quotes for SQL literals */
const escapeSql = (str) => String(str).replace(/'/g, "''");

/** Convert entity key to table name */
const pluralizeTable = (entityKey) =>
  CONFIG.TABLE_OVERRIDES[entityKey] ||
  (entityKey.endsWith('s') ? entityKey : entityKey + 's');

/** Serialize a default value for SQL */
function serializeDefault(value) {
  if (typeof value === 'string') return `'${escapeSql(value)}'`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object' && value !== null) {
    return `'${escapeSql(JSON.stringify(value))}'::jsonb`;
  }
  return String(value);
}

/** @typedef {{name: string, sqlType: string, constraints: string[], order: number, references?: string, check?: string}} Column */
/** @typedef {{entityKey: string, tableName: string, columns: Column[], indexes: string[]}} NormalizedEntity */

// ============================================================================
// LOAD
// ============================================================================

function loadAllMetadata(modelsDir = BACKEND_MODELS_DIR) {
  const metadata = [];
  const errors = [];

  const files = fs.readdirSync(modelsDir).filter((f) => {
    return f.endsWith('-metadata.js') && !f.includes('.types.');
  });

  for (const file of files) {
    const filePath = path.join(modelsDir, file);
    try {
      delete require.cache[require.resolve(filePath)];
      metadata.push(require(filePath));
    } catch (error) {
      errors.push(new Error(`Failed to load ${file}: ${error.message}`));
    }
  }

  return { metadata, errors };
}

// ============================================================================
// NORMALIZE
// ============================================================================

/** Transform raw metadata into uniform Column[] structure */
function normalizeEntity(raw) {
  const { entityKey, tableName, namePattern, identityField, identityFieldUnique, isSystemTable, sharedPrimaryKey } = raw;
  const columns = [];
  const indexes = [];
  const ORDER = CONFIG.COLUMN_ORDER;

  // TIER 1 - system tables skip is_active and updated_at (immutable logs)
  // sharedPrimaryKey entities skip is_active (1:1 with user, soft-delete via user)
  // sharedPrimaryKey entities have a different id column (INTEGER vs SERIAL)
  const skipForSystem = new Set(['is_active', 'updated_at']);
  const skipForSharedPK = new Set(['is_active']);
  for (const tier1 of CONFIG.TIER1_COLUMNS) {
    if (isSystemTable && skipForSystem.has(tier1.name)) continue;
    if (sharedPrimaryKey && skipForSharedPK.has(tier1.name)) continue;
    
    // For sharedPrimaryKey entities, replace SERIAL PRIMARY KEY with INTEGER PRIMARY KEY + FK
    // FK reference is now in fields.id (type: 'foreignKey', relatedEntity: 'user')
    if (sharedPrimaryKey && tier1.name === 'id') {
      const idFieldDef = raw.fields?.id;
      if (idFieldDef?.type === 'foreignKey' && idFieldDef.relatedEntity) {
        // Get the related entity's table name from metadata
        const relatedEntityMeta = require(`../backend/config/models`)[idFieldDef.relatedEntity];
        const refTable = relatedEntityMeta?.tableName || pluralizeTable(idFieldDef.relatedEntity);
        columns.push({
          name: 'id',
          sqlType: 'INTEGER',
          constraints: ['PRIMARY KEY'],
          references: `${refTable}(id) ON DELETE CASCADE`,
          order: ORDER.ID,
        });
        continue;
      }
    }
    columns.push({ ...tier1 });
  }

  // Name pattern columns
  const namePatternCols = CONFIG.NAME_PATTERN_COLUMNS[namePattern] || [];
  namePatternCols.forEach((col, i) => {
    const column = { ...col, order: ORDER.NAME_PATTERN + i };
    // Check if identity field OR if field definition has unique: true
    const fieldDef = raw.fields[col.name];
    const shouldBeUnique =
      (col.name === identityField && identityFieldUnique !== false) ||
      fieldDef?.unique === true;
    if (shouldBeUnique && !column.constraints.includes('UNIQUE')) {
      column.constraints = [...column.constraints, 'UNIQUE'];
    }
    columns.push(column);
  });

  // Identity field (if not id and not a name-pattern field)
  const namePatternFieldNames = namePatternCols.map((c) => c.name);
  if (identityField !== 'id' && !namePatternFieldNames.includes(identityField)) {
    const identityDef = raw.fields[identityField];
    if (identityDef) {
      const col = normalizeField(identityField, identityDef, raw);
      col.order = ORDER.IDENTITY;
      if (identityFieldUnique !== false && !col.constraints.includes('UNIQUE')) {
        col.constraints.push('UNIQUE');
      }
      columns.push(col);
    }
  }

  // Status field (if present)
  if (raw.fields.status) {
    const col = normalizeField('status', raw.fields.status, raw);
    col.order = ORDER.STATUS;
    columns.push(col);
  }

  // Remaining fields
  const skipFields = new Set([
    'id', 'is_active', 'created_at', 'updated_at', 'status',
    identityField, ...namePatternFieldNames,
  ]);

  let otherOrder = ORDER.OTHER;
  for (const [fieldName, fieldDef] of Object.entries(raw.fields)) {
    if (skipFields.has(fieldName)) continue;
    const col = normalizeField(fieldName, fieldDef, raw);
    col.order = otherOrder++;
    columns.push(col);
  }

  // Indexes: identity, searchable, foreign keys
  if (identityField !== 'id') indexes.push(identityField);
  if (raw.searchableFields) {
    for (const field of raw.searchableFields) {
      if (field !== 'id' && !indexes.includes(field)) indexes.push(field);
    }
  }
  for (const [fieldName, fieldDef] of Object.entries(raw.fields)) {
    if (fieldDef.type === 'foreignKey' && !indexes.includes(fieldName)) indexes.push(fieldName);
  }

  return { entityKey, tableName, columns, indexes };
}

/** Normalize field definition into Column */
function normalizeField(fieldName, fieldDef, metadata) {
  const constraints = [];
  let sqlType, references, check;

  // SQL type
  if (fieldDef.type === 'enum') {
    const values = fieldDef.enumKey && metadata.enums?.[fieldDef.enumKey]
      ? getEnumValues(metadata.enums[fieldDef.enumKey])
      : fieldDef.values || [];
    const maxLen = Math.max(...values.map((v) => v.length), 10);
    const padded = Math.ceil(maxLen * CONFIG.ENUM_PADDING.multiplier) + CONFIG.ENUM_PADDING.base;
    sqlType = `VARCHAR(${padded})`;
    if (values.length > 0) {
      check = `${fieldName} IN (${values.map((v) => `'${escapeSql(v)}'`).join(', ')})`;
    }
  } else {
    sqlType = deriveSqlType(fieldDef);
  }

  // NOT NULL
  if (fieldDef.required || metadata.requiredFields?.includes(fieldName)) {
    constraints.push('NOT NULL');
  }

  // UNIQUE (field-level)
  if (fieldDef.unique) {
    constraints.push('UNIQUE');
  }

  // DEFAULT
  if (fieldDef.default !== undefined) {
    constraints.push(`DEFAULT ${serializeDefault(fieldDef.default)}`);
  }

  // FK reference
  if (fieldDef.type === 'foreignKey' && fieldDef.relatedEntity) {
    references = `${pluralizeTable(fieldDef.relatedEntity)}(id)`;
  }

  return { name: fieldName, sqlType, constraints, references, check, order: 0 };
}

// ============================================================================
// VALIDATE
// ============================================================================

function validateEntity(entity) {
  const errors = [];
  const { entityKey, tableName, columns } = entity;

  if (!entityKey) {
    errors.push(new Error('Missing entityKey'));
  }
  if (!tableName) {
    errors.push(new Error(`[${entityKey}] Missing tableName`));
  }
  if (!columns || columns.length === 0) {
    errors.push(new Error(`[${entityKey}] No columns defined`));
  }

  // Check all columns have required properties
  for (const col of columns) {
    if (!col.name) {
      errors.push(new Error(`[${entityKey}] Column missing name`));
    }
    if (!col.sqlType) {
      errors.push(new Error(`[${entityKey}.${col.name}] Missing sqlType`));
    }
  }

  // Check for id column
  const hasId = columns.some((c) => c.name === 'id');
  if (!hasId) {
    errors.push(new Error(`[${entityKey}] Missing id column`));
  }

  return errors;
}

// ============================================================================
// SORT (Topological sort by FK dependencies)
// ============================================================================

/**
 * Extract FK dependencies from normalized entity
 * @param {NormalizedEntity} entity
 * @returns {string[]} Array of table names this entity depends on
 */
function extractDependencies(entity) {
  const deps = [];
  for (const col of entity.columns) {
    if (col.references) {
      // Extract table name from "tableName(id)"
      const match = col.references.match(/^(\w+)\(/);
      if (match) {
        deps.push(match[1]);
      }
    }
  }
  return deps;
}

/**
 * Topological sort of entities by FK dependencies
 * Entities are sorted so that dependencies come before dependents
 *
 * @param {NormalizedEntity[]} entities
 * @returns {NormalizedEntity[]} Sorted entities
 */
function sortByDependencies(entities) {
  const tableToEntity = new Map();
  const graph = new Map();

  // Build lookup and dependency graph
  for (const entity of entities) {
    tableToEntity.set(entity.tableName, entity);
    graph.set(entity.tableName, extractDependencies(entity));
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map();
  for (const entity of entities) {
    inDegree.set(entity.tableName, 0);
  }

  for (const [table, deps] of graph) {
    for (const dep of deps) {
      if (inDegree.has(dep)) {
        inDegree.set(dep, inDegree.get(dep) + 1);
      }
    }
  }

  // Actually, we need the inverse - count how many tables depend on each
  // Reset and recalculate: for each table, count tables that reference it
  for (const entity of entities) {
    inDegree.set(entity.tableName, 0);
  }

  for (const [table, deps] of graph) {
    // 'table' depends on each dep - so dep should come before table
    // This means we need to use standard topological sort where
    // indegree counts incoming edges (dependencies)
    const count = deps.filter((d) => tableToEntity.has(d)).length;
    inDegree.set(table, count);
  }

  // Start with tables that have no dependencies
  const queue = [];
  for (const [table, degree] of inDegree) {
    if (degree === 0) {
      queue.push(table);
    }
  }

  const sorted = [];
  while (queue.length > 0) {
    // Sort queue alphabetically for deterministic output
    queue.sort();
    const current = queue.shift();
    sorted.push(tableToEntity.get(current));

    // Find all tables that depend on current, decrement in-degree
    for (const [table, deps] of graph) {
      if (deps.includes(current)) {
        const newDegree = inDegree.get(table) - 1;
        inDegree.set(table, newDegree);
        if (newDegree === 0) {
          queue.push(table);
        }
      }
    }
  }

  // Check for cycles (should not happen with proper FK design)
  if (sorted.length !== entities.length) {
    console.warn('⚠️ Circular FK dependencies detected, falling back to alphabetical order');
    return [...entities].sort((a, b) => a.tableName.localeCompare(b.tableName));
  }

  return sorted;
}

// ============================================================================
// GENERATE
// ============================================================================

function generateColumnSql(column) {
  const parts = [column.name, column.sqlType];

  // Add constraints in order: UNIQUE, NOT NULL, DEFAULT
  for (const constraint of column.constraints) {
    parts.push(constraint);
  }

  // CHECK constraint
  if (column.check) {
    parts.push(`CHECK (${column.check})`);
  }

  // REFERENCES
  if (column.references) {
    parts.push(`REFERENCES ${column.references}`);
  }

  return parts.join(' ');
}

function generateTableSql(entity) {
  const { tableName, entityKey, columns } = entity;
  const lines = [];

  // Header
  lines.push('-- ============================================================================');
  lines.push(`-- ${tableName.toUpperCase()}`);
  lines.push('-- ============================================================================');
  lines.push(`-- Entity: ${entityKey}`);
  lines.push('-- ============================================================================');
  lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);

  // Sort columns by order
  const sortedCols = [...columns].sort((a, b) => a.order - b.order);
  const colLines = sortedCols.map((col) => `    ${generateColumnSql(col)}`);
  lines.push(colLines.join(',\n'));

  lines.push(');');

  return lines.join('\n');
}

function generateIndexSql(entity) {
  const { tableName, indexes } = entity;
  return indexes.map((field) =>
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_${field} ON ${tableName}(${field});`
  );
}

// ============================================================================
// ASSEMBLE
// ============================================================================

function assembleSchema(statements, timestamp = new Date().toISOString()) {
  const header = `-- ============================================================================
-- GENERATED SCHEMA - SINGLE SOURCE OF TRUTH
-- ============================================================================
-- Generated: ${timestamp}
-- Command: npm run generate:schema
--
-- This file is for REVIEW. Merge changes into backend/schema.sql manually.
-- ============================================================================

`;

  const body = statements.map(({ table, indexes }) => {
    const parts = [table];
    if (indexes.length > 0) {
      parts.push('');
      parts.push('-- Indexes');
      parts.push(...indexes);
    }
    parts.push('');
    return parts.join('\n');
  }).join('\n');

  return header + body;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Generate SQL schema from entity metadata.
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.validateOnly=false] - If true, skip SQL generation and just validate
 * @param {string} [options.modelsDir] - Override models directory (for testing)
 * @returns {{success: boolean, sql?: string, entities?: Array, errors?: Error[]}}
 */
function generateSchema(options = {}) {
  const { validateOnly = false, modelsDir } = options;

  // Phase 1: LOAD
  const { metadata: rawMetadata, errors: loadErrors } = loadAllMetadata(modelsDir);
  if (loadErrors.length > 0) {
    return { success: false, errors: loadErrors };
  }

  // Phase 2 & 3: NORMALIZE + VALIDATE
  const normalized = [];
  const allErrors = [];

  for (const raw of rawMetadata) {
    try {
      const entity = normalizeEntity(raw);
      const validationErrors = validateEntity(entity);
      if (validationErrors.length > 0) {
        allErrors.push(...validationErrors);
      } else {
        normalized.push(entity);
      }
    } catch (error) {
      allErrors.push(new Error(`[${raw.entityKey || 'unknown'}] ${error.message}`));
    }
  }

  if (allErrors.length > 0) {
    return { success: false, errors: allErrors };
  }

  // Phase 4: SORT (by FK dependencies)
  const sorted = sortByDependencies(normalized);

  const entities = sorted.map((e) => ({ entityKey: e.entityKey, tableName: e.tableName }));

  if (validateOnly) {
    return { success: true, entities };
  }

  // Phase 5: GENERATE
  const statements = sorted.map((entity) => ({
    table: generateTableSql(entity),
    indexes: generateIndexSql(entity),
  }));

  // Phase 6: ASSEMBLE
  const sql = assembleSchema(statements);

  return { success: true, sql, entities };
}

// ============================================================================
// CLI
// ============================================================================

function main(args = process.argv.slice(2)) {
  const dryRun = args.includes('--dry-run');
  const outputToFile = args.includes('--output');

  console.log('🔍 Schema Generator\n');

  const result = generateSchema({ validateOnly: dryRun });

  // Handle errors
  if (!result.success) {
    console.log('❌ Generation failed:\n');
    for (const error of result.errors) {
      console.log(`   • ${error.message}`);
    }
    return 1;
  }

  // Report success
  console.log(`✅ Processed ${result.entities.length} entities:`);
  for (const entity of result.entities) {
    console.log(`   • ${entity.entityKey} → ${entity.tableName}`);
  }
  console.log('');

  if (dryRun) {
    console.log('🏁 Dry run complete - validation passed');
    return 0;
  }

  // Output
  if (outputToFile) {
    const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(outputPath, result.sql, 'utf8');
    console.log(`📁 Wrote to: ${outputPath}`);
  } else {
    console.log(result.sql);
  }

  console.log('\n🏁 Schema generation complete');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Helpers
  escapeSql,
  pluralizeTable,
  serializeDefault,

  // Pipeline phases
  loadAllMetadata,
  normalizeEntity,
  normalizeField,
  validateEntity,
  extractDependencies,
  sortByDependencies,
  generateColumnSql,
  generateTableSql,
  generateIndexSql,
  assembleSchema,
  generateSchema,

  // Config
  CONFIG,
};
