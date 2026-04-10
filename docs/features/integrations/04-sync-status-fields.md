# Module 04: Sync Status Metadata Fields

**Status:** Implemented ✅  
**Locations:**
- `backend/config/models/invoice-metadata.js`
- `backend/config/models/payment-metadata.js`
- `backend/migrations/003_add_integration_sync_fields.sql`  
**Lines of Code:** ~80 added across files  
**Dependencies:** `field-types.js` (withTraits, TRAIT_SETS)

> **CRITICAL:** Uses actual codebase pattern with `withTraits()`, not the legacy format.

---

## Purpose

Add metadata fields to track synchronization state between Tross entities and external systems (QuickBooks, Stripe).

**SRP:** ONLY defines field schemas. Does NOT:
- Perform sync logic
- Update these fields (that's the integration service's job)
- Validate external IDs

---

## Fields Overview

| Entity | Field | Type | Purpose |
|--------|-------|------|---------|
| Invoice | `qb_invoice_id` | `string` | QuickBooks Invoice DocNumber |
| Invoice | `qb_sync_status` | `enum` | Current sync state |
| Invoice | `qb_synced_at` | `timestamp` | Last successful sync |
| Invoice | `qb_sync_error` | `text` | Last error message |
| Payment | `stripe_payment_intent_id` | `string` | Stripe PaymentIntent ID |
| Payment | `stripe_charge_id` | `string` | Stripe Charge ID |
| Payment | `qb_payment_id` | `string` | QuickBooks Payment DocNumber |
| Payment | `external_ref` | `string` | Generic external reference |

---

## Sync Status Enum

Add to the `enums` section of invoice-metadata.js:

```javascript
enums: {
  // ... existing status enum ...
  
  qb_sync_status: {
    pending: { color: 'secondary', label: 'Pending' },
    synced: { color: 'success', label: 'Synced' },
    modified: { color: 'warning', label: 'Modified' },
    error: { color: 'error', label: 'Error' },
    skipped: { color: 'secondary', label: 'Skipped' },
  },
},
```

### State Transitions

```
[New Invoice] → PENDING
      ↓
[Sync Success] → SYNCED
      ↓
[Local Edit] → MODIFIED
      ↓
[Re-sync Success] → SYNCED

[Sync Fails] → ERROR (with qb_sync_error message)
```

---

## Invoice Metadata Additions

Add to `backend/config/models/invoice-metadata.js` `fields` section:

```javascript
// At top of file, ensure these imports exist:
const {
  withTraits,
  TRAIT_SETS,
} = require('../field-types');

// ... then in the fields: { ... } section, add:

  // ===========================================================================
  // QUICKBOOKS INTEGRATION FIELDS
  // ===========================================================================

  // External ID from QuickBooks (DocNumber)
  qb_invoice_id: withTraits(
    { 
      type: 'string', 
      maxLength: 50, 
      description: 'QuickBooks Invoice DocNumber',
      pattern: '^[A-Za-z0-9-]+$',
    },
    TRAIT_SETS.FILTER_ONLY  // Filterable for sync queries, not searchable
  ),

  // Sync status enum
  qb_sync_status: withTraits(
    { 
      type: 'enum', 
      enumKey: 'qb_sync_status',
      default: null,  // null = never synced
      description: 'QuickBooks synchronization status',
    },
    TRAIT_SETS.FILTER_ONLY
  ),

  // Last successful sync timestamp
  qb_synced_at: withTraits(
    { 
      type: 'timestamp', 
      description: 'Timestamp of last successful QuickBooks sync',
    },
    TRAIT_SETS.FILTER_ONLY
  ),

  // Last sync error (cleared on success)
  qb_sync_error: withTraits(
    { 
      type: 'text', 
      maxLength: 500,
      description: 'Last QuickBooks sync error message',
    },
    // No traits - not filterable/searchable (contains error details)
  ),
```

---

## Payment Metadata Additions

Add to `backend/config/models/payment-metadata.js` `fields` section:

```javascript
// At top of file, ensure these imports exist:
const {
  withTraits,
  TRAIT_SETS,
} = require('../field-types');

// ... then in the fields: { ... } section, add:

  // ===========================================================================
  // STRIPE INTEGRATION FIELDS
  // ===========================================================================

  // Stripe PaymentIntent ID (pi_xxx)
  stripe_payment_intent_id: withTraits(
    { 
      type: 'string', 
      maxLength: 50, 
      description: 'Stripe PaymentIntent ID (pi_xxx)',
      pattern: '^pi_[a-zA-Z0-9]+$',
    },
    TRAIT_SETS.FILTER_ONLY
  ),

  // Stripe Charge ID (ch_xxx)
  stripe_charge_id: withTraits(
    { 
      type: 'string', 
      maxLength: 50, 
      description: 'Stripe Charge ID (ch_xxx)',
      pattern: '^ch_[a-zA-Z0-9]+$',
    },
    TRAIT_SETS.FILTER_ONLY
  ),

  // ===========================================================================
  // QUICKBOOKS INTEGRATION FIELDS
  // ===========================================================================

  // External ID from QuickBooks
  qb_payment_id: withTraits(
    { 
      type: 'string', 
      maxLength: 50, 
      description: 'QuickBooks Payment DocNumber',
      pattern: '^[A-Za-z0-9-]+$',
    },
    TRAIT_SETS.FILTER_ONLY
  ),

  // ===========================================================================
  // GENERIC EXTERNAL REFERENCE
  // ===========================================================================

  // Flexible external reference for any system
  external_ref: withTraits(
    { 
      type: 'string', 
      maxLength: 100, 
      description: 'Generic external system reference ID',
    },
    TRAIT_SETS.SEARCHABLE_LOOKUP  // Searchable + filterable
  ),
```

---

## Field Access Control

Add to the `fieldAccess` section of each metadata file:

```javascript
// In invoice-metadata.js fieldAccess:
fieldAccess: {
  // ... existing fields ...

  // Integration fields - admin only for write, manager+ for read
  qb_invoice_id: {
    create: 'admin',
    read: 'dispatcher',
    update: 'admin',
    delete: 'none',
  },
  qb_sync_status: {
    create: 'admin',
    read: 'dispatcher',
    update: 'admin',
    delete: 'none',
  },
  qb_synced_at: {
    create: 'admin',
    read: 'dispatcher',
    update: 'admin',
    delete: 'none',
  },
  qb_sync_error: {
    create: 'admin',
    read: 'admin',  // Restricted - may contain sensitive details
    update: 'admin',
    delete: 'none',
  },
},
```

---

## Database Indexing Recommendation

For efficient sync status queries, add a GIN index:

```sql
-- Add to a migration file if queries become slow
CREATE INDEX idx_invoices_metadata_gin ON invoices USING GIN (metadata);
CREATE INDEX idx_payments_metadata_gin ON payments USING GIN (metadata);

-- Or for specific field queries:
CREATE INDEX idx_invoices_qb_sync_status 
  ON invoices ((metadata->>'qb_sync_status'))
  WHERE metadata->>'qb_sync_status' IS NOT NULL;
```

**Note:** JSONB indexes are optional for MVP pilot. Add only if query performance is an issue.

---

## Usage Examples

### Setting Sync Status After Sync

```javascript
// In QuickBooksService.syncInvoice()
async syncInvoice(invoiceId) {
  const invoice = await InvoiceService.getById(invoiceId);
  
  try {
    const qbInvoice = await this._pushToQuickBooks(invoice);
    
    // Update sync fields
    await InvoiceService.update(invoiceId, {
      metadata: {
        ...invoice.metadata,
        qb_invoice_id: qbInvoice.DocNumber,
        qb_sync_status: 'synced',
        qb_synced_at: new Date().toISOString(),
        qb_sync_error: null,  // Clear any previous error
      },
    });
  } catch (error) {
    // Track error
    await InvoiceService.update(invoiceId, {
      metadata: {
        ...invoice.metadata,
        qb_sync_status: 'error',
        qb_sync_error: error.message.slice(0, 500),
      },
    });
    throw error;
  }
}
```

### Querying Sync Status

```javascript
// Find invoices needing sync
const needsSync = await db.query(`
  SELECT id, invoice_number, metadata->>'qb_sync_status' as status
  FROM invoices
  WHERE metadata->>'qb_sync_status' IN ('pending', 'modified')
  ORDER BY created_at
  LIMIT 100
`);
```

### Marking Modified After Edit

```javascript
// In GenericEntityService.update() or invoice route hook
afterUpdate(invoice) {
  // If invoice was synced and now edited, mark as modified
  if (invoice.metadata?.qb_invoice_id && 
      invoice.metadata?.qb_sync_status === 'synced') {
    return {
      metadata: {
        ...invoice.metadata,
        qb_sync_status: 'modified',
      },
    };
  }
}
```

---

## Test Plan

```javascript
describe('Invoice Sync Metadata', () => {
  describe('qb_invoice_id field', () => {
    it('accepts valid QuickBooks DocNumber format');
    it('rejects invalid characters');
    it('respects maxLength: 50');
  });

  describe('qb_sync_status enum', () => {
    it('accepts pending, synced, modified, error, skipped');
    it('defaults to null for never-synced invoices');
    it('is filterable via TRAIT_SETS.FILTER_ONLY');
  });

  describe('qb_sync_error field', () => {
    it('is read-restricted to admin role');
    it('truncates to 500 characters');
  });
});

describe('Payment Integration Metadata', () => {
  describe('stripe_payment_intent_id', () => {
    it('accepts valid pi_xxx format');
    it('rejects non-pi_ prefixed values');
  });

  describe('stripe_charge_id', () => {
    it('accepts valid ch_xxx format');
    it('rejects non-ch_ prefixed values');
  });

  describe('external_ref', () => {
    it('is searchable via TRAIT_SETS.SEARCHABLE_LOOKUP');
    it('respects maxLength: 100');
  });
});

describe('Schema composition', () => {
  it('fields are added via npm run compose:schema');
  it('existing tests continue to pass after field addition');
});
```

---

## Design Review

### Architect ✅
- [x] Uses existing metadata system (no new tables)
- [x] **CORRECTED:** Uses `withTraits()` pattern, not legacy format
- [x] Fields are provider-namespaced (`qb_`, `stripe_`)
- [x] Status enum defined in `enums` section
- [x] Queryable via JSONB operators

### Designer ✅
- [x] Field names self-documenting
- [x] Consistent permission patterns via `fieldAccess`
- [x] Uses TRAIT_SETS for consistent behavior

### Engineer ✅
- [x] **CORRECTED:** Imports from `field-types.js`
- [x] No migration needed (JSONB storage)
- [x] Pattern validation prevents garbage data
- [x] Error field length capped (500 chars)
- [x] Generic `external_ref` for ad-hoc needs
- [x] Index recommendations included

### Security ✅
- [x] `qb_sync_error` read-restricted to admin (may contain sensitive details)
- [x] Integration fields write-restricted to admin role
- [x] Pattern validation prevents injection via external IDs
