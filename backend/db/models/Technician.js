// Technician model with Entity Contract v2.0 compliance
const db = require('../connection');
const { logger } = require('../../config/logger');
const { MODEL_ERRORS } = require('../../config/constants');
const { toSafeInteger } = require('../../validators/type-coercion');
const { deleteWithAuditCascade } = require('../helpers/delete-helper');
const { buildUpdateClause } = require('../helpers/update-helper');
const PaginationService = require('../../services/pagination-service');
const QueryBuilderService = require('../../services/query-builder-service');
const technicianMetadata = require('../../config/models/technician-metadata');

class Technician {
  /**
   * Build RLS filter clause based on user's policy
   * @private
   * @param {Object} req - Express request with RLS context (rlsPolicy, rlsUserId)
   * @returns {Object} { clause: string, values: array, applied: boolean }
   */
  static _buildRLSFilter(req) {
    // No RLS context = no filtering
    if (!req || !req.rlsPolicy) {
      return { clause: '', values: [], applied: false };
    }

    const { rlsPolicy, rlsUserId } = req;

    // Unknown policy = security failsafe (deny all)
    if (!['all_records', 'own_record_only'].includes(rlsPolicy)) {
      logger.warn('Unknown RLS policy for technicians', { policy: rlsPolicy, userId: rlsUserId });
      return { clause: '1=0', values: [], applied: true };
    }

    // all_records policy = no filtering (technician+ see everything)
    if (rlsPolicy === 'all_records') {
      return { clause: '', values: [], applied: false };
    }

    // own_record_only = filter by technician ID
    // (Although this is uncommon for technicians resource, support it for consistency)
    if (rlsPolicy === 'own_record_only') {
      if (!rlsUserId) {
        logger.error('RLS userId missing for own_record_only policy', { policy: rlsPolicy });
        return { clause: '1=0', values: [], applied: true };
      }
      return { clause: 't.id = $1', values: [rlsUserId], applied: true };
    }

    // Fallback (shouldn't reach here)
    return { clause: '', values: [], applied: false };
  }

  /**
   * Apply RLS filter to existing WHERE clause
   * @private
   * @param {Object} req - Express request with RLS context
   * @param {string} existingWhere - Existing WHERE clause (may be empty)
   * @param {array} existingValues - Existing query parameter values
   * @returns {Object} { whereClause: string, values: array, rlsApplied: boolean }
   */
  static _applyRLSFilter(req, existingWhere = '', existingValues = []) {
    const rlsFilter = this._buildRLSFilter(req);

    // No RLS filtering needed - but still need to add WHERE keyword if existingWhere has conditions
    if (!rlsFilter.clause) {
      let finalWhere = existingWhere;
      if (existingWhere && existingWhere.trim() !== '') {
        const hasWhereKeyword = existingWhere.trim().toUpperCase().startsWith('WHERE');
        if (!hasWhereKeyword) {
          finalWhere = `WHERE ${existingWhere}`;
        }
      }

      return {
        whereClause: finalWhere,
        values: existingValues,
        rlsApplied: rlsFilter.applied,
      };
    }

    // Adjust RLS parameter placeholders to account for existing values
    const offset = existingValues.length;
    let adjustedRLSClause = rlsFilter.clause;

    // Replace $1, $2, etc. with $offset+1, $offset+2, etc.
    if (offset > 0 && rlsFilter.values.length > 0) {
      adjustedRLSClause = rlsFilter.clause.replace(/\$(\d+)/g, (match, num) => {
        return `$${parseInt(num) + offset}`;
      });
    }

    // Combine WHERE clauses
    let combinedWhere;
    if (!existingWhere || existingWhere.trim() === '') {
      combinedWhere = `WHERE ${adjustedRLSClause}`;
    } else {
      // existingWhere might be "WHERE ..." or just the condition
      const hasWhereKeyword = existingWhere.trim().toUpperCase().startsWith('WHERE');
      if (hasWhereKeyword) {
        combinedWhere = `${existingWhere} AND ${adjustedRLSClause}`;
      } else {
        combinedWhere = `WHERE ${existingWhere} AND ${adjustedRLSClause}`;
      }
    }

    return {
      whereClause: combinedWhere,
      values: [...existingValues, ...rlsFilter.values],
      rlsApplied: rlsFilter.applied,
    };
  }

  static _buildQuery(whereClause = '', orderBy = '') {
    return `SELECT t.* FROM technicians t ${whereClause} ${orderBy}`.trim();
  }

  static async findById(id, req = null) {
    const safeId = toSafeInteger(id, 'Technician ID');
    try {
      // Apply RLS filter
      const { whereClause, values } = this._applyRLSFilter(
        req,
        't.id = $1',
        [safeId],
      );

      const result = await db.query(this._buildQuery(whereClause), values);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding technician by ID', { error: error.message, technicianId: safeId });
      throw new Error(MODEL_ERRORS.TECHNICIAN.RETRIEVAL_FAILED);
    }
  }

  static async findByLicenseNumber(licenseNumber) {
    if (!licenseNumber) {
      throw new Error(MODEL_ERRORS.TECHNICIAN.LICENSE_NUMBER_REQUIRED);
    }
    try {
      const result = await db.query(this._buildQuery('WHERE t.license_number = $1'), [licenseNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding technician by license', { error: error.message });
      throw new Error(MODEL_ERRORS.TECHNICIAN.RETRIEVAL_FAILED);
    }
  }

  static async findAll(options = {}) {
    try {
      const { page, limit, offset } = PaginationService.validateParams(options);
      const includeInactive = options.includeInactive || false;

      const { searchableFields, filterableFields, sortableFields, defaultSort } = technicianMetadata;

      const search = QueryBuilderService.buildSearchClause(options.search, searchableFields);
      const filterOptions = { ...options.filters };
      if (!includeInactive) {
        filterOptions.is_active = true;
      }
      const filters = QueryBuilderService.buildFilterClause(
        filterOptions,
        filterableFields,
        search.paramOffset || 0,
      );
      const sort = QueryBuilderService.buildSortClause(options.sortBy, options.sortOrder, sortableFields, defaultSort);

      // Build base WHERE clause from search and filters
      const whereClauses = [search.clause, filters.clause].filter(Boolean);
      const baseWhere = whereClauses.length ? whereClauses.join(' AND ') : '';
      const baseValues = [
        ...(search.params || []),
        ...(filters.params || []),
      ];

      // Apply RLS filtering
      const { whereClause, values: rlsValues, rlsApplied } = this._applyRLSFilter(
        options.req,
        baseWhere,
        baseValues,
      );

      const countQuery = `SELECT COUNT(*) FROM technicians t ${whereClause}`;
      const dataQuery = this._buildQuery(whereClause, `ORDER BY ${sort} LIMIT $${rlsValues.length + 1} OFFSET $${rlsValues.length + 2}`);

      const params = [...rlsValues, limit, offset];
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, rlsValues),
        db.query(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const pagination = PaginationService.generateMetadata(page, limit, total);

      return {
        data: dataResult.rows,
        pagination,
        appliedFilters: {
          search: options.search || null,
          filters: filterOptions,
          sortBy: options.sortBy || defaultSort.field,
          sortOrder: options.sortOrder || defaultSort.order,
        },
        rlsApplied,
      };
    } catch (error) {
      logger.error('Error retrieving technicians', { error: error.message, filters });
      throw new Error(MODEL_ERRORS.TECHNICIAN.RETRIEVAL_ALL_FAILED);
    }
  }

  static async create(data) {
    if (!data.license_number) {
      throw new Error(MODEL_ERRORS.TECHNICIAN.LICENSE_NUMBER_REQUIRED);
    }
    try {
      const query = `
        INSERT INTO technicians (license_number, certifications, skills, hourly_rate, status)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `;
      const values = [
        data.license_number,
        data.certifications ? JSON.stringify(data.certifications) : null,
        data.skills ? JSON.stringify(data.skills) : null,
        data.hourly_rate || null,
        data.status || 'available',
      ];
      const result = await db.query(query, values);
      logger.info('Technician created', { technicianId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('Technician with this license number already exists');
        duplicateError.code = '23505'; // Preserve error code for route handler
        throw duplicateError;
      }
      if (error.code === '23514') {
        const constraintError = new Error('Invalid field value');
        constraintError.code = '23514';
        throw constraintError;
      }
      logger.error('Error creating technician', { error: error.message, data });
      throw new Error(MODEL_ERRORS.TECHNICIAN.CREATION_FAILED);
    }
  }

  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Technician ID');
    if (Object.keys(data).length === 0) {
      throw new Error(MODEL_ERRORS.TECHNICIAN.NO_FIELDS_TO_UPDATE);
    }

    try {
      // Build SET clause using helper
      const allowedFields = ['license_number', 'certifications', 'skills', 'hourly_rate', 'status'];

      const { updates, values, hasUpdates } = buildUpdateClause(data, allowedFields, {
        jsonbFields: ['certifications', 'skills'],
      });

      if (!hasUpdates) {
        throw new Error(MODEL_ERRORS.TECHNICIAN.NO_VALID_FIELDS);
      }

      values.push(safeId);
      const query = `UPDATE technicians SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(MODEL_ERRORS.TECHNICIAN.NOT_FOUND);
      }
      logger.info('Technician updated', { technicianId: safeId });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('Technician with this license number already exists');
        duplicateError.code = '23505';
        throw duplicateError;
      }
      if (error.code === '23514') {
        const constraintError = new Error('Invalid field value');
        constraintError.code = '23514';
        throw constraintError;
      }
      logger.error('Error updating technician', { error: error.message, technicianId: safeId });
      throw new Error(MODEL_ERRORS.TECHNICIAN.UPDATE_FAILED);
    }
  }

  static async delete(id) {
    const safeId = toSafeInteger(id, 'Technician ID');

    return deleteWithAuditCascade({
      tableName: 'technicians',
      id: safeId,
    });
  }
}

module.exports = Technician;
