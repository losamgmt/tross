-- ============================================================================
-- Migration 012: Fix role_id FK constraint to RESTRICT instead of SET NULL
-- ============================================================================
-- PURPOSE: Prevent deleting roles that are assigned to users
--
-- PROBLEM: The original schema used ON DELETE SET NULL which allows:
--   1. Deleting a role that's assigned to users
--   2. Those users now have role_id = NULL (orphaned)
--   3. Application crashes when trying to render orphaned users
--
-- SOLUTION: Change FK constraint to ON DELETE RESTRICT
--   - Database rejects DELETE if role is assigned to any user
--   - Application must reassign users before deleting role
--
-- RELATED: 
--   - backend/routes/roles.js delete handler
--   - frontend/lib/models/user_model.dart (made roleId nullable as defense)
-- ============================================================================

-- Step 1: Drop the existing FK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_id_fkey;

-- Step 2: Add new FK constraint with RESTRICT behavior
ALTER TABLE users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- Step 3: Document the constraint
COMMENT ON CONSTRAINT users_role_id_fkey ON users IS 
'Prevents deleting roles that are assigned to users. Reassign users first.';

-- ============================================================================
-- VERIFICATION QUERY (run manually to confirm):
-- ============================================================================
-- SELECT 
--   conname AS constraint_name,
--   confdeltype AS delete_action
-- FROM pg_constraint 
-- WHERE conname = 'users_role_id_fkey';
--
-- Expected: delete_action = 'r' (RESTRICT)
-- Previous: delete_action = 'n' (SET NULL)
-- ============================================================================
