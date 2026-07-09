/**
 * Field Derivation
 *
 * SRP: Apply metadata-driven field derivations for an entity's create/update payload.
 *
 * A field declares derivation with:
 *   derived: { from: '<sourceField>', via: '<method>', params?: {...} }
 *
 * Each `via` names a method in DERIVATION_METHODS. The shared engine (applyDerived) owns
 * the common semantics (skip-if-target-set, skip-if-source-blank, snapshot sources,
 * error isolation); each method only resolves a value from its inputs.
 *
 * This replaces the former field-specific derivers that lived inside GenericEntityService.
 */

const allMetadata = require('../../config/models');
const { logger } = require('../../config/logger');
const db = require('../../db/connection');

const isBlank = (v) => v === undefined || v === null || v === '';

/**
 * Metadata-driven field derivation methods, keyed by `derived.via`.
 *
 * Each method: { async: boolean, apply(context) => value|undefined }
 *   context = { entityName, fieldName, fieldDef, sourceField, sourceValue, sourceFieldDef, params }
 *   Return `undefined` to decline (no assignment).
 */
const DERIVATION_METHODS = Object.freeze({
  /**
   * lookup — project this field's value from the related entity that `from` (a FK) points to.
   * e.g. work_order.property_id via unit_id → SELECT property_id FROM units WHERE id = <unit_id>.
   * Authoritative; async (DB read).
   */
  lookup: Object.freeze({
    async: true,
    async apply({ entityName, fieldName, sourceField, sourceValue, sourceFieldDef }) {
      if (!sourceFieldDef || sourceFieldDef.type !== 'foreignKey') {
        logger.warn('derived via:lookup references non-FK source field', {
          entity: entityName,
          field: fieldName,
          from: sourceField,
        });
        return undefined;
      }

      const sourceEntity = sourceFieldDef.references;
      const sourceMetadata = allMetadata[sourceEntity];
      if (!sourceMetadata) {
        logger.warn('derived via:lookup references unknown entity', {
          entity: entityName,
          field: fieldName,
          sourceEntity,
        });
        return undefined;
      }

      // The derived column name in the source is this field's own name.
      // e.g. property_id via unit_id → SELECT property_id FROM units WHERE id = <unit_id>
      const sourceRecord = await db.oneOrNone(
        `SELECT ${fieldName} FROM ${sourceMetadata.tableName} WHERE id = $1`,
        [sourceValue],
      );
      return sourceRecord ? sourceRecord[fieldName] : undefined;
    },
  }),

  /**
   * timeOffset — offset a source datetime by a fixed duration (params.hours, which may be
   * negative). Same-record, synchronous. e.g. work_order.scheduled_end from scheduled_start
   * with params:{ hours: 1 }. Returns a UTC ISO-8601 string.
   */
  timeOffset: Object.freeze({
    async: false,
    apply({ sourceValue, params }) {
      const hours = params && params.hours;
      if (typeof hours !== 'number') {
        return undefined;
      }
      const base = new Date(sourceValue);
      if (Number.isNaN(base.getTime())) {
        return undefined;
      }
      return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
    },
  }),
});

/**
 * Apply metadata-driven field derivations (unified engine).
 *
 * Reads `metadata.fields[].derived = { from, via, params }` and, for each target field
 * that is still blank whose source is present, computes the value via the named method.
 *
 * Shared semantics for every method:
 * - Single pass; sources are read from an ORIGINAL snapshot so mutual/paired rules cannot
 *   cascade within one pass and field order never matters.
 * - Skip if the target already has an explicit value (user input wins).
 * - Skip if the source value is blank.
 * - A method failure is logged and swallowed — derivation must never block the operation.
 *
 * @param {string} entityName - Entity being created/updated
 * @param {Object} data - Data object (mutated in place with derived values)
 * @param {Object} metadata - Entity metadata
 * @returns {Promise<Object>} Data object with derived values applied
 */
async function applyDerived(entityName, data, metadata) {
  const fields = metadata.fields || {};
  const snapshot = { ...data };

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const derived = fieldDef.derived;
    if (!derived) {
      continue;
    }

    // Explicit value wins
    if (!isBlank(data[fieldName])) {
      continue;
    }

    const method = DERIVATION_METHODS[derived.via];
    if (!method) {
      logger.warn('Unknown field derivation method', {
        entity: entityName,
        field: fieldName,
        via: derived.via,
      });
      continue;
    }

    const sourceValue = snapshot[derived.from];
    if (isBlank(sourceValue)) {
      continue;
    }

    const context = {
      entityName,
      fieldName,
      fieldDef,
      sourceField: derived.from,
      sourceValue,
      sourceFieldDef: fields[derived.from],
      params: derived.params,
    };

    try {
      const value = method.async
        ? await method.apply(context)
        : method.apply(context);
      if (!isBlank(value)) {
        data[fieldName] = value;
        logger.debug('Applied field derivation', {
          entity: entityName,
          field: fieldName,
          via: derived.via,
          from: derived.from,
        });
      }
    } catch (error) {
      logger.warn('Field derivation failed', {
        entity: entityName,
        field: fieldName,
        via: derived.via,
        error: error.message,
      });
      // Don't throw — derivation failure shouldn't block the operation
    }
  }

  return data;
}

module.exports = { applyDerived, DERIVATION_METHODS };
