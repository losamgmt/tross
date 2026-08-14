#!/usr/bin/env node
/**
 * Unified Deployment Database Tool (parameterized)
 *
 * One entry point, two interchangeable strategies. Used by the Railway deploy
 * (see railway.json startCommand) and runnable locally via `npm run db:deploy`.
 *
 *   rebuild (default) : Apply schema.sql (DROPs + recreates ALL tables) then seed.
 *                       Clean-slate reset — DESTRUCTIVE. The pre-launch default.
 *   migrate           : Apply pending forward migrations from migrations/ on top of
 *                       the existing schema — idempotent, transactional, DATA-PRESERVING.
 *                       A fresh/empty database is bootstrapped to the current schema
 *                       (migrations baselined) so the same command works either way.
 *
 * Strategy (first match wins):  --strategy=<rebuild|migrate>  |  DEPLOY_DB_STRATEGY env  |  rebuild
 * Seed for rebuild:             --seed=<demo|essential>       |  DEPLOY_DB_SEED env       |  demo
 *
 * Go-live: switch the deploy to `migrate` by setting DEPLOY_DB_STRATEGY=migrate (no code
 * change) and regenerate a preserve-mode schema with `npm run compose:schema -- --no-drop`.
 *
 * Exit codes:
 *   0 - Success
 *   1 - Failure (deploy should abort)
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables FIRST (before any other requires)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Same connection (SSL, pooling, env detection) as the rest of the app.
const db = require('../db/connection');
const { initDatabase } = require('./init-db-strict');
const { runMigrations, baselineMigrations } = require('./run-migrations');

const SCHEMA_FILE = path.join(__dirname, '..', 'schema.sql');
const SEEDS = Object.freeze({
  demo: path.join(__dirname, '..', 'seeds', 'demo-data.sql'),
  essential: path.join(__dirname, '..', 'seeds', 'essential-data.sql'),
});

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function resolveStrategy() {
  const raw = (
    getArg('strategy') ||
    process.env.DEPLOY_DB_STRATEGY ||
    'rebuild'
  ).toLowerCase();
  if (raw !== 'rebuild' && raw !== 'migrate') {
    throw new Error(`Invalid strategy "${raw}" (expected: rebuild | migrate)`);
  }
  return raw;
}

function resolveSeedFile() {
  const raw = (getArg('seed') || process.env.DEPLOY_DB_SEED || 'demo').toLowerCase();
  if (!SEEDS[raw]) {
    throw new Error(`Invalid seed "${raw}" (expected: demo | essential)`);
  }
  return SEEDS[raw];
}

async function coreTablesExist() {
  const result = await db.query("SELECT to_regclass('public.roles') AS t");
  return result.rows[0].t !== null;
}

/**
 * Rebuild strategy: delegate to the strict initializer (schema.sql + seed + verify).
 */
async function deployRebuild() {
  const seedFile = resolveSeedFile();
  console.log(`🧭 Strategy: rebuild (clean reset) + seed ${path.basename(seedFile)}`);
  await initDatabase({ seedFile });
}

/**
 * Migrate strategy: data-preserving forward migrations. A fresh database is first
 * built to the current schema (which already embeds the essential seed) and its
 * migrations are baselined, so no delta re-runs against an already-current schema.
 */
async function deployMigrate() {
  console.log('🧭 Strategy: migrate (forward migrations, data-preserving)');

  const fresh = !(await coreTablesExist());
  if (fresh) {
    console.log('🌱 Fresh database detected — applying base schema and baselining migrations...');
    const schemaSQL = await fs.readFile(SCHEMA_FILE, 'utf8');
    await db.query(schemaSQL);
    await baselineMigrations();
    console.log('✅ Fresh database initialized at current schema (migrations baselined)');
    return;
  }

  const result = await runMigrations({ dryRun: false });
  console.log(`✅ Migrate complete — ${result.applied} applied, ${result.pending} pending`);
}

async function main() {
  const strategy = resolveStrategy();

  console.log('🚀 Tross deploy-db');
  console.log('═'.repeat(50));

  const started = Date.now();
  if (strategy === 'rebuild') {
    await deployRebuild();
  } else {
    await deployMigrate();
  }

  console.log('═'.repeat(50));
  console.log(`✅ deploy-db (${strategy}) finished in ${Date.now() - started}ms`);
}

main()
  .then(() => db.end())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('═'.repeat(50));
    console.error(`❌ deploy-db FAILED: ${error.message}`);
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    try {
      await db.end();
    } catch {
      // Ignore cleanup errors
    }
    process.exit(1);
  });
