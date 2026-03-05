-- ============================================================================
-- LEGACY TABLES (Non-entity infrastructure tables)
-- ============================================================================
-- These tables are NOT generated from entity metadata because they:
-- 1. Have special relationships (refresh_tokens: security/sessions)
-- 2. Are infrastructure, not business entities
-- ============================================================================

-- ============================================================================
-- REFRESH TOKENS TABLE
-- ============================================================================
-- Purpose: JWT refresh token storage for authentication
-- Relationship: Many-to-one with users (user can have multiple active sessions)
-- Security: Stores hashed tokens only, supports revocation
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL,

    -- Token lifecycle
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,

    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Indexes for refresh_tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_active) WHERE is_active = true;

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
-- Purpose: Application-wide configuration key-value store
-- Examples: maintenance_mode, api_rate_limits, feature_flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for system_settings
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
