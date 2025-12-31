#!/usr/bin/env node
/**
 * Transform validation-rules.json to snake_case only
 * 
 * This script:
 * 1. Converts all camelCase field keys to snake_case
 * 2. Removes duplicate camelCase entries where snake_case exists
 * 3. Preserves all field definitions
 * 4. Outputs the cleaned JSON
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../config/validation-rules.json');
const outputPath = path.join(__dirname, '../config/validation-rules-cleaned.json');

const rules = require(inputPath);

// Convert camelCase to snake_case
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Track what we're doing
const actions = [];

// Process fields
const newFields = {};
const processedSnakeKeys = new Set();

Object.entries(rules.fields).forEach(([key, value]) => {
  const hasCamel = /[A-Z]/.test(key);
  
  if (hasCamel) {
    const snakeKey = toSnakeCase(key);
    
    // Check if snake_case version already exists
    if (rules.fields[snakeKey]) {
      actions.push(`SKIP: ${key} (snake_case ${snakeKey} already exists)`);
      // Don't add - we'll use the existing snake_case version
    } else {
      // Convert this camelCase to snake_case
      actions.push(`CONVERT: ${key} -> ${snakeKey}`);
      newFields[snakeKey] = value;
      processedSnakeKeys.add(snakeKey);
    }
  } else {
    // Already snake_case, keep as-is
    if (!processedSnakeKeys.has(key)) {
      actions.push(`KEEP: ${key}`);
      newFields[key] = value;
    }
  }
});

// Build new rules object
const newRules = {
  ...rules,
  fields: newFields,
  // Update version to reflect this change
  version: "2.1.1",
  lastUpdated: new Date().toISOString().split('T')[0],
};

// Add changelog entry
if (newRules.metadata && newRules.metadata.changelog) {
  newRules.metadata.changelog.unshift({
    version: "2.1.1",
    date: new Date().toISOString().split('T')[0],
    changes: [
      "BREAKING: Converted all field keys to snake_case",
      "Removed duplicate camelCase field definitions",
      "Eliminated need for field name mapping in validation-loader.js",
      "Single naming convention across entire stack"
    ]
  });
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(newRules, null, 2) + '\n');

console.log('=== TRANSFORMATION COMPLETE ===\n');
console.log('Actions taken:');
actions.forEach(a => console.log(`  ${a}`));
console.log(`\nOutput written to: ${outputPath}`);
console.log(`\nField count: ${Object.keys(rules.fields).length} -> ${Object.keys(newFields).length}`);
console.log('\nReview the output file, then run:');
console.log('  mv config/validation-rules-cleaned.json config/validation-rules.json');
