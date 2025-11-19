/**
 * Invoice Model Metadata
 */

module.exports = {
  tableName: 'invoices',
  primaryKey: 'id',

  searchableFields: ['invoice_number'],

  filterableFields: [
    'id',
    'invoice_number',
    'customer_id',
    'work_order_id',
    'is_active',
    'status',
    'due_date',
    'paid_at',
    'created_at',
    'updated_at',
  ],

  sortableFields: [
    'id',
    'invoice_number',
    'status',
    'amount',
    'total',
    'due_date',
    'paid_at',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fields: {
    id: { type: 'integer', readonly: true },
    invoice_number: { type: 'string', required: true, maxLength: 100 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
    status: {
      type: 'enum',
      values: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    work_order_id: { type: 'integer' },
    customer_id: { type: 'integer', required: true },
    amount: { type: 'decimal', required: true },
    tax: { type: 'decimal', default: 0 },
    total: { type: 'decimal', required: true },
    due_date: { type: 'date' },
    paid_at: { type: 'timestamp' },
  },
};
