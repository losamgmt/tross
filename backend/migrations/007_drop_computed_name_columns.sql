-- ============================================================================
-- MIGRATION: 007_drop_computed_name_columns
-- ============================================================================
-- Drops the vestigial `name` column from the COMPUTED entities (work_orders,
-- invoices, contracts). Their display name is now COMPOSED ON READ from the
-- `computedName` template (customer + summary + identifier) and is never stored
-- -- see the display-name SSOT workstream. The schema SSOT (backend/schema.sql,
-- regenerated via `npm run compose:schema`) no longer emits these columns; this
-- migration applies the same drop to any existing (non-reset) database.
--
-- Idempotent: DROP COLUMN IF EXISTS (a no-op on a fresh schema.sql build).
-- ============================================================================

ALTER TABLE work_orders DROP COLUMN IF EXISTS name;
ALTER TABLE invoices    DROP COLUMN IF EXISTS name;
ALTER TABLE contracts   DROP COLUMN IF EXISTS name;

-- ============================================================================
-- ROLLBACK (DOWN) -- run manually if reverting this migration
-- ============================================================================
-- The column held no data of record (name is composed on read), so a rollback
-- re-adds it as a plain nullable column (values NULL until/unless backfilled).
-- ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS name VARCHAR(255);
-- ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS name VARCHAR(255);
-- ALTER TABLE contracts   ADD COLUMN IF NOT EXISTS name VARCHAR(255);
