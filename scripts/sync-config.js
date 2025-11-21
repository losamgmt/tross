#!/usr/bin/env node
/**
 * Configuration Sync Script
 * 
 * SINGLE SOURCE OF TRUTH: config/*.json files at project root
 * 
 * This script syncs root config files to frontend/assets/config/
 * ensuring parity between backend and frontend permissions.
 * 
 * Run before:
 * - flutter run
 * - flutter build
 * - flutter test (if config changed)
 * 
 * Usage:
 *   node scripts/sync-config.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_CONFIG = path.join(__dirname, '..', 'config');
const FRONTEND_ASSETS = path.join(__dirname, '..', 'frontend', 'assets', 'config');

const CONFIG_FILES = [
  'permissions.json',
  'validation-rules.json'
];

function syncConfig() {
  console.log('🔄 Syncing configuration files...\n');

  // Ensure frontend assets/config directory exists
  if (!fs.existsSync(FRONTEND_ASSETS)) {
    fs.mkdirSync(FRONTEND_ASSETS, { recursive: true });
    console.log(`✅ Created directory: ${FRONTEND_ASSETS}\n`);
  }

  let syncCount = 0;
  let errorCount = 0;

  for (const file of CONFIG_FILES) {
    const source = path.join(ROOT_CONFIG, file);
    const dest = path.join(FRONTEND_ASSETS, file);

    try {
      // Check if source exists
      if (!fs.existsSync(source)) {
        console.error(`❌ Source not found: ${source}`);
        errorCount++;
        continue;
      }

      // Read source
      const content = fs.readFileSync(source, 'utf8');
      
      // Check if dest needs update
      let needsUpdate = true;
      if (fs.existsSync(dest)) {
        const existingContent = fs.readFileSync(dest, 'utf8');
        needsUpdate = content !== existingContent;
      }

      if (needsUpdate) {
        fs.writeFileSync(dest, content, 'utf8');
        console.log(`✅ Synced: ${file}`);
        syncCount++;
      } else {
        console.log(`⏭️  Skipped: ${file} (already up-to-date)`);
      }
    } catch (error) {
      console.error(`❌ Error syncing ${file}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${syncCount} synced, ${errorCount} errors`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

syncConfig();
