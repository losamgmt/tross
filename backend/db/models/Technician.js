// Technician model with Entity Contract v2.0 compliance
const db = require('../connection');
const { logger } = require('../../config/logger');
const { toSafeInteger } = require('../../validators/type-coercion');
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
      throw new Error('Failed to find technician');
    }
  }

  static async findByLicenseNumber(licenseNumber) {
    if (!licenseNumber) {
      throw new Error('License number is required');
    }
    try {
      const result = await db.query(this._buildQuery('WHERE t.license_number = $1'), [licenseNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding technician by license', { error: error.message, licenseNumber });
      throw new Error('Failed to find technician');
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
      logger.error('Error finding all technicians', { error: error.message, options });
      throw new Error('Failed to retrieve technicians');
    }
  }

  static async create(data) {
    if (!data.license_number) {
      throw new Error('License number is required');
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
      throw new Error('Failed to create technician');
    }
  }

  static async update(id, data) {
    const safeId = toSafeInteger(id, 'Technician ID');
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    try {
      const allowedFields = ['license_number', 'certifications', 'skills', 'hourly_rate', 'status'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key)) {
          if (['certifications', 'skills'].includes(key) && value) {
            updates.push(`${key} = $${paramIndex}::jsonb`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(safeId);
      const query = `UPDATE technicians SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Technician not found');
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
      throw new Error('Failed to update technician');
    }
  }

  static async deactivate(id) {
    const safeId = toSafeInteger(id, 'Technician ID');
    try {
      const result = await db.query('UPDATE technicians SET is_active = false WHERE id = $1 RETURNING *', [safeId]);
      if (result.rows.length === 0) {
        throw new Error('Technician not found');
      }
      logger.info('Technician deactivated', { technicianId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deactivating technician', { error: error.message, technicianId: safeId });
      throw new Error('Failed to deactivate technician');
    }
  }

  static async reactivate(id) {
    const safeId = toSafeInteger(id, 'Technician ID');
    try {
      const result = await db.query('UPDATE technicians SET is_active = true WHERE id = $1 RETURNING *', [safeId]);
      if (result.rows.length === 0) {
        throw new Error('Technician not found');
      }
      logger.info('Technician reactivated', { technicianId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error reactivating technician', { error: error.message, technicianId: safeId });
      throw new Error('Failed to reactivate technician');
    }
  }

  static async delete(id) {
    const safeId = toSafeInteger(id, 'Technician ID');
    try {
      const result = await db.query('DELETE FROM technicians WHERE id = $1 RETURNING *', [safeId]);
      if (result.rows.length === 0) {
        throw new Error('Technician not found');
      }
      logger.warn('Technician permanently deleted', { technicianId: safeId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting technician', { error: error.message, technicianId: safeId });
      throw new Error('Failed to delete technician');
    }
  }
}

module.exports = Technician;
