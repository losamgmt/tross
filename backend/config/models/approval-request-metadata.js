/**
 * Approval Request Model Metadata
 *
 * Category: COMPUTED (auto-generated request_number identity)
 *
 * SRP: ONLY defines Approval Request table structure and query capabilities
 * Used by QueryBuilderService to generate dynamic queries
 * Used by GenericEntityService for CRUD operations
 *
 * SINGLE SOURCE OF TRUTH for Approval Request model query and CRUD capabilities
 *
 * Generic polymorphic approval system for any entity/field transition.
 * - Recommendations: customer approves to convert to quote
 * - Quotes: customer accepts/rejects
 * - Purchase Orders: manager approves before ordering
 * - Any future approval workflows
 *
 * Design:
 * - target_entity + target_id: polymorphic reference to subject
 * - target_field: the field being changed (e.g., 'status')
 * - proposed_value: JSON serialized new value
 * - previous_value: JSON serialized old value (for history)
 * - approver_role: minimum role required to approve
 * - approved_by: user who approved/rejected (null = pending)
 *
 * Tracks who created the request (requested_by) and who decided (approved_by).
 */

const { UNIVERSAL_FIELD_ACCESS } = require('../constants');
const { NAME_PATTERNS } = require('../field-types');

/** @type {import('./entity-metadata.types').EntityMetadata} */
module.exports = {
  entityKey: 'approval_request',
  tableName: 'approval_requests',
  primaryKey: 'id',
  icon: 'approval',

  // ============================================================================
  // ENTITY CATEGORY
  // ============================================================================

  namePattern: NAME_PATTERNS.COMPUTED,
  displayField: 'request_number',

  // ============================================================================
  // IDENTITY CONFIGURATION
  // ============================================================================

  identityField: 'request_number',
  identifierPrefix: 'APR',
  identityFieldUnique: true,

  rlsResource: 'approval_requests',

  /**
   * Row-Level Security rules (ADR-011)
   * Customers see requests they created; staff see all.
   */
  rlsRules: [
    {
      id: 'customer-own-requests',
      description: 'Customers see requests they created',
      roles: 'customer',
      operations: ['read'],
      access: { type: 'direct', field: 'requested_by', value: 'userId' },
    },
    {
      id: 'staff-full-access',
      description: 'Dispatcher+ see all approval requests',
      roles: ['dispatcher', 'manager', 'admin'],
      operations: '*',
      access: null,
    },
  ],

  entityPermissions: {
    create: 'customer', // Anyone can request approval
    read: 'customer',
    update: 'customer', // Approve/reject (RLS controls who)
    delete: 'manager',
  },

  navVisibility: 'customer',
  navGroup: 'admin',
  navOrder: 5,

  supportsFileAttachments: false,

  summaryConfig: {
    groupableFields: ['status', 'target_entity', 'approver_role'],
  },

  routeConfig: {
    useGenericRouter: true,
  },

  fieldGroups: {
    target: {
      label: 'Target',
      fields: ['target_entity', 'target_id', 'target_field'],
      rows: [['target_entity', 'target_id'], ['target_field']],
      order: 1,
    },
    change: {
      label: 'Proposed Change',
      fields: ['previous_value', 'proposed_value'],
      rows: [['previous_value', 'proposed_value']],
      order: 2,
    },
    approval: {
      label: 'Approval',
      fields: ['approver_role', 'decision_notes', 'decided_at'],
      rows: [['approver_role'], ['decision_notes'], ['decided_at']],
      order: 3,
    },
  },

  fieldAliases: {},

  // ============================================================================
  // CRUD CONFIGURATION
  // ============================================================================

  requiredFields: ['target_entity', 'target_id', 'target_field', 'proposed_value', 'approver_role', 'requested_by'],

  immutableFields: ['request_number', 'target_entity', 'target_id', 'target_field', 'previous_value', 'requested_by'],

  displayColumns: ['request_number', 'target_entity', 'status', 'approver_role', 'created_at'],

  // ============================================================================
  // FIELD-LEVEL ACCESS CONTROL
  // ============================================================================

  fieldAccess: {
    ...UNIVERSAL_FIELD_ACCESS,

    request_number: {
      create: 'none', // Auto-generated
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    // Target fields - set at creation, immutable
    target_entity: {
      create: 'customer',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    target_id: {
      create: 'customer',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    target_field: {
      create: 'customer',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    // Values - previous immutable, proposed can be updated before decision
    previous_value: {
      create: 'customer',
      read: 'customer',
      update: 'none',
      delete: 'none',
    },
    proposed_value: {
      create: 'customer',
      read: 'customer',
      update: 'customer', // Can update until decided
      delete: 'none',
    },
    approver_role: {
      create: 'customer',
      read: 'customer',
      update: 'none', // Set at creation
      delete: 'none',
    },
    // Decision fields
    decision_notes: {
      create: 'none',
      read: 'customer',
      update: 'customer', // Approver adds notes with decision
      delete: 'none',
    },
    decided_at: {
      create: 'none',
      read: 'customer',
      update: 'none', // System-managed
      delete: 'none',
    },
    // FK fields for tracking requester and approver
    requested_by: {
      create: 'customer', // Caller provides explicitly
      read: 'customer',
      update: 'none', // Immutable
      delete: 'none',
    },
    approved_by: {
      create: 'none', // Not set at creation
      read: 'customer',
      update: 'dispatcher', // Set when decision made
      delete: 'none',
    },
  },

  // ============================================================================
  // ENUM DEFINITIONS
  // ============================================================================

  enums: {
    status: {
      pending: { label: 'Pending', color: 'warning' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      cancelled: { label: 'Cancelled', color: 'secondary' },
      expired: { label: 'Expired', color: 'secondary' },
    },
    // Standard list of approvable entities (expandable)
    target_entity: {
      recommendation: { label: 'Recommendation', color: 'info' },
      quote: { label: 'Quote', color: 'info' },
      purchase_order: { label: 'Purchase Order', color: 'info' },
    },
    // Roles that can be designated as approvers
    approver_role: {
      customer: { label: 'Customer', color: 'info' },
      technician: { label: 'Technician', color: 'info' },
      dispatcher: { label: 'Dispatcher', color: 'info' },
      manager: { label: 'Manager', color: 'info' },
      admin: { label: 'Admin', color: 'info' },
    },
  },

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  defaultIncludes: ['requester', 'approver'],
  relationships: {
    requester: {
      type: 'belongsTo',
      foreignKey: 'requested_by',
      table: 'users',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'User who created this approval request',
    },
    approver: {
      type: 'belongsTo',
      foreignKey: 'approved_by',
      table: 'users',
      fields: ['id', 'first_name', 'last_name', 'email'],
      description: 'User who approved/rejected this request',
    },
  },

  // ============================================================================
  // FIELDS (Phase 1: Core - Phase 3: Full fields)
  // ============================================================================

  fields: {
    // TIER 1: Universal Entity Contract Fields
    id: { type: 'integer', readonly: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', readonly: true },
    updated_at: { type: 'timestamp', readonly: true },

    request_number: {
      type: 'string',
      required: true,
      maxLength: 20,
      description: 'Auto-generated approval request identifier (APR-YYYY-NNNN)',
    },
    // Polymorphic target reference
    target_entity: {
      type: 'enum',
      enumKey: 'target_entity',
      required: true,
      description: 'Entity type being approved',
    },
    target_id: {
      type: 'uuid',
      required: true,
      description: 'ID of the entity being approved',
    },
    target_field: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Field being changed (e.g., "status")',
    },
    // Change values (JSON serialized)
    previous_value: {
      type: 'json',
      description: 'Previous value before change (for history)',
    },
    proposed_value: {
      type: 'json',
      required: true,
      description: 'Proposed new value',
    },
    // Approval configuration
    approver_role: {
      type: 'enum',
      enumKey: 'approver_role',
      required: true,
      description: 'Minimum role required to approve',
    },
    // Decision
    decision_notes: {
      type: 'text',
      description: 'Notes from approver on decision',
    },
    decided_at: {
      type: 'timestamp',
      description: 'When decision was made',
    },
    status: {
      type: 'enum',
      enumKey: 'status',
      default: 'pending',
    },
    // FK fields
    requested_by: {
      type: 'foreignKey',
      references: 'user',
      required: true,
      description: 'User who created this approval request',
    },
    approved_by: {
      type: 'foreignKey',
      references: 'user',
      required: false,
      description: 'User who approved/rejected (null = pending)',
    },
  },
};
