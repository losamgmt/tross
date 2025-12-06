-- ============================================================================
-- Migration 010: Add system role protection
-- ============================================================================
-- Purpose: Multi-level security for system roles (defense in depth)
-- 
-- This adds:
--   1. is_system_role column to mark protected roles
--   2. Trigger to prevent DELETE of system roles
--   3. Trigger to prevent UPDATE of immutable fields (name, priority) on system roles
--
-- Source of truth: config/models/role-metadata.js (systemProtected)
-- Protected roles: admin, manager, dispatcher, technician, client
--
-- This is the DATABASE LAYER of our multi-level protection:
--   - Route layer: Fast-fail for UX
--   - Service layer: GenericEntityService checks
--   - Database layer: THIS MIGRATION (last line of defense)
--
-- This is an IDEMPOTENT migration - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- STEP 1: Add is_system_role column
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'is_system_role'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE 'Added is_system_role column to roles table';
    ELSE
        RAISE NOTICE 'is_system_role column already exists on roles table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Mark existing system roles
-- ============================================================================
-- These are the 5 foundational roles that must exist for the RBAC system

UPDATE roles SET is_system_role = true 
WHERE name IN ('admin', 'manager', 'dispatcher', 'technician', 'customer');

-- ============================================================================
-- STEP 3: Create protection trigger function
-- ============================================================================
-- This function is called before DELETE or UPDATE on the roles table

CREATE OR REPLACE FUNCTION protect_system_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- On DELETE: Block deletion of system roles entirely
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_system_role = true THEN
            RAISE EXCEPTION 'Cannot delete system role: %. System roles are protected.', OLD.name
                USING ERRCODE = 'P0001';  -- raise_exception
        END IF;
        RETURN OLD;
    END IF;
    
    -- On UPDATE: Block changes to immutable fields (name, priority) on system roles
    IF TG_OP = 'UPDATE' THEN
        IF OLD.is_system_role = true THEN
            -- Cannot change the name of a system role
            IF NEW.name IS DISTINCT FROM OLD.name THEN
                RAISE EXCEPTION 'Cannot modify name of system role: %. System role names are immutable.', OLD.name
                    USING ERRCODE = 'P0001';
            END IF;
            
            -- Cannot change the priority of a system role
            IF NEW.priority IS DISTINCT FROM OLD.priority THEN
                RAISE EXCEPTION 'Cannot modify priority of system role: %. System role priority is immutable.', OLD.name
                    USING ERRCODE = 'P0001';
            END IF;
            
            -- Cannot demote a system role to non-system
            IF NEW.is_system_role = false THEN
                RAISE EXCEPTION 'Cannot demote system role: %. System role status is immutable.', OLD.name
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create trigger (drop first for idempotency)
-- ============================================================================

DROP TRIGGER IF EXISTS protect_system_roles_trigger ON roles;

CREATE TRIGGER protect_system_roles_trigger
    BEFORE DELETE OR UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION protect_system_roles();

-- ============================================================================
-- STEP 5: Add index for queries filtering by system role
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON roles(is_system_role);

-- ============================================================================
-- STEP 6: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN roles.is_system_role IS 
    'True for built-in system roles (admin, manager, dispatcher, technician, customer). '
    'System roles cannot be deleted and their name/priority cannot be modified. '
    'Source of truth: config/models/role-metadata.js (systemProtected)';

-- ============================================================================
-- Verification query (run manually to confirm)
-- ============================================================================
-- SELECT name, priority, is_system_role, status, is_active FROM roles ORDER BY priority DESC;
--
-- Test protection (these should fail):
-- DELETE FROM roles WHERE name = 'admin';
-- UPDATE roles SET priority = 999 WHERE name = 'admin';
-- UPDATE roles SET name = 'superadmin' WHERE name = 'admin';
