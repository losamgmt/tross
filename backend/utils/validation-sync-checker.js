/**
 * Validation Sync Checker
 *
 * Ensures validation-rules.json enum definitions stay synchronized with
 * PostgreSQL CHECK constraints in the database schema.
 *
 * This prevents drift between application-layer validation (Joi) and
 * database-layer validation (PostgreSQL CHECK constraints).
 */

const { logger } = require('../config/logger');
const { loadValidationRules } = require('./validation-loader');

/**
 * Query PostgreSQL CHECK constraints to extract enum values
 * @param {pg.Pool} pool - Database connection pool
 * @returns {Promise<Object>} Map of table.column -> enum values
 */
async function getDbCheckConstraints(pool) {
  const query = `
    SELECT 
      n.nspname AS schema_name,
      t.relname AS table_name,
      c.conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_definition,
      a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'c'  -- CHECK constraints
      AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) LIKE '%ANY%'
    ORDER BY t.relname, a.attname;
  `;

  const result = await pool.query(query);
  const constraints = {};

  for (const row of result.rows) {
    const { table_name, column_name, constraint_definition } = row;

    // Extract enum values from constraint definition
    // Format: CHECK ((status)::text = ANY (ARRAY['value1'::character varying, 'value2'::character varying, ...]))
    const match = constraint_definition.match(/ARRAY\[(.*?)\]/);
    if (match) {
      // Extract quoted strings from the array
      const quotedValues = match[1].match(/'([^']+)'/g);
      const enumValues = quotedValues
        ? quotedValues.map(v => v.replace(/'/g, '')).sort()
        : [];

      const key = `${table_name}.${column_name}`;
      constraints[key] = enumValues;
    }
  }

  return constraints;
}

/**
 * Map validation-rules.json field names to database table.column names
 */
const FIELD_TO_DB_MAPPING = {
  roleStatus: 'roles.status',
  userStatus: 'users.status',
  customerStatus: 'customers.status',
  technicianStatus: 'technicians.status',
  workOrderStatus: 'work_orders.status',
  invoiceStatus: 'invoices.status',
  contractStatus: 'contracts.status',
  inventoryStatus: 'inventory.status',
  priority: 'work_orders.priority', // Note: priority only exists on work_orders
};

/**
 * Validate that Joi enum definitions match PostgreSQL CHECK constraints
 * @param {pg.Pool} pool - Database connection pool
 * @throws {Error} If validation rules don't match database constraints
 */
async function validateEnumSync(pool) {
  try {
    // Load validation rules
    const rules = loadValidationRules();

    // Get database CHECK constraints
    const dbConstraints = await getDbCheckConstraints(pool);

    const mismatches = [];

    // Check each mapped field
    for (const [fieldName, dbKey] of Object.entries(FIELD_TO_DB_MAPPING)) {
      const fieldDef = rules.fields[fieldName];

      if (!fieldDef) {
        logger.warn(`[ValidationSync] ⚠️  Field definition not found: ${fieldName}`);
        continue;
      }

      if (!fieldDef.enum) {
        logger.warn(`[ValidationSync] ⚠️  No enum defined for: ${fieldName}`);
        continue;
      }

      const joiEnum = [...fieldDef.enum].sort();
      const dbEnum = dbConstraints[dbKey];

      if (!dbEnum) {
        logger.warn(`[ValidationSync] ⚠️  No database constraint found for: ${dbKey}`);
        continue;
      }

      // Compare arrays
      const joiSet = new Set(joiEnum);
      const dbSet = new Set(dbEnum);

      if (joiEnum.length !== dbEnum.length || !joiEnum.every(v => dbSet.has(v))) {
        mismatches.push({
          field: fieldName,
          database: dbKey,
          joiEnum,
          dbEnum,
          missing_in_joi: dbEnum.filter(v => !joiSet.has(v)),
          missing_in_db: joiEnum.filter(v => !dbSet.has(v)),
        });
      }
    }

    if (mismatches.length > 0) {
      logger.error('[ValidationSync] ❌ Enum mismatches detected:');
      for (const mismatch of mismatches) {
        logger.error(`  ${mismatch.field} (${mismatch.database}):`);
        logger.error(`    Joi:      [${mismatch.joiEnum.join(', ')}]`);
        logger.error(`    Database: [${mismatch.dbEnum.join(', ')}]`);
        if (mismatch.missing_in_joi.length > 0) {
          logger.error(`    Missing in Joi: [${mismatch.missing_in_joi.join(', ')}]`);
        }
        if (mismatch.missing_in_db.length > 0) {
          logger.error(`    Missing in DB: [${mismatch.missing_in_db.join(', ')}]`);
        }
      }

      throw new Error(
        'Validation enum definitions do not match database CHECK constraints. ' +
        `Found ${mismatches.length} mismatch(es). ` +
        'Update validation-rules.json or database schema to sync.',
      );
    }

    logger.info(`[ValidationSync] ✅ Enum validation sync verified - ${Object.keys(FIELD_TO_DB_MAPPING).length} fields checked`);
    return true;
  } catch (error) {
    if (error.message.includes('Validation enum definitions')) {
      throw error; // Re-throw validation errors
    }
    logger.error('[ValidationSync] ❌ Error during validation sync check:', error);
    throw new Error(`Validation sync check failed: ${error.message}`);
  }
}

module.exports = {
  validateEnumSync,
  getDbCheckConstraints,
  FIELD_TO_DB_MAPPING,
};
