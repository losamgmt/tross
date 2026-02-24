/**
 * Shared Path Definitions for Scripts
 *
 * SINGLE SOURCE OF TRUTH for all script path references.
 * Import this instead of hardcoding paths in individual scripts.
 *
 * @module scripts/lib/paths
 */

const path = require("path");

// Root directories
const ROOT_DIR = path.resolve(__dirname, "../..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const CONFIG_DIR = path.join(ROOT_DIR, "config");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");

// Backend paths
const BACKEND_CONFIG_DIR = path.join(BACKEND_DIR, "config");
const BACKEND_MODELS_DIR = path.join(BACKEND_CONFIG_DIR, "models");

// Frontend paths
const FRONTEND_ASSETS_DIR = path.join(FRONTEND_DIR, "assets");
const FRONTEND_CONFIG_DIR = path.join(FRONTEND_ASSETS_DIR, "config");
const FRONTEND_LIB_DIR = path.join(FRONTEND_DIR, "lib");
const FRONTEND_GENERATED_DIR = path.join(FRONTEND_LIB_DIR, "generated");

// Specific files
const ENTITY_METADATA_JSON = path.join(
  FRONTEND_CONFIG_DIR,
  "entity-metadata.json"
);
const FRONTEND_PERMISSIONS_JSON = path.join(
  FRONTEND_CONFIG_DIR,
  "permissions.json"
);
const CONFIG_PERMISSIONS_JSON = path.join(CONFIG_DIR, "permissions.json");
const RESOURCE_TYPE_DART = path.join(FRONTEND_GENERATED_DIR, "resource_type.dart");
const BACKEND_MODELS_INDEX = path.join(BACKEND_MODELS_DIR, "index.js");

module.exports = {
  // Root directories
  ROOT_DIR,
  BACKEND_DIR,
  FRONTEND_DIR,
  CONFIG_DIR,
  SCRIPTS_DIR,
  // Backend paths
  BACKEND_CONFIG_DIR,
  BACKEND_MODELS_DIR,
  // Frontend paths
  FRONTEND_ASSETS_DIR,
  FRONTEND_CONFIG_DIR,
  FRONTEND_LIB_DIR,
  FRONTEND_GENERATED_DIR,
  // Specific files
  ENTITY_METADATA_JSON,
  FRONTEND_PERMISSIONS_JSON,
  CONFIG_PERMISSIONS_JSON,
  RESOURCE_TYPE_DART,
  BACKEND_MODELS_INDEX,
};
