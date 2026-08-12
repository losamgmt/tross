#!/usr/bin/env node
/**
 * Export OpenAPI/Swagger specification to JSON file
 * Run with: node backend/scripts/export-openapi.js
 */

const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../config/swagger');

// Write to the committed reference artifact (CI-gated for freshness).
const outputPath = path.join(__dirname, '../../docs/reference/openapi.json');
const outputDir = path.dirname(outputPath);

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the OpenAPI spec to file
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');

console.log('✅ OpenAPI specification exported successfully!');
console.log(`📄 Location: ${outputPath}`);
console.log('\n📦 You can now:');
console.log('  1. Import into Postman: File → Import → openapi.json');
console.log('  2. Use with API clients that support OpenAPI 3.0');
console.log('  3. Generate SDK clients using openapi-generator');
console.log('\n🌐 View live docs at: http://localhost:3001/api-docs');
