/**
 * Quick script to check rlsResource coverage across all entities
 */
const allMetadata = require("../config/models");

const missing = [];
const has = [];

for (const [name, meta] of Object.entries(allMetadata)) {
  if (meta.rlsResource === undefined || meta.rlsResource === null) {
    missing.push(name);
  } else {
    has.push({
      name,
      rls: meta.rlsResource,
      useGenericRouter: meta.routeConfig?.useGenericRouter,
    });
  }
}

console.log("=".repeat(60));
console.log(`ENTITIES WITH rlsResource (${has.length}):`);
console.log("=".repeat(60));
has.forEach((h) => {
  const router = h.useGenericRouter ? "✓ generic" : "✗ specialized";
  console.log(`  ${h.name.padEnd(20)} → ${h.rls.padEnd(15)} [${router}]`);
});

console.log("");
console.log("=".repeat(60));
console.log(`ENTITIES MISSING rlsResource (${missing.length}):`);
console.log("=".repeat(60));
missing.forEach((m) => console.log(`  ⚠️  ${m}`));

if (missing.length > 0) {
  console.log("\n⚠️  These entities will NOT get generic routers registered!");
}
