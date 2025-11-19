/**
 * Inventory Model Metadata
 */

module.exports = {
  tableName: 'inventory',
  primaryKey: 'id',

  searchableFields: ['name', 'sku', 'description'],

  filterableFields: [
    'id',
    'name',
    'sku',
    'is_active',
    'status',
    'quantity',
    'reorder_level',
    'location',
    'supplier',
    'created_at',
    'updated_at',
  ],

  sortableFields: [
    'id',
    'name',
    'sku',
    'status',
    'quantity',
    'unit_cost',
    'created_at',
    'updated_at',
  ],

  defaultSort: {
    field: 'created_at',
    order: 'DESC',
  },

  fields: {
    id: { type: 'integer', readonly: true },
    name: { type: 'string', required: true, maxLength: 255 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },
    status: {
      type: 'enum',
      values: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
      default: 'in_stock',
    },
    sku: { type: 'string', required: true, maxLength: 100 },
    description: { type: 'text' },
    quantity: { type: 'integer', default: 0 },
    reorder_level: { type: 'integer', default: 10 },
    unit_cost: { type: 'decimal' },
    location: { type: 'string', maxLength: 255 },
    supplier: { type: 'string', maxLength: 255 },
  },
};
