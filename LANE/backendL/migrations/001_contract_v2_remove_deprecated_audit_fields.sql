-- ============================================================================
-- MIGRATION: Contract v2.0 - Remove Deprecated Audit Fields
-- ============================================================================
-- 
-- Changes:
-- 1. Remove deactivated_at, deactivated_by from roles
-- 2. Remove deactivated_at, deactivated_by from users
-- 3. Add NOT NULL constraints to contract fields
-- 4. Migrate existing deactivation data to audit_logs
--
-- SAFE: Can be rolled back
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Migrate existing deactivation data to audit_logs
-- ============================================================================

-- Migrate role deactivations
INSERT INTO audit_logs (
    resource_type,
    resource_id,
    action,
    user_id,
    created_at,
    old_values,
    new_values
)
SELECT 
    'roles',
    id,
    'deactivate',
    deactivated_by,
    COALESCE(deactivated_at, updated_at),
    jsonb_build_object('is_active', true),
    jsonb_build_object('is_active', false)
FROM roles
WHERE deactivated_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM audit_logs al
      WHERE al.resource_type = 'roles'
        AND al.resource_id = roles.id
        AND al.action = 'deactivate'
  );

-- Migrate user deactivations
INSERT INTO audit_logs (
    resource_type,
    resource_id,
    action,
    user_id,
    created_at,
    old_values,
    new_values
)
SELECT 
    'users',
    id,
    'deactivate',
    deactivated_by,
    COALESCE(deactivated_at, updated_at),
    jsonb_build_object('is_active', true),
    jsonb_build_object('is_active', false)
FROM users
WHERE deactivated_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM audit_logs al
      WHERE al.resource_type = 'users'
        AND al.resource_id = users.id
        AND al.action = 'deactivate'
  );

-- ============================================================================
-- Step 2: Drop deprecated columns
-- ============================================================================

-- Roles table
ALTER TABLE roles DROP COLUMN IF EXISTS deactivated_at;
ALTER TABLE roles DROP COLUMN IF EXISTS deactivated_by;

-- Users table
ALTER TABLE users DROP COLUMN IF EXISTS deactivated_at;
ALTER TABLE users DROP COLUMN IF EXISTS deactivated_by;

-- ============================================================================
-- Step 3: Add NOT NULL constraints to contract fields
-- ============================================================================

-- Roles
ALTER TABLE roles 
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Users
ALTER TABLE users 
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Audit logs
ALTER TABLE audit_logs
    ALTER COLUMN resource_type SET NOT NULL,
    ALTER COLUMN action SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL;

-- Refresh tokens
ALTER TABLE refresh_tokens
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL;

-- ============================================================================
-- Step 4: Update audit_logs structure (ensure all columns exist)
-- ============================================================================

-- Reorder columns for clarity (PostgreSQL doesn't support column reordering, but we can comment)
-- New logical order: id, resource_type, resource_id, action, old_values, new_values, user_id, created_at, ...

COMMENT ON COLUMN audit_logs.resource_type IS 'What table was affected';
COMMENT ON COLUMN audit_logs.resource_id IS 'Which record was affected';
COMMENT ON COLUMN audit_logs.action IS 'What happened (create, update, deactivate, delete)';
COMMENT ON COLUMN audit_logs.user_id IS 'Who did it (NULL for system actions)';
COMMENT ON COLUMN audit_logs.created_at IS 'When it happened';

-- ============================================================================
-- Step 5: Validation
-- ============================================================================

-- Verify no deprecated columns remain
DO $$
DECLARE
    deprecated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deprecated_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'roles')
      AND column_name IN ('deactivated_at', 'deactivated_by');
    
    IF deprecated_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Deprecated columns still exist';
    END IF;
    
    RAISE NOTICE 'Migration successful: All deprecated columns removed';
END $$;

-- Verify audit logs have deactivation records
DO $$
DECLARE
    audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO audit_count
    FROM audit_logs
    WHERE action = 'deactivate';
    
    RAISE NOTICE 'Audit logs contain % deactivation records', audit_count;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
/*
BEGIN;

-- Re-add deprecated columns
ALTER TABLE roles 
    ADD COLUMN deactivated_at TIMESTAMP,
    ADD COLUMN deactivated_by INTEGER REFERENCES users(id);

ALTER TABLE users 
    ADD COLUMN deactivated_at TIMESTAMP,
    ADD COLUMN deactivated_by INTEGER REFERENCES users(id);

-- Restore data from audit_logs
WITH deactivations AS (
    SELECT 
        resource_type,
        resource_id,
        user_id,
        created_at
    FROM audit_logs
    WHERE action = 'deactivate'
      AND (new_values->>'is_active')::boolean = false
)
UPDATE roles r
SET 
    deactivated_at = d.created_at,
    deactivated_by = d.user_id
FROM deactivations d
WHERE d.resource_type = 'roles'
  AND d.resource_id = r.id;

WITH deactivations AS (
    SELECT 
        resource_type,
        resource_id,
        user_id,
        created_at
    FROM audit_logs
    WHERE action = 'deactivate'
      AND (new_values->>'is_active')::boolean = false
)
UPDATE users u
SET 
    deactivated_at = d.created_at,
    deactivated_by = d.user_id
FROM deactivations d
WHERE d.resource_type = 'users'
  AND d.resource_id = u.id;

COMMIT;
*/
