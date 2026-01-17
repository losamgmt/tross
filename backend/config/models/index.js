/**
 * Model Metadata Central Export
 *
 * SRP: ONLY exports all model metadata configurations
 * Single import point for all model metadata
 *
 * AUTO-DISCOVERY: Automatically loads all *-metadata.js files in this directory.
 * To add a new entity, simply create a new {entity-name}-metadata.js file.
 * No manual registration required!
 *
 * Naming Convention:
 * - Filename: {entity-name}-metadata.js (hyphen-separated)
 * - Export key: {entity_name} (underscore-separated, derived from filename)
 * - Example: work-order-metadata.js → exports as 'work_order'
 *
 * @module config/models
 */

const fs = require('fs');
const path = require('path');

/**
 * Auto-discover and load all metadata files in this directory
 * @returns {Object} Map of entityName → metadata
 */
function loadAllMetadata() {
  const metadataDir = __dirname;
  const allMetadata = {};

  // Find all *-metadata.js files (excluding index.js)
  const metadataFiles = fs.readdirSync(metadataDir)
    .filter(file => file.endsWith('-metadata.js'));

  for (const file of metadataFiles) {
    // Load the metadata module
    const metadata = require(path.join(metadataDir, file));

    // Derive entity name from filename:
    // 'work-order-metadata.js' → 'work-order' → 'work_order'
    const entityName = file
      .replace('-metadata.js', '') // Remove suffix
      .replace(/-/g, '_'); // Convert hyphens to underscores

    allMetadata[entityName] = metadata;
  }

  return allMetadata;
}

const allMetadata = loadAllMetadata();

/**
 * Default export: pure metadata object for backwards compatibility.
 * Consumers can iterate with Object.entries(allMetadata) safely.
 */
module.exports = allMetadata;
