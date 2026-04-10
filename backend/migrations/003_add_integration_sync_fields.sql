-- ============================================================================
-- MIGRATION: 003_add_integration_sync_fields
-- ============================================================================
-- Adds integration sync tracking fields to invoices and payments tables
-- Used for: QuickBooks invoice sync, Stripe payment tracking
--
-- UP: Add columns for sync status, external IDs, timestamps
-- DOWN: See rollback section at bottom
-- ============================================================================

-- ============================================================================
-- INVOICES TABLE: QuickBooks Sync Fields
-- ============================================================================

-- External ID from QuickBooks (DocNumber)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS qb_invoice_id VARCHAR(50);

-- Sync status: pending, synced, modified, error, skipped
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS qb_sync_status VARCHAR(20);

-- Add CHECK constraint for valid sync status values (DB-level validation)
-- Using DO block to handle "constraint already exists" gracefully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_qb_sync_status_check'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_qb_sync_status_check
      CHECK (qb_sync_status IS NULL OR qb_sync_status IN ('pending', 'synced', 'modified', 'error', 'skipped'));
  END IF;
END $$;

-- Timestamp of last successful sync
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS qb_synced_at TIMESTAMPTZ;

-- Last sync error message (cleared on success)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS qb_sync_error TEXT;

-- Index for efficient sync status queries
CREATE INDEX IF NOT EXISTS idx_invoices_qb_sync_status
ON invoices(qb_sync_status)
WHERE qb_sync_status IS NOT NULL;

-- Index for finding invoices by QuickBooks ID
CREATE INDEX IF NOT EXISTS idx_invoices_qb_invoice_id
ON invoices(qb_invoice_id)
WHERE qb_invoice_id IS NOT NULL;

-- ============================================================================
-- PAYMENTS TABLE: Stripe Integration Fields
-- ============================================================================

-- Stripe PaymentIntent ID (pi_xxx)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(50);

-- Stripe Charge ID (ch_xxx)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(50);

-- Index for finding payments by Stripe PaymentIntent
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id
ON payments(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Index for finding payments by Stripe Charge
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge_id
ON payments(stripe_charge_id)
WHERE stripe_charge_id IS NOT NULL;

-- ============================================================================
-- PAYMENTS TABLE: QuickBooks Integration Fields
-- ============================================================================

-- External ID from QuickBooks (Payment DocNumber)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS qb_payment_id VARCHAR(50);

-- Index for finding payments by QuickBooks ID
CREATE INDEX IF NOT EXISTS idx_payments_qb_payment_id
ON payments(qb_payment_id)
WHERE qb_payment_id IS NOT NULL;

-- ============================================================================
-- PAYMENTS TABLE: Generic External Reference
-- ============================================================================

-- Flexible external reference for any system
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS external_ref VARCHAR(100);

-- Index for searching by external reference
CREATE INDEX IF NOT EXISTS idx_payments_external_ref
ON payments(external_ref)
WHERE external_ref IS NOT NULL;

-- ============================================================================
-- ROLLBACK (execute manually if needed)
-- ============================================================================
-- 
-- -- Invoices rollback
-- DROP INDEX IF EXISTS idx_invoices_qb_sync_status;
-- DROP INDEX IF EXISTS idx_invoices_qb_invoice_id;
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_qb_sync_status_check;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS qb_invoice_id;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS qb_sync_status;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS qb_synced_at;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS qb_sync_error;
-- 
-- -- Payments rollback
-- DROP INDEX IF EXISTS idx_payments_stripe_payment_intent_id;
-- DROP INDEX IF EXISTS idx_payments_stripe_charge_id;
-- DROP INDEX IF EXISTS idx_payments_qb_payment_id;
-- DROP INDEX IF EXISTS idx_payments_external_ref;
-- ALTER TABLE payments DROP COLUMN IF EXISTS stripe_payment_intent_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS stripe_charge_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS qb_payment_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS external_ref;
-- ============================================================================
