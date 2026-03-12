#!/usr/bin/env node
/**
 * Schema Composer - Assembles final schema.sql from parts
 *
 * Responsibility: File composition only (no logic)
 * Reads static parts + generated parts and writes combined output
 *
 * Parts:
 *   1. schema-parts/header.sql - Static intro, extensions
 *   2. DROP statements - Generated from entity list
 *   3. generated/schema-generated.sql - CREATE tables from generate-schema.js
 *   4. seeds/seed-data.sql - INSERT statements
 *
 * Output: backend/schema.sql
 *
 * Usage:
 *   node scripts/compose-schema.js
 *   npm run compose:schema
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BACKEND_DIR = path.join(__dirname, '..', 'backend');

const CONFIG = Object.freeze({
  PARTS_DIR: path.join(BACKEND_DIR, 'schema-parts'),
  GENERATED_DIR: path.join(BACKEND_DIR, 'generated'),
  SEEDS_DIR: path.join(BACKEND_DIR, 'seeds'),
  OUTPUT_FILE: path.join(BACKEND_DIR, 'schema.sql'),

  // Files to compose
  HEADER_FILE: 'header.sql',
  INFRASTRUCTURE_FILE: 'infrastructure.sql',
  GENERATED_FILE: 'schema-generated.sql',
  SEEDS_FILE: 'seed-data.sql',

  // Infrastructure tables (not generated from entity metadata)
  // Note: These are created by infrastructure.sql, not entity metadata
  INFRASTRUCTURE_TABLES: ['system_settings', 'refresh_tokens', 'idempotency_keys'],
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Read file content, return empty string if not found
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  ⚠️  File not found: ${path.basename(filePath)}`);
      return '';
    }
    throw err;
  }
}

/**
 * Extract table names from CREATE TABLE statements
 */
function extractTableNames(sql) {
  const regex = /CREATE TABLE IF NOT EXISTS (\w+)/g;
  const tables = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}

/**
 * Generate DROP TABLE statements in reverse order
 */
function generateDropStatements(tableNames, legacyTables) {
  const allTables = [...legacyTables, ...tableNames.reverse()];
  const lines = [
    '-- ============================================================================',
    '-- PRE-PRODUCTION: DROP ALL TABLES FOR CLEAN RESET',
    '-- Remove this section when you have production data to preserve',
    '-- ============================================================================',
  ];

  for (const table of allTables) {
    lines.push(`DROP TABLE IF EXISTS ${table} CASCADE;`);
  }

  lines.push('');
  return lines.join('\n');
}

// ============================================================================
// COMPOSER
// ============================================================================

function composeSchema() {
  console.log('📦 Schema Composer\n');

  // 1. Read header
  console.log('📄 Reading parts...');
  const headerPath = path.join(CONFIG.PARTS_DIR, CONFIG.HEADER_FILE);
  const header = readFile(headerPath);
  if (!header) {
    console.error('❌ Header file is required');
    return { success: false };
  }
  console.log('  ✓ header.sql');

  // 2. Read generated schema
  const generatedPath = path.join(CONFIG.GENERATED_DIR, CONFIG.GENERATED_FILE);
  const generated = readFile(generatedPath);
  if (!generated) {
    console.error('❌ Generated schema not found. Run: npm run generate:schema --output');
    return { success: false };
  }
  console.log('  ✓ schema-generated.sql');

  // 3. Read infrastructure tables (non-entity system tables)
  const infrastructurePath = path.join(CONFIG.PARTS_DIR, CONFIG.INFRASTRUCTURE_FILE);
  const infrastructure = readFile(infrastructurePath);
  console.log(infrastructure ? '  ✓ infrastructure.sql' : '  ⚠️  No infrastructure tables file');

  // 4. Read seeds
  const seedsPath = path.join(CONFIG.SEEDS_DIR, CONFIG.SEEDS_FILE);
  const seeds = readFile(seedsPath);
  console.log(seeds ? '  ✓ seed-data.sql' : '  ⚠️  No seeds file');

  // 5. Extract table names and generate DROP section
  const tableNames = extractTableNames(generated);
  const infrastructureTableNames = extractTableNames(infrastructure);
  console.log(`\n🗃️  Found ${tableNames.length} entity tables + ${infrastructureTableNames.length} infrastructure tables`);

  const dropSection = generateDropStatements(tableNames, CONFIG.INFRASTRUCTURE_TABLES);

  // 6. Strip header from generated (it has its own header comment)
  // Find where the first entity definition starts (marked by "-- Entity:")
  // Then back up to the preceding section header
  const entityMarkerIndex = generated.indexOf('-- Entity:');
  let generatedBody = generated;
  if (entityMarkerIndex > 0) {
    // Find the "-- ===" that precedes this entity marker
    const precedingSection = generated.lastIndexOf('-- ===', entityMarkerIndex);
    if (precedingSection > 0) {
      generatedBody = generated.substring(precedingSection);
    }
  }

  // 7. Compose final output
  // Order matters: header → drops → entities → infrastructure (FKs depend on entities) → seeds
  console.log('\n🔧 Composing schema.sql...');
  const composed = [
    header.trim(),
    '',
    dropSection,
    generatedBody.trim(),
    '',
    infrastructure ? infrastructure.trim() : '',
    '',
    seeds.trim(),
    '',
  ].filter(section => section !== '').join('\n\n');

  // 8. Write output
  fs.writeFileSync(CONFIG.OUTPUT_FILE, composed, 'utf8');
  console.log(`\n✅ Written to: ${CONFIG.OUTPUT_FILE}`);
  console.log(`   ${composed.split('\n').length} lines`);

  return { success: true, tables: [...tableNames, ...infrastructureTableNames] };
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const result = composeSchema();
  return result.success ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  composeSchema,
  extractTableNames,
  generateDropStatements,
};
