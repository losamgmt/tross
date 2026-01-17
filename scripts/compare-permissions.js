#!/usr/bin/env node
/**
 * Compare derived permissions vs original permissions.json
 * Finds all mismatches that need entityPermissions overrides
 */

const deriver = require('../backend/config/permissions-deriver');
const originalPerms = require('../config/permissions.json');

const perms = deriver.derivePermissions(true);

console.log('=== PERMISSION COMPARISON ===\n');

let mismatchCount = 0;

for (const [resource, derived] of Object.entries(perms.resources)) {
  const original = originalPerms.resources[resource];
  if (!original) {
    console.log(`${resource}: SYNTHETIC (no original)`);
    continue;
  }
  
  const ops = ['create', 'read', 'update', 'delete'];
  const mismatches = ops.filter(op => 
    derived.permissions[op]?.minimumRole !== original.permissions[op]?.minimumRole
  );
  
  if (mismatches.length > 0) {
    console.log(`\n❌ ${resource}:`);
    mismatches.forEach(op => {
      console.log(`   ${op}: derived=${derived.permissions[op]?.minimumRole} vs original=${original.permissions[op]?.minimumRole}`);
      mismatchCount++;
    });
  } else {
    console.log(`✅ ${resource}: matches`);
  }
}

console.log(`\n=== SUMMARY: ${mismatchCount} mismatches found ===`);
