-- ============================================================================
-- MIGRATION: 005_unique_constraints_reconciliation
-- ============================================================================
-- Reconciles deployed databases with the metadata-driven schema generator,
-- which now emits metadata.uniqueConstraints.
--
--   1. Adds composite UNIQUE constraints:
--      - 5 junctions (customer_units, property_roles, service_agreement_items,
--        visit_subcontractors, visit_technicians) that previously had NO
--        uniqueness in the live schema -> duplicate M:M pairs were possible.
--      - assets (unit_id, name) and units (property_id, unit_identifier),
--        real domain constraints previously faked as hand-added unique indexes.
--   2. Drops the 3 hand-added "seed idempotency" unique indexes that these
--      constraints replace (assets, units), plus idx_properties_name_unique
--      which was domain-incorrect (properties may legitimately share a name;
--      it now lives in demo-data.sql as a dev-only helper).
--
-- UP: below. DOWN: see rollback section at bottom.
-- Idempotency: ADD CONSTRAINT guarded via pg_constraint; DROP INDEX IF EXISTS.
-- NOTE: if a deployed DB already contains duplicate junction/asset/unit rows,
--       de-duplicate them before applying (the ADD CONSTRAINT will otherwise
--       fail loudly, which is the desired fail-fast).
-- ============================================================================

-- 1. Composite UNIQUE constraints (idempotent via pg_constraint guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_assets_unit_name') THEN
    ALTER TABLE assets ADD CONSTRAINT uq_assets_unit_name UNIQUE (unit_id, name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_units_property_identifier') THEN
    ALTER TABLE units ADD CONSTRAINT uq_units_property_identifier UNIQUE (property_id, unit_identifier);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_customer_unit') THEN
    ALTER TABLE customer_units ADD CONSTRAINT uq_customer_unit UNIQUE (customer_id, unit_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_customer_property') THEN
    ALTER TABLE property_roles ADD CONSTRAINT uq_customer_property UNIQUE (customer_id, property_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_service_agreement_service_template') THEN
    ALTER TABLE service_agreement_items ADD CONSTRAINT uq_service_agreement_service_template UNIQUE (service_agreement_id, service_template_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_visit_subcontractor') THEN
    ALTER TABLE visit_subcontractors ADD CONSTRAINT uq_visit_subcontractor UNIQUE (visit_id, subcontractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_visit_technician') THEN
    ALTER TABLE visit_technicians ADD CONSTRAINT uq_visit_technician UNIQUE (visit_id, technician_id);
  END IF;
END $$;

-- 2. Drop the superseded / domain-incorrect hand-added unique indexes
DROP INDEX IF EXISTS idx_assets_unit_name_unique;
DROP INDEX IF EXISTS idx_units_property_identifier_unique;
DROP INDEX IF EXISTS idx_properties_name_unique;

-- ============================================================================
-- ROLLBACK (DOWN) -- drop the constraints and restore the hand-added indexes
-- ============================================================================
-- ALTER TABLE assets DROP CONSTRAINT IF EXISTS uq_assets_unit_name;
-- ALTER TABLE units DROP CONSTRAINT IF EXISTS uq_units_property_identifier;
-- ALTER TABLE customer_units DROP CONSTRAINT IF EXISTS uq_customer_unit;
-- ALTER TABLE property_roles DROP CONSTRAINT IF EXISTS uq_customer_property;
-- ALTER TABLE service_agreement_items DROP CONSTRAINT IF EXISTS uq_service_agreement_service_template;
-- ALTER TABLE visit_subcontractors DROP CONSTRAINT IF EXISTS uq_visit_subcontractor;
-- ALTER TABLE visit_technicians DROP CONSTRAINT IF EXISTS uq_visit_technician;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_unit_name_unique ON assets(unit_id, name);
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_units_property_identifier_unique ON units(property_id, unit_identifier);
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_name_unique ON properties(name);
-- ============================================================================
