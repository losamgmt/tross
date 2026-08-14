-- ============================================================================
-- TROSS DATABASE SCHEMA
-- ============================================================================
-- AUTO-GENERATED from entity metadata via npm run compose:schema
-- DO NOT EDIT MANUALLY - Changes will be overwritten
--
-- Source of Truth: backend/config/models/*-metadata.js
-- Regenerate: npm run compose:schema
--
-- PRE-PRODUCTION MODE: Full reset on each deploy (rebuild strategy).
-- This schema includes a DROP section for a clean rebuild. For a data-preserving
-- (create-if-not-exists) schema, regenerate with: npm run compose:schema -- --no-drop
-- See docs/operations/DEPLOYMENT.md for the rebuild vs migrate deployment strategies.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

