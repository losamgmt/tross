/**
 * Entity Verifier - Pure verification logic for SSOT pipeline.
 * Phases: LOAD → VERIFY → REPORT
 *
 * @module scripts/lib/entity-verifier
 */

const fs = require('fs');
const path = require('path');

const {
  ROOT_DIR,
  BACKEND_DIR,
  BACKEND_MODELS_DIR,
  ENTITY_METADATA_JSON,
  CONFIG_PERMISSIONS_JSON,
  RESOURCE_TYPE_DART,
} = require('./paths');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  SCHEMA_FILE: path.join(BACKEND_DIR, 'schema.sql'),
  ENTITY_REGISTRY: path.join(BACKEND_DIR, '__tests__', 'factory', 'entity-registry.js'),

  REQUIRED_FIELDS: Object.freeze(['entityKey', 'tableName', 'primaryKey', 'fields']),
  DART_EXCLUSIONS: Object.freeze(['file_attachment']),
});

// ============================================================================
// LOAD PHASE - Gather all data upfront
// ============================================================================

/**
 * Load all verification context for an entity.
 * @param {string} entityName - Entity key (e.g., 'customer')
 * @returns {Object} Context object with all loaded data
 */
function loadContext(entityName) {
  // Convert snake_case entity key to kebab-case filename
  const fileName = entityName.replace(/_/g, '-');
  const metadataPath = path.join(BACKEND_MODELS_DIR, `${fileName}-metadata.js`);

  return {
    entityName,
    metadataPath: fs.existsSync(metadataPath) ? metadataPath : null,
    metadata: safeRequire(metadataPath),
    frontendJson: safeReadJson(ENTITY_METADATA_JSON),
    permissionsJson: safeReadJson(CONFIG_PERMISSIONS_JSON),
    dartContent: safeReadFile(RESOURCE_TYPE_DART),
    schemaContent: safeReadFile(CONFIG.SCHEMA_FILE),
    registryEntities: safeLoadRegistry(),
  };
}

/** Safe require with cache clear */
function safeRequire(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch {
    return null;
  }
}

/** Safe JSON read */
function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Safe file read */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** Safe registry load */
function safeLoadRegistry() {
  try {
    delete require.cache[require.resolve(CONFIG.ENTITY_REGISTRY)];
    const registry = require(CONFIG.ENTITY_REGISTRY);
    return {
      all: registry.getAllEntityNames(),
      genericCrud: registry.getGenericCrudEntityNames(),
    };
  } catch {
    return { all: [], genericCrud: [] };
  }
}

// ============================================================================
// VERIFY PHASE - Pure checkpoint functions
// ============================================================================

/**
 * Each checkpoint: (context) => { passed: boolean, detail: string, skip?: boolean }
 */

const verifyMetadataExists = (ctx) => ({
  passed: ctx.metadataPath !== null,
  detail: ctx.metadataPath
    ? ctx.metadataPath.replace(ROOT_DIR, '')
    : `${ctx.entityName}-metadata.js not found`,
});

const verifyMetadataFields = (ctx) => {
  if (!ctx.metadata) return { passed: false, detail: 'No metadata loaded' };

  const missing = CONFIG.REQUIRED_FIELDS.filter((f) => !ctx.metadata[f]);
  return missing.length === 0
    ? { passed: true, detail: `${CONFIG.REQUIRED_FIELDS.length} required fields` }
    : { passed: false, detail: `Missing: ${missing.join(', ')}` };
};

const verifyFrontendJson = (ctx) => {
  if (!ctx.frontendJson) return { passed: false, detail: 'Cannot read entity-metadata.json' };

  const entry = ctx.frontendJson[ctx.entityName];
  if (!entry) return { passed: false, detail: `"${ctx.entityName}" not in JSON` };

  const fieldCount = Object.keys(entry.fields || {}).length;
  return { passed: true, detail: `${fieldCount} fields synced` };
};

const verifyPermissions = (ctx) => {
  if (!ctx.permissionsJson) return { passed: false, detail: 'Cannot read permissions.json' };

  const resourceName = ctx.metadata?.rlsResource || ctx.entityName + 's';
  const hasResource = ctx.permissionsJson.resources?.[resourceName];

  return hasResource
    ? { passed: true, detail: `Resource "${resourceName}"` }
    : { passed: false, detail: `"${resourceName}" not in resources` };
};

const verifyDartEnum = (ctx) => {
  if (CONFIG.DART_EXCLUSIONS.includes(ctx.entityName)) {
    return { skip: true, detail: 'Excluded by design' };
  }
  if (!ctx.dartContent) return { passed: false, detail: 'Cannot read resource_type.dart' };

  // Dart enum uses table name (plural) or camelCase with string parameter
  // Examples: "customers," or "auditLogs('audit_logs'),"
  const tableName = ctx.metadata?.tableName || ctx.entityName + 's';
  const pattern = new RegExp(`\\b${tableName}\\b|'${tableName}'`, 'i');
  return pattern.test(ctx.dartContent)
    ? { passed: true, detail: `ResourceType (${tableName})` }
    : { passed: false, detail: `"${tableName}" not in enum` };
};

const verifySchema = (ctx) => {
  if (!ctx.schemaContent) return { passed: false, detail: 'Cannot read schema.sql' };

  const tableName = ctx.metadata?.tableName || ctx.entityName + 's';
  const pattern = new RegExp(`CREATE TABLE[^;]*\\b${tableName}\\b`, 'i');

  return pattern.test(ctx.schemaContent)
    ? { passed: true, detail: `CREATE TABLE ${tableName}` }
    : { passed: false, detail: `Table "${tableName}" not found` };
};

const verifyRegistry = (ctx) => {
  if (!ctx.registryEntities.all.length) {
    return { passed: false, detail: 'Registry not loaded' };
  }

  const found = ctx.registryEntities.all.includes(ctx.entityName);
  if (!found) return { passed: false, detail: 'Not discovered' };

  const isGeneric = ctx.registryEntities.genericCrud.includes(ctx.entityName);
  return { passed: true, detail: isGeneric ? 'Generic CRUD' : 'Specialized' };
};

/** Ordered checkpoint definitions */
const CHECKPOINTS = Object.freeze([
  { name: 'Metadata file', fn: verifyMetadataExists },
  { name: 'Metadata fields', fn: verifyMetadataFields },
  { name: 'Frontend JSON', fn: verifyFrontendJson },
  { name: 'Permissions', fn: verifyPermissions },
  { name: 'Dart enum', fn: verifyDartEnum },
  { name: 'Schema SQL', fn: verifySchema },
  { name: 'Entity registry', fn: verifyRegistry },
]);

/**
 * Run all checkpoints against a context.
 * @param {Object} ctx - Loaded context from loadContext()
 * @returns {Object} { entity, checks: [{name, status, detail}], passed, failed }
 */
function runCheckpoints(ctx) {
  const checks = CHECKPOINTS.map(({ name, fn }) => {
    const result = fn(ctx);
    return {
      name,
      status: result.skip ? 'skip' : result.passed ? 'pass' : 'fail',
      detail: result.detail || '',
    };
  });

  return {
    entity: ctx.entityName,
    checks,
    passed: checks.filter((c) => c.status === 'pass').length,
    failed: checks.filter((c) => c.status === 'fail').length,
  };
}

// ============================================================================
// REPORT PHASE - Format results
// ============================================================================

const ICONS = { pass: '✅', fail: '❌', skip: '⏭️' };

/**
 * Format verification results for console output.
 * @param {Object} result - From runCheckpoints()
 * @returns {string} Formatted output
 */
function formatResult(result) {
  const lines = [`\n[${result.entity}] SSOT Pipeline Verification`];

  for (const check of result.checks) {
    const detail = check.detail ? ` (${check.detail})` : '';
    lines.push(`  ${ICONS[check.status]} ${check.name}${detail}`);
  }

  lines.push('─'.repeat(45));

  if (result.failed === 0) {
    lines.push(`[${result.entity}] ✅ ${result.passed} checks passed`);
  } else {
    lines.push(`[${result.entity}] ❌ ${result.failed} failed, ${result.passed} passed`);
  }

  return lines.join('\n');
}

/**
 * Format summary for multiple entities.
 * @param {Object[]} results - Array of runCheckpoints() results
 * @returns {string} Summary output
 */
function formatSummary(results) {
  const ok = results.filter((r) => r.failed === 0).length;
  const issues = results.length - ok;

  return [
    '\n' + '═'.repeat(45),
    `SUMMARY: ${ok} entities OK, ${issues} with issues`,
    '═'.repeat(45),
  ].join('\n');
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Verify a single entity.
 * @param {string} entityName - Entity key
 * @returns {Object} Verification result
 */
function verifyEntity(entityName) {
  const ctx = loadContext(entityName);
  return runCheckpoints(ctx);
}

/**
 * Verify all entities from metadata index.
 * @returns {Object[]} Array of verification results
 */
function verifyAll() {
  const allMetadata = safeRequire(path.join(BACKEND_MODELS_DIR, 'index.js')) || {};
  return Object.keys(allMetadata).map(verifyEntity);
}

/**
 * Get list of all entity names.
 * @returns {string[]} Entity names
 */
function getAllEntityNames() {
  const allMetadata = safeRequire(path.join(BACKEND_MODELS_DIR, 'index.js')) || {};
  return Object.keys(allMetadata);
}

module.exports = {
  // Core API
  verifyEntity,
  verifyAll,
  getAllEntityNames,

  // For testing: expose pure functions
  loadContext,
  runCheckpoints,
  formatResult,
  formatSummary,
  CHECKPOINTS,
  CONFIG,
};
