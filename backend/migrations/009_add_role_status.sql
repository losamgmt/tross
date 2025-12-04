-- ============================================================================
-- Migration 009: Add status field to roles table
-- ============================================================================
-- Purpose: Bring roles table into full TIER 2 Entity Contract compliance
-- 
-- Entity Contract v2.0:
--   TIER 1: id, identity_field, is_active, created_at, updated_at
--   TIER 2: status (lifecycle state)
--
-- Role Status Values:
--   'active'   - Role is fully operational, can be assigned to users
--   'disabled' - Role exists but cannot be newly assigned (existing users keep it)
--
-- This is an IDEMPOTENT migration - safe to run multiple times
-- ============================================================================

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'status'
    ) THEN
        ALTER TABLE roles ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;
        
        -- Add CHECK constraint
        ALTER TABLE roles ADD CONSTRAINT roles_status_check 
            CHECK (status IN ('active', 'disabled'));
        
        RAISE NOTICE 'Added status column to roles table';
    ELSE
        RAISE NOTICE 'Status column already exists on roles table';
    END IF;
END $$;

-- Create performance index (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);

-- Update existing roles to 'active' status (should already be default, but explicit)
UPDATE roles SET status = 'active' WHERE status IS NULL;

-- ============================================================================
-- Verification query (run manually to confirm)
-- ============================================================================
-- SELECT name, status, is_active, priority FROM roles ORDER BY priority DESC;
