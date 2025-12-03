-- Migration 001: Add System-Level Fields to Roles Table
-- Date: 2025-10-20
-- Description: Add is_active and updated_at to roles table for consistency
-- 
-- ARCHITECTURAL PRINCIPLE: All entities should have:
-- - id (primary key)
-- - name (or equivalent identifier)
-- - is_active (soft delete capability)
-- - created_at (creation timestamp)
-- - updated_at (modification timestamp)

-- Add is_active column to roles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='roles' AND column_name='is_active') THEN
        ALTER TABLE roles ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Set all existing roles to active
        UPDATE roles SET is_active = true WHERE is_active IS NULL;
        
        -- Add index for performance
        CREATE INDEX idx_roles_active ON roles(is_active);
        
        RAISE NOTICE 'Added is_active column to roles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in roles table';
    END IF;
END $$;

-- Add updated_at column to roles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='roles' AND column_name='updated_at') THEN
        ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        -- Set updated_at to created_at for existing records
        UPDATE roles SET updated_at = created_at WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to roles table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in roles table';
    END IF;
END $$;

-- Add trigger for automatic updated_at maintenance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_roles_updated_at') THEN
        CREATE TRIGGER update_roles_updated_at
            BEFORE UPDATE ON roles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created trigger update_roles_updated_at';
    ELSE
        RAISE NOTICE 'Trigger update_roles_updated_at already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN roles.is_active IS 'System-level field: soft delete, true=active role';
COMMENT ON COLUMN roles.updated_at IS 'System-level field: automatic timestamp on updates';

-- Final verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roles'
ORDER BY ordinal_position;
