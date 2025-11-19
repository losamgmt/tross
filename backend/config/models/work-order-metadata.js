/**
 * Work Order Model Metadata
 */

module.exports = {
  tableName: 'work_orders',
  primaryKey: 'id',

  searchableFields: ['title', 'description'],

  filterableFields: [
    'id',
    'title',
    'customer_id',
    'assigned_technician_id',
    'is_active',
    'status',
    'priority',
    'scheduled_start',
    'scheduled_end',
    'created_at',
    'updated_at',
  ],

  sortableFields: [
    'id',
    'title',
    'priority',
    'status',
    'scheduled_start',
    'scheduled_end',
    'completed_at',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fields: {
    id: { type: 'integer', readonly: true },
    title: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
    status: {
      type: 'enum',
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    description: { type: 'text' },
    priority: {
      type: 'enum',
      values: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    customer_id: { type: 'integer', required: true },
    assigned_technician_id: { type: 'integer' },
    scheduled_start: { type: 'timestamp' },
    scheduled_end: { type: 'timestamp' },
    completed_at: { type: 'timestamp' },
  },
};
