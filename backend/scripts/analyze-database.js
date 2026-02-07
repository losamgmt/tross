#!/usr/bin/env node
/**
 * Database Analysis Tool
 * KISS: Simple script to analyze indexes and query performance
 *
 * Usage: node scripts/analyze-database.js
 */

const db = require("../db/connection");
const { logger } = require("../config/logger");

/**
 * Analyze table indexes and suggest optimizations
 */
async function analyzeIndexes() {
  console.log("\n📊 Analyzing Database Indexes...\n");

  try {
    // Get all user tables (exclude system tables)
    const tablesQuery = `
      SELECT 
        schemaname, 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;

    const tables = await db.query(tablesQuery);

    for (const table of tables.rows) {
      console.log(`\n📋 Table: ${table.tablename} (${table.total_size})`);

      // Get indexes for this table
      const indexQuery = `
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique,
          ix.indisprimary AS is_primary,
          pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
          s.idx_scan AS index_scans,
          s.idx_tup_read AS tuples_read,
          s.idx_tup_fetch AS tuples_fetched
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.oid
        WHERE t.relname = $1
        ORDER BY index_name, a.attnum;
      `;

      const indexes = await db.query(indexQuery, [table.tablename]);

      if (indexes.rows.length > 0) {
        const indexMap = {};
        indexes.rows.forEach((idx) => {
          if (!indexMap[idx.index_name]) {
            indexMap[idx.index_name] = {
              columns: [],
              ...idx,
            };
          }
          indexMap[idx.index_name].columns.push(idx.column_name);
        });

        Object.values(indexMap).forEach((idx) => {
          const type = idx.is_primary
            ? "🔑 PRIMARY"
            : idx.is_unique
              ? "🔒 UNIQUE"
              : "📇 INDEX";
          const usage =
            idx.index_scans > 0 ? `✅ ${idx.index_scans} scans` : "⚠️  UNUSED";
          console.log(
            `  ${type} ${idx.index_name}: ${idx.columns.join(", ")} (${idx.index_size}) - ${usage}`,
          );
        });
      } else {
        console.log("  ⚠️  No indexes found (consider adding!)");
      }

      // Check for missing indexes on foreign keys
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1;
      `;

      const fks = await db.query(fkQuery, [table.tablename]);

      if (fks.rows.length > 0) {
        console.log("\n  🔗 Foreign Keys:");
        fks.rows.forEach((fk) => {
          console.log(`    ${fk.column_name} → ${fk.foreign_table_name}`);
        });
      }
    }

    console.log("\n\n📈 Index Usage Statistics:\n");

    // Find unused indexes
    const unusedIndexesQuery = `
      SELECT
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;

    const unusedIndexes = await db.query(unusedIndexesQuery);

    if (unusedIndexes.rows.length > 0) {
      console.log("⚠️  Unused Indexes (consider removing if not needed):");
      unusedIndexes.rows.forEach((idx) => {
        console.log(
          `  ${idx.tablename}.${idx.indexname} (${idx.index_size}) - ${idx.idx_scan} scans`,
        );
      });
    } else {
      console.log("✅ All indexes are being used!");
    }

    console.log("\n\n💾 Database Size Summary:\n");

    const sizeQuery = `
      SELECT
        pg_size_pretty(pg_database_size(current_database())) AS database_size,
        pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) AS tables_size,
        pg_size_pretty(SUM(pg_indexes_size(schemaname||'.'||tablename))) AS indexes_size
      FROM pg_tables
      WHERE schemaname = 'public';
    `;

    const sizes = await db.query(sizeQuery);
    const size = sizes.rows[0];

    console.log(`  Total Database: ${size.database_size}`);
    console.log(`  Tables: ${size.tables_size}`);
    console.log(`  Indexes: ${size.indexes_size}`);

    console.log("\n✅ Analysis complete!\n");
  } catch (error) {
    logger.error("Database analysis failed:", error);
    throw error;
  }
}

/**
 * Check for missing indexes on commonly queried columns
 */
async function suggestIndexes() {
  console.log("\n💡 Index Suggestions:\n");

  try {
    // Check for tables without indexes on foreign key columns
    const missingFKIndexesQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = tc.table_name
            AND indexdef LIKE '%' || kcu.column_name || '%'
        );
    `;

    const missingIndexes = await db.query(missingFKIndexesQuery);

    if (missingIndexes.rows.length > 0) {
      console.log("⚠️  Foreign keys without indexes (may slow down JOINs):");
      missingIndexes.rows.forEach((mi) => {
        console.log(
          `  CREATE INDEX idx_${mi.table_name}_${mi.column_name} ON ${mi.table_name}(${mi.column_name});`,
        );
      });
    } else {
      console.log("✅ All foreign keys have indexes!");
    }

    console.log("\n");
  } catch (error) {
    logger.error("Index suggestion failed:", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🔍 Tross Database Optimization Analysis");
  console.log("==========================================");

  try {
    await db.testConnection();
    await analyzeIndexes();
    await suggestIndexes();
  } catch (error) {
    console.error("\n❌ Analysis failed:", error.message);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeIndexes, suggestIndexes };
