-- Migration 005: Add Deactivation Audit Fields
-- Adds deactivated_at and deactivated_by to users and roles tables
-- For tracking who deactivated a user/role and when
--
-- IDEMPOTENT: Safe to run multiple times

-- Add deactivation audit fields to users table
DO $$ 
BEGIN
    -- Add deactivated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'deactivated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP;
    END IF;

    -- Add deactivated_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'deactivated_by'
    ) THEN
        ALTER TABLE users ADD COLUMN deactivated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add deactivation audit fields to roles table
DO $$ 
BEGIN
    -- Add deactivated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'deactivated_at'
    ) THEN
        ALTER TABLE roles ADD COLUMN deactivated_at TIMESTAMP;
    END IF;

    -- Add deactivated_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'deactivated_by'
    ) THEN
        ALTER TABLE roles ADD COLUMN deactivated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add comments only if columns exist
DO $$ 
BEGIN
    -- Users table comments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'deactivated_at'
    ) THEN
        COMMENT ON COLUMN users.deactivated_at IS 'Audit field: timestamp when user was deactivated (NULL if active)';
        COMMENT ON COLUMN users.deactivated_by IS 'Audit field: user ID who deactivated this user (NULL if active)';
    END IF;

    -- Roles table comments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'deactivated_at'
    ) THEN
        COMMENT ON COLUMN roles.deactivated_at IS 'Audit field: timestamp when role was deactivated (NULL if active)';
        COMMENT ON COLUMN roles.deactivated_by IS 'Audit field: user ID who deactivated this role (NULL if active)';
    END IF;
END $$;

-- Migration complete
SELECT 'Migration 005: Deactivation audit fields added successfully' AS status;
