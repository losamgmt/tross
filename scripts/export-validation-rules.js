#!/usr/bin/env node
/**
 * Export validation rules to JSON file.
 * Uses the SSOT validation-deriver module.
 */

const fs = require('fs');
const path = require('path');

// Suppress console logs during require
const originalLog = console.log;
const originalWarn = console.warn;
console.log = () => {};
console.warn = () => {};

const { toJSON } = require('../backend/config/validation-deriver');

// Restore console
console.log = originalLog;
console.warn = originalWarn;

const OUTPUT_PATH = path.join(__dirname, '../docs/reference/validation-rules.json');

const json = toJSON();
fs.writeFileSync(OUTPUT_PATH, json, 'utf8');

console.log(`✅ Validation rules exported to: ${OUTPUT_PATH}`);
