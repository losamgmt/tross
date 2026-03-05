#!/usr/bin/env node
/**
 * Entity Verification CLI
 *
 * Usage:
 *   node scripts/verify-entity.js customer
 *   node scripts/verify-entity.js --all
 *   npm run verify:entity -- customer
 */

const {
  verifyEntity,
  verifyAll,
  formatResult,
  formatSummary,
} = require('./lib/entity-verifier');

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  const entities = args.filter((a) => !a.startsWith('--'));

  if (showAll) {
    const results = verifyAll();
    results.forEach((r) => console.log(formatResult(r)));
    console.log(formatSummary(results));
    process.exit(results.every((r) => r.failed === 0) ? 0 : 1);
  }

  if (entities.length === 0) {
    console.log(`
Usage:
  node scripts/verify-entity.js <entity>   Verify single entity
  node scripts/verify-entity.js --all      Verify all entities

Examples:
  node scripts/verify-entity.js customer
  node scripts/verify-entity.js vendor
`);
    process.exit(1);
  }

  let allPassed = true;
  for (const name of entities) {
    const result = verifyEntity(name);
    console.log(formatResult(result));
    if (result.failed > 0) allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main();
