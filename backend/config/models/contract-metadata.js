/**
 * Contract Model Metadata
 */

module.exports = {
  tableName: 'contracts',
  primaryKey: 'id',

  searchableFields: ['contract_number'],

  filterableFields: [
    'id',
    'contract_number',
    'customer_id',
    'is_active',
    'status',
    'start_date',
    'end_date',
    'billing_cycle',
    'created_at',
    'updated_at',
  ],

  sortableFields: [
    'id',
    'contract_number',
    'status',
    'value',
    'start_date',
    'end_date',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fields: {
    id: { type: 'integer', readonly: true },
    contract_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
    status: {
      type: 'enum',
      values: ['draft', 'active', 'expired', 'cancelled'],
      default: 'draft',
    },
    customer_id: { type: 'integer', required: true },
    start_date: { type: 'date', required: true },
    end_date: { type: 'date' },
    terms: { type: 'text' },
    value: { type: 'decimal' },
    billing_cycle: {
      type: 'enum',
      values: ['monthly', 'quarterly', 'annually', 'one_time'],
    },
  },
};
