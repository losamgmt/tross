#!/usr/bin/env node
/**
 * Verify validation-rules-cleaned.json
 * Ensures all composite fields reference valid field definitions
 */

const r = require('../config/validation-rules-cleaned.json');
const fields = new Set(Object.keys(r.fields));

console.log('=== VALIDATION CHECK ===\n');

let valid = true;
const missing = [];

Object.entries(r.compositeValidations).forEach(([op, c]) => {
  const allFields = [...(c.requiredFields || []), ...(c.optionalFields || [])];
  allFields.forEach(f => {
    if (!fields.has(f)) {
      missing.push({ operation: op, field: f });
      valid = false;
    }
  });
});

if (valid) {
  console.log('✓ All composite fields exist in fields definition.');
  console.log(`  - ${Object.keys(r.compositeValidations).length} operations checked`);
  console.log(`  - ${fields.size} fields available`);
} else {
  console.log('✗ Missing field definitions:');
  missing.forEach(m => console.log(`  ${m.operation} needs "${m.field}"`));
}

console.log('\n=== READY TO APPLY ===');
console.log('Run: copy config\\validation-rules-cleaned.json config\\validation-rules.json');
