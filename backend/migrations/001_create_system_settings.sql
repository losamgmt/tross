-- ============================================================================
-- MIGRATION: 001_create_system_settings
-- ============================================================================
-- Creates system_settings table for application-wide configuration
-- Used for: maintenance mode, feature flags, system preferences
--
-- UP: Creates table and seeds default values
-- DOWN: DROP TABLE system_settings CASCADE;
-- ============================================================================

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
-- Key-value store for system-wide configuration
-- Uses JSONB for flexible value types
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    -- Primary key is the setting key itself (unique, human-readable)
    key VARCHAR(100) PRIMARY KEY,
    
    -- JSONB value allows any structure
    value JSONB NOT NULL DEFAULT '{}',
    
    -- Human-readable description
    description TEXT,
    
    -- Audit trail
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Index for efficient key lookups (PRIMARY KEY handles this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_timestamp();

-- ============================================================================
-- SEED DEFAULT SETTINGS
-- ============================================================================

-- Maintenance mode (disabled by default)
INSERT INTO system_settings (key, value, description) VALUES 
(
    'maintenance_mode',
    '{
        "enabled": false,
        "message": "System is under maintenance. Please try again later.",
        "allowed_roles": ["admin"],
        "estimated_end": null
    }',
    'Controls system-wide maintenance mode. When enabled, only allowed_roles can access the system.'
)
ON CONFLICT (key) DO NOTHING;

-- Feature flags (for future use)
INSERT INTO system_settings (key, value, description) VALUES 
(
    'feature_flags',
    '{
        "dark_mode": true,
        "file_attachments": true,
        "audit_logging": true
    }',
    'Feature flags for enabling/disabling system features.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE system_settings IS 'System-wide configuration key-value store';
COMMENT ON COLUMN system_settings.key IS 'Unique setting identifier (e.g., maintenance_mode)';
COMMENT ON COLUMN system_settings.value IS 'JSONB value - structure depends on key';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of setting purpose';
COMMENT ON COLUMN system_settings.updated_at IS 'When the setting was last modified';
COMMENT ON COLUMN system_settings.updated_by IS 'Which user last modified the setting';
