-- ============================================================================
-- TROSSAPP DATABASE SCHEMA
-- ============================================================================
-- IDEMPOTENT: Safe to run multiple times
-- VERSION: 2.1
-- LAST UPDATED: 2025-11-10
--
-- ENTITY CONTRACT v2.0 - TWO-TIER SYSTEM:
-- 
-- TIER 1: Universal Entity Contract Fields (MANDATORY for ALL business entities)
--   - id SERIAL PRIMARY KEY
--   - name/email/title (identity field)
--   - is_active BOOLEAN (soft delete - "Does this record exist?")
--   - created_at TIMESTAMP (performance cache from audit_logs)
--   - updated_at TIMESTAMP (auto-managed by trigger)
--
-- TIER 2: Entity-Specific Lifecycle Fields (OPTIONAL - only for workflow entities)
--   - status VARCHAR(50) (lifecycle state - "What stage is this record in?")
--   - Entity-specific string values with CHECK constraint
--   - Examples: 'pending_activation', 'active', 'suspended' (users)
--   - NOT REDUNDANT with is_active - serve different purposes
--
-- KEY DISTINCTION:
--   - is_active: Universal soft delete (ALL entities use)
--   - status: Lifecycle state (workflow entities only)
--
-- AUDIT PHILOSOPHY:
--   - created_by/updated_by/deactivated_by → REMOVED (use audit_logs)
--   - created_at/updated_at → KEPT (performance cache only)
--   - Source of truth: audit_logs table
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
-- Business entity: System roles for RBAC
-- Contract compliance: ✓ FULL
--
-- Identity field: name
-- Soft deletes: is_active
-- Audit: audit_logs table (created_by/updated_by removed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    -- TIER 1: Contract required fields
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Entity-specific fields
    description TEXT,
    priority INTEGER NOT NULL CHECK (priority > 0)
);

-- Insert the 5 core roles (idempotent)
-- Hierarchy: admin(5) > manager(4) > dispatcher(3) > technician(2) > client(1)
INSERT INTO roles (name, description, priority) VALUES 
('admin', 'Full system access and user management', 5),
('manager', 'Full data access, manages work orders and technicians', 4),  
('dispatcher', 'Medium access, assigns and schedules work orders', 3),
('technician', 'Limited access, updates assigned work orders', 2),
('client', 'Basic access, submits and tracks service requests', 1)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    priority = EXCLUDED.priority;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Business entity: Application users
-- Contract compliance: ✓ FULL (email = identity field)
--
-- Identity field: email (name equivalent for user entities)
-- Soft deletes: is_active (TIER 1 - universal)
-- Lifecycle states: status (TIER 2 - pending_activation → active → suspended)
-- Audit: audit_logs table (created_by/updated_by/deactivated_* removed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Identity field (name equivalent)
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'active'  -- User lifecycle state
        CHECK (status IN ('pending_activation', 'active', 'suspended')),
    
    -- Entity-specific data fields
    auth0_id VARCHAR(255) UNIQUE,  -- Nullable for pending_activation users
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL
);

-- Remove deprecated deactivated_by from roles (now in audit_logs)
-- This was a circular dependency workaround - no longer needed

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
-- SYSTEM TABLE: Exempt from entity contract
-- 
-- Source of truth for ALL audit data:
-- - Who created/updated/deactivated records
-- - When actions occurred
-- - What changed (old_values → new_values)
-- - Complete history (not just latest)
--
-- This replaces deprecated fields:
-- - created_by/updated_by (now queried from here)
-- - deactivated_at/deactivated_by (now queried from here)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    
    -- What was affected
    resource_type VARCHAR(100) NOT NULL,  -- 'users', 'roles', etc
    resource_id INTEGER,                  -- ID of affected record
    
    -- What happened
    action VARCHAR(50) NOT NULL,          -- 'create', 'update', 'deactivate', 'delete'
    old_values JSONB,                     -- State before
    new_values JSONB,                     -- State after
    
    -- Who did it
    user_id INTEGER REFERENCES users(id), -- NULL for system/dev users
    
    -- When it happened
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Result tracking
    result VARCHAR(20),                   -- 'success', 'error'
    error_message TEXT
);

-- ============================================================================
-- REFRESH TOKENS TABLE
-- ============================================================================
-- SYSTEM TABLE: Exempt from entity contract
-- Manages JWT refresh tokens for authentication
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

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);
CREATE INDEX IF NOT EXISTS idx_roles_created ON roles(created_at DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status, is_active) WHERE is_active = true;

-- Audit logs indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_active) WHERE is_active = true;

-- ============================================================================
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- ============================================================================

-- Trigger function: Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all entity tables
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Cleanup expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE roles IS 'System roles for RBAC (admin, manager, dispatcher, technician, client)';
COMMENT ON TABLE users IS 'Application users with role-based permissions';
COMMENT ON TABLE audit_logs IS 'Complete audit trail - source of truth for who/when/what changed';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for authentication';

-- Roles columns
COMMENT ON COLUMN roles.id IS 'Unique identifier';
COMMENT ON COLUMN roles.name IS 'Role name (admin, manager, etc) - primary identity field';
COMMENT ON COLUMN roles.is_active IS 'Soft delete flag (true=active, false=deleted)';
COMMENT ON COLUMN roles.created_at IS 'Creation timestamp (readonly, cached from audit_logs)';
COMMENT ON COLUMN roles.updated_at IS 'Last update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN roles.description IS 'Human-readable role description';
COMMENT ON COLUMN roles.priority IS 'Role hierarchy (1-5, higher = more permissions)';

-- Users columns
COMMENT ON COLUMN users.id IS 'Unique identifier';
COMMENT ON COLUMN users.email IS 'User email address - primary identity field (name equivalent)';
COMMENT ON COLUMN users.is_active IS 'Soft delete flag (true=active, false=deleted)';
COMMENT ON COLUMN users.created_at IS 'Creation timestamp (readonly, cached from audit_logs)';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN users.role_id IS 'User has exactly ONE role (KISS principle)';
COMMENT ON COLUMN users.auth0_id IS 'Auth0 user identifier for OAuth integration';

-- Audit logs columns
COMMENT ON COLUMN audit_logs.resource_type IS 'Table name of affected entity (users, roles, etc)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of affected record';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, update, deactivate, delete)';
COMMENT ON COLUMN audit_logs.user_id IS 'Who performed the action (NULL for system/dev users)';
COMMENT ON COLUMN audit_logs.old_values IS 'Entity state before change (JSONB)';
COMMENT ON COLUMN audit_logs.new_values IS 'Entity state after change (JSONB)';

-- ============================================================================
-- CONTRACT VALIDATION
-- ============================================================================
-- Run validation functions to ensure compliance:
--
-- Load validation functions:
--   \i backend/db/functions/validate_entity_contract.sql
--
-- Validate all tables:
--   SELECT * FROM validate_all_entities();
--
-- Expected output:
--   table_name | compliant | issues
--   -----------+-----------+--------
--   roles      | t         | NULL
--   users      | t         | NULL
-- ============================================================================
