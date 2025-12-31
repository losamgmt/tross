#!/usr/bin/env node
/**
 * Analyze validation-rules.json field naming
 * Identifies camelCase vs snake_case fields
 */

const rules = require('../config/validation-rules.json');

const fields = Object.keys(rules.fields);
const camelCase = fields.filter(f => /[A-Z]/.test(f));
const snakeCase = fields.filter(f => !/[A-Z]/.test(f));

console.log('=== CAMELCASE FIELDS (to remove) ===');
camelCase.forEach(f => console.log(`  ${f}`));

console.log('\n=== SNAKE_CASE FIELDS (to keep) ===');
snakeCase.forEach(f => console.log(`  ${f}`));

// Check for missing snake_case equivalents
console.log('\n=== ANALYSIS ===');
const toSnake = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

camelCase.forEach(camel => {
  const snake = toSnake(camel);
  if (snakeCase.includes(snake)) {
    console.log(`  ✓ ${camel} -> ${snake} (EXISTS, safe to remove camel)`);
  } else {
    console.log(`  ✗ ${camel} -> ${snake} (MISSING, need to add snake)`);
  }
});

// Check what composites reference
console.log('\n=== FIELDS USED IN COMPOSITES ===');
const composites = rules.compositeValidations;
const usedFields = new Set();
Object.values(composites).forEach(c => {
  (c.requiredFields || []).forEach(f => usedFields.add(f));
  (c.optionalFields || []).forEach(f => usedFields.add(f));
});
[...usedFields].sort().forEach(f => {
  const exists = fields.includes(f);
  console.log(`  ${exists ? '✓' : '✗'} ${f}`);
});
