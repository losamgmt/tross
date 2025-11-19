-- Database Migration Tracking Table
-- 
-- Tracks which migrations have been applied to the database
-- Ensures migrations run exactly once in the correct order
--
-- CRITICAL: This table must exist before running any migrations

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER,
  checksum VARCHAR(64),
  
  -- Audit fields
  applied_by VARCHAR(255) DEFAULT CURRENT_USER,
  notes TEXT,
  
  CONSTRAINT version_format CHECK (version ~ '^\d{3}_')
);

-- Index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
  ON schema_migrations(version);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
  ON schema_migrations(applied_at DESC);

COMMENT ON TABLE schema_migrations IS 
  'Tracks applied database migrations to prevent duplicate execution and enable rollback';

COMMENT ON COLUMN schema_migrations.version IS 
  'Migration version number (e.g., 001, 002) - must be unique';

COMMENT ON COLUMN schema_migrations.name IS 
  'Human-readable migration name (e.g., add_user_status_field)';

COMMENT ON COLUMN schema_migrations.checksum IS 
  'SHA-256 hash of migration file content - detects manual edits to applied migrations';
