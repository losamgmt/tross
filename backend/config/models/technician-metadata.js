/**
 * Technician Model Metadata
 */

module.exports = {
  tableName: 'technicians',
  primaryKey: 'id',

  searchableFields: ['license_number'],

  filterableFields: [
    'id',
    'license_number',
    'is_active',
    'status',
    'created_at',
    'updated_at',
  ],

  sortableFields: [
    'id',
    'license_number',
    'is_active',
    'status',
    'hourly_rate',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fields: {
    id: { type: 'integer', readonly: true },
    license_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
    status: {
      type: 'enum',
      values: ['available', 'on_job', 'off_duty', 'suspended'],
      default: 'available',
    },
    certifications: { type: 'jsonb' },
    skills: { type: 'jsonb' },
    hourly_rate: { type: 'decimal' },
  },
};
