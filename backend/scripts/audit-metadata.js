#!/usr/bin/env node
/**
 * Metadata Audit Script
 *
 * Quick audit of all entity metadata for completeness and consistency.
 */

const m = require('../config/models');
const { extractForeignKeyFields } = require('../config/fk-helpers');

console.log('--- FIELD ACCESS vs FIELDS AUDIT ---');
console.log('');

let issues = 0;

for (const [name, meta] of Object.entries(m)) {
  const fieldNames = Object.keys(meta.fields || {});
  const accessNames = Object.keys(meta.fieldAccess || {});
  const relationshipNames = Object.keys(meta.relationships || {});

  // Fields in fieldAccess but not in fields - exclude relationship names
  const missingFromFields = accessNames.filter(
    (f) => fieldNames.indexOf(f) === -1 && relationshipNames.indexOf(f) === -1,
  );

  // Fields in fields but not in fieldAccess (except system fields)
  const systemFields = ['id', 'created_at', 'updated_at', 'is_active'];
  const missingFromAccess = fieldNames.filter(
    (f) => accessNames.indexOf(f) === -1 && systemFields.indexOf(f) === -1,
  );

  if (missingFromFields.length > 0 || missingFromAccess.length > 0) {
    console.log(name + ':');
    if (missingFromFields.length > 0) {
      console.log('  ⚠ In fieldAccess but not fields/relationships:', missingFromFields.join(', '));
      issues++;
    }
    if (missingFromAccess.length > 0) {
      console.log('  ⚠ In fields but not fieldAccess:', missingFromAccess.join(', '));
      issues++;
    }
  }
}

console.log('');
console.log('--- REQUIRED FIELDS AUDIT ---');
console.log('');

for (const [name, meta] of Object.entries(m)) {
  const fieldNames = Object.keys(meta.fields || {});
  const requiredFields = meta.requiredFields || [];

  // Required fields not in fields definition
  const missingRequired = requiredFields.filter(f => fieldNames.indexOf(f) === -1);

  if (missingRequired.length > 0) {
    console.log(name + ':');
    console.log('  ⚠ Required but not in fields:', missingRequired.join(', '));
    issues++;
  }
}

console.log('');
console.log('--- FOREIGN KEY AUDIT ---');
console.log('');

const entityKeys = Object.keys(m);

for (const [name, meta] of Object.entries(m)) {
  // Extract FK fields from fields section (type: 'foreignKey' with references)
  const fks = extractForeignKeyFields(meta);

  for (const [fkField, fkConfig] of Object.entries(fks)) {
    if (fkConfig.references) {
      if (entityKeys.indexOf(fkConfig.references) === -1) {
        console.log(name + '.' + fkField + ':');
        console.log('  ⚠ References unknown entity:', fkConfig.references);
        issues++;
      }
    }
  }
}

console.log('');
console.log('--- SUMMARY ---');
console.log('');
console.log('Entities:', Object.keys(m).length);
console.log('Issues:', issues);
console.log(issues === 0 ? '✓ All metadata consistent' : '⚠ Issues found');

process.exit(issues > 0 ? 1 : 0);
