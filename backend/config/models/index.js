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
 * VALIDATION: Validates all metadata at load time to catch configuration
 * errors early (fail-fast principle).
 *
 * Naming Convention:
 * - Filename: {entity-name}-metadata.js (hyphen-separated)
 * - Registry key: metadata.entityKey (EXPLICIT in metadata file, not derived)
 * - Example: work-order-metadata.js → metadata.entityKey = 'work_order'
 *
 * @module config/models
 */

const fs = require('fs');
const path = require('path');

/**
 * Auto-discover and load all metadata files in this directory
 * Uses EXPLICIT entityKey from metadata (no derivation from filename)
 * @returns {Object} Map of entityKey → metadata
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

    // Use EXPLICIT entityKey from metadata (SSOT, no derivation)
    const entityKey = metadata.entityKey;
    
    if (!entityKey) {
      throw new Error(
        `Metadata file '${file}' missing required 'entityKey' property. ` +
        `Each metadata file must explicitly define its entityKey.`
      );
    }

    allMetadata[entityKey] = metadata;
  }

  return allMetadata;
}

const allMetadata = loadAllMetadata();

/**
 * Validate all metadata at load time (fail-fast principle)
 * Only run validation if not in production (to avoid startup overhead)
 * and if the validator module exists (to avoid circular dependencies during initial load)
 */
function validateMetadataOnLoad() {
  // Skip validation in production for performance
  if (process.env.NODE_ENV === 'production') {return;}

  // Skip if SKIP_METADATA_VALIDATION is set (useful for some test setups)
  if (process.env.SKIP_METADATA_VALIDATION) {return;}

  try {
    const { validateAllMetadata } = require('../entity-metadata-validator');
    validateAllMetadata(allMetadata, { throwOnError: true });
  } catch (error) {
    // If the validator throws, re-throw to fail fast
    if (error.message?.includes('Entity metadata validation failed')) {
      throw error;
    }
    // If validator module doesn't exist yet (during initial setup), skip silently
    // This handles circular dependency issues during first load
  }
}

// Run validation on module load
validateMetadataOnLoad();

/**
 * Default export: pure metadata object for backwards compatibility.
 * Consumers can iterate with Object.entries(allMetadata) safely.
 */
module.exports = allMetadata;
