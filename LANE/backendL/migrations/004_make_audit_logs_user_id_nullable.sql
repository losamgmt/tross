-- Migration: Make audit_logs.user_id nullable for dev user support
-- Date: 2025-10-24
-- Purpose: Allow audit logging for dev users (who don't have DB records)
--          Maintains 100% parity between dev and real auth

-- Make user_id nullable (currently NOT NULL from foreign key)
ALTER TABLE audit_logs 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN audit_logs.user_id IS 
  'User ID from users table. NULL for dev users (no DB records) or system actions.';
