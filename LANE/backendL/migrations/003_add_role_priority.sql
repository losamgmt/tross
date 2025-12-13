-- Migration: Add priority column to roles table
-- Purpose: Establish role hierarchy for permission checking
-- Hierarchy: admin(5) > manager(4) > dispatcher(3) > technician(2) > client(1)
--
-- IDEMPOTENT: Safe to run multiple times

-- Add priority column (nullable initially for safe rollout)
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Update existing roles with their hierarchy levels
UPDATE roles SET priority = 5 WHERE name = 'admin';
UPDATE roles SET priority = 4 WHERE name = 'manager';
UPDATE roles SET priority = 3 WHERE name = 'dispatcher';
UPDATE roles SET priority = 2 WHERE name = 'technician';
UPDATE roles SET priority = 1 WHERE name = 'client';

-- Make priority NOT NULL after backfilling data
ALTER TABLE roles 
ALTER COLUMN priority SET NOT NULL;

-- Add constraint: priority must be positive (PostgreSQL 9.6+ syntax)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'roles_priority_positive'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_priority_positive CHECK (priority > 0);
    END IF;
END $$;

-- Add index for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);

-- Verify the migration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'priority'
    ) THEN
        RAISE EXCEPTION 'Migration failed: priority column not added';
    END IF;
    
    IF (SELECT COUNT(*) FROM roles WHERE priority IS NULL) > 0 THEN
        RAISE EXCEPTION 'Migration failed: roles have NULL priorities';
    END IF;
END $$;
