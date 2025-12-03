-- Migration: 007
-- Description: Add status field to users table for lifecycle management
-- Author: System
-- Date: 2025-11-10
-- Reversible: Yes

-- ============================================================================
-- ADD STATUS FIELD TO USERS
-- ============================================================================
-- Purpose: Track user lifecycle states beyond simple is_active flag
--
-- Status Values:
--   - 'pending_activation': Created by admin, awaiting first login (auth0_id null)
--   - 'active': Fully activated user with auth0_id
--   - 'suspended': Temporarily disabled (different from soft delete)
--
-- Note: This is ENTITY-SPECIFIC, not part of Entity Contract TIER 1
--       Other entities will get status fields as needed with their own values
-- ============================================================================

-- Add status column with default 'active'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add check constraint for allowed values (drop first if exists for idempotency)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_status_check'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_status_check 
        CHECK (status IN ('pending_activation', 'active', 'suspended'));
    END IF;
END $$;

-- Update existing users based on current data
-- Users without auth0_id but active should be pending (awaiting first login)
UPDATE users 
SET status = 'pending_activation'
WHERE auth0_id IS NULL 
  AND is_active = true
  AND status = 'active';

-- Suspended users should keep is_active = false for backward compatibility
UPDATE users
SET status = 'suspended'
WHERE is_active = false
  AND status = 'active';

-- Add index for status queries (performance)
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_users_status_active 
ON users(status, is_active) 
WHERE is_active = true;

-- ============================================================================
-- ROLLBACK SCRIPT (for reference)
-- ============================================================================
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
-- DROP INDEX IF EXISTS idx_users_status;
-- DROP INDEX IF EXISTS idx_users_status_active;
-- ALTER TABLE users DROP COLUMN IF EXISTS status;
