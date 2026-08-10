-- ============================================================================
-- MIGRATION: 006_add_human_display_name
-- ============================================================================
-- Adds a real, DB-maintained display `name` column to the HUMAN entities
-- (customers, technicians, users) as a Postgres STORED generated column
-- composed from first_name + last_name. Part of the Unified Display-Name (UDN)
-- workstream, phase P2.
--
-- The schema SSOT is backend/schema.sql (regenerated from entity metadata via
-- `npm run compose:schema`); pre-production deploys full-reset from it. This
-- migration applies the same change to any existing (non-reset) database.
--
-- The generation expression is the SSOT emitted by
-- backend/utils/name-utils.js `buildHumanNameSqlExpr(['first_name','last_name'])`.
--
-- UP:   add the generated column (Postgres AUTO-populates all existing rows).
-- DOWN: see rollback section at the bottom.
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS name VARCHAR(255)
GENERATED ALWAYS AS (NULLIF(TRIM(COALESCE(NULLIF(TRIM(first_name), '') || ' ', '') || COALESCE(NULLIF(TRIM(last_name), '') || ' ', '')), '')) STORED;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS name VARCHAR(255)
GENERATED ALWAYS AS (NULLIF(TRIM(COALESCE(NULLIF(TRIM(first_name), '') || ' ', '') || COALESCE(NULLIF(TRIM(last_name), '') || ' ', '')), '')) STORED;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS name VARCHAR(255)
GENERATED ALWAYS AS (NULLIF(TRIM(COALESCE(NULLIF(TRIM(first_name), '') || ' ', '') || COALESCE(NULLIF(TRIM(last_name), '') || ' ', '')), '')) STORED;

-- ============================================================================
-- ROLLBACK (DOWN) — run manually if reverting this migration
-- ============================================================================
-- ALTER TABLE customers   DROP COLUMN IF EXISTS name;
-- ALTER TABLE technicians DROP COLUMN IF EXISTS name;
-- ALTER TABLE users       DROP COLUMN IF EXISTS name;
