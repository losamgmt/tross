-- Migration: 013
-- Description: Add user preferences table for synced user settings
-- Author: System
-- Date: 2024-12-15
-- Reversible: Yes (see rollback section at bottom)

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================
-- Business entity: User preferences storage (1:1 relationship with users)
-- Contract compliance: ✓ SIMPLIFIED (no lifecycle states needed)
--
-- Design rationale:
--   - Uses JSONB for flexible preference storage (schema-on-read)
--   - One row per user (UNIQUE constraint on user_id)
--   - CASCADE delete when user is deleted
--   - Trigger-managed updated_at for consistency
--
-- Initial preference keys:
--   - theme: 'system' | 'light' | 'dark'
--   - notificationsEnabled: boolean
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- User relationship (1:1)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preferences storage (JSONB for flexibility)
    preferences JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps (TIER 1 compliance)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure one preference row per user
    CONSTRAINT user_preferences_user_unique UNIQUE (user_id)
);

-- ============================================================================
-- TRIGGER: Auto-update updated_at on modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- INDEX: Fast lookup by user_id (covered by UNIQUE constraint, but explicit for clarity)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- COMMENT: Table documentation
-- ============================================================================
COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings (synced across devices)';
COMMENT ON COLUMN user_preferences.preferences IS 'JSONB storage for preference key-value pairs';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To reverse this migration:
--
-- DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
-- DROP FUNCTION IF EXISTS update_user_preferences_updated_at();
-- DROP INDEX IF EXISTS idx_user_preferences_user_id;
-- DROP TABLE IF EXISTS user_preferences;
-- ============================================================================
