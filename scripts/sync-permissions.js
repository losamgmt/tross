#!/usr/bin/env node
/**
 * Sync Permissions Script
 * 
 * SINGLE SOURCE OF TRUTH: Backend entity metadata → permissions.json
 * 
 * This script derives permissions from backend entity metadata and writes
 * to config/permissions.json, which is then synced to frontend by sync-config.js.
 * 
 * Flow:
 *   backend/config/models/*-metadata.js
 *     → permissions-deriver.js
 *       → config/permissions.json (this script)
 *         → frontend/assets/config/permissions.json (sync-config.js)
 * 
 * Run this when:
 * - Adding a new entity
 * - Changing entity permissions (fieldAccess, entityPermissions, rlsPolicy)
 * - Before releases to ensure permissions are in sync
 * 
 * Usage:
 *   node scripts/sync-permissions.js
 */

const fs = require('fs');
const path = require('path');

// Use dynamic require to clear cache
const derivePath = path.resolve(__dirname, '../backend/config/permissions-deriver.js');

// Clear require cache to get fresh derivation
delete require.cache[require.resolve(derivePath)];
// Also clear models cache since deriver requires it
const modelsPath = path.resolve(__dirname, '../backend/config/models/index.js');
if (require.cache[require.resolve(modelsPath)]) {
  delete require.cache[require.resolve(modelsPath)];
}

const deriver = require(derivePath);

const CONFIG_FILE = path.join(__dirname, '..', 'config', 'permissions.json');

function syncPermissions() {
  console.log('🔄 Deriving permissions from entity metadata...\n');

  try {
    // Force fresh derivation
    deriver.clearCache();
    const derived = deriver.derivePermissions(true);

    // Update metadata
    derived.title = 'TrossApp Permission Configuration';
    derived.description = 
      'Single source of truth for role-based access control (RBAC). ' +
      'AUTO-GENERATED from entity metadata - run sync-permissions.js to regenerate.';
    derived.lastModified = new Date().toISOString().split('T')[0];
    
    // Sort resources for consistent output
    const sortedResources = {};
    Object.keys(derived.resources).sort().forEach(key => {
      sortedResources[key] = derived.resources[key];
    });
    derived.resources = sortedResources;

    // Write to config file
    const content = JSON.stringify(derived, null, 2) + '\n';
    fs.writeFileSync(CONFIG_FILE, content, 'utf8');

    const resourceCount = Object.keys(derived.resources).length;
    const roleCount = Object.keys(derived.roles).length;

    console.log(`✅ Wrote permissions.json`);
    console.log(`   📊 ${roleCount} roles, ${resourceCount} resources`);
    console.log(`   📁 ${CONFIG_FILE}`);
    console.log(`\nResources:`);
    
    Object.keys(sortedResources).forEach(resource => {
      const perms = sortedResources[resource].permissions;
      const ops = ['create', 'read', 'update', 'delete']
        .map(op => {
          const p = perms[op];
          if (!p || p.disabled) return `${op}:❌`;
          return `${op}:${p.minimumRole}`;
        })
        .join(' ');
      console.log(`   • ${resource}: ${ops}`);
    });

    console.log('\n💡 Run "node scripts/sync-config.js" to sync to frontend');
    return true;
  } catch (error) {
    console.error('❌ Error deriving permissions:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = syncPermissions();
  process.exit(success ? 0 : 1);
}

module.exports = { syncPermissions };
