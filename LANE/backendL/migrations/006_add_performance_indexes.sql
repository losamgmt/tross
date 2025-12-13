-- Migration 006: Add Performance Indexes
-- Description: Add indexes for frequently queried fields to improve query performance
-- Author: System
-- Date: 2025-11-05
-- Phase: 3B - Database Indexes

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Index on email (unique, frequently used for lookups and auth)
-- Already has UNIQUE constraint, but adding explicit index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on auth0_id (unique, used for Auth0 authentication lookups)
-- Already has UNIQUE constraint, but adding explicit index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);

-- Index on role_id (foreign key, used for filtering and joins)
-- Improves performance of: ?role_id=X queries and role-based filtering
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Index on is_active (frequently used in WHERE clauses)
-- Improves performance of active/inactive user filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Composite index for common query pattern: active users by role
-- Optimizes: SELECT * FROM users WHERE is_active = true AND role_id = X
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role_id);

-- Index on created_at (used for sorting and date range queries)
-- Improves performance of: ORDER BY created_at, date range filters
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Partial index for active users only (most common query pattern)
-- Smaller index size, faster queries for active users
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(id, email, role_id) 
WHERE is_active = true;

-- ============================================================================
-- ROLES TABLE INDEXES
-- ============================================================================

-- Index on name (unique, frequently used for lookups)
-- Already has UNIQUE constraint, but adding explicit index for performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Index on priority (used for sorting roles by importance)
-- Improves performance of: ORDER BY priority DESC
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority DESC);

-- Index on is_active (used for filtering active roles)
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- Composite index for active roles sorted by priority (common query)
-- Optimizes: SELECT * FROM roles WHERE is_active = true ORDER BY priority DESC
CREATE INDEX IF NOT EXISTS idx_roles_active_priority ON roles(is_active, priority DESC);

-- ============================================================================
-- REFRESH TOKENS TABLE INDEXES
-- ============================================================================

-- Index on user_id (foreign key, used for user token lookups)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index on token_hash (used for token validation)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Index on expires_at (used for cleanup and validation)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Composite index for active token validation
-- Optimizes: SELECT * FROM refresh_tokens WHERE token_hash = X AND is_active = true AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_valid ON refresh_tokens(token_hash, is_active, expires_at)
WHERE is_active = true;

-- ============================================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================================

-- Index on user_id (frequently queried for user activity history)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index on action (used for filtering by action type)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index on resource_type (used for filtering by resource)
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Index on created_at (used for date range queries and sorting)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for user activity queries
-- Optimizes: SELECT * FROM audit_logs WHERE user_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity ON audit_logs(user_id, created_at DESC);

-- Composite index for resource audit trail
-- Optimizes: SELECT * FROM audit_logs WHERE resource_type = X AND resource_id = Y ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_trail ON audit_logs(resource_type, resource_id, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE users;
ANALYZE roles;
ANALYZE refresh_tokens;
ANALYZE audit_logs;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Performance improvements:
-- ✅ Users: email, auth0_id, role_id, is_active, created_at
-- ✅ Roles: name, priority, is_active
-- ✅ Refresh Tokens: user_id, token_hash, expires_at
-- ✅ Audit Logs: user_id, action, resource_type, created_at
-- ✅ Composite indexes for common query patterns
-- ✅ Partial indexes for frequently filtered data
-- ✅ Statistics updated for query optimizer

COMMENT ON INDEX idx_users_email IS 'Performance index for email lookups and authentication';
COMMENT ON INDEX idx_users_auth0_id IS 'Performance index for Auth0 authentication';
COMMENT ON INDEX idx_users_role_id IS 'Performance index for role-based filtering';
COMMENT ON INDEX idx_users_active_role IS 'Composite index for active users by role queries';
COMMENT ON INDEX idx_users_active_only IS 'Partial index for active users (most common query)';
COMMENT ON INDEX idx_roles_name IS 'Performance index for role name lookups';
COMMENT ON INDEX idx_roles_priority IS 'Performance index for priority-based sorting';
COMMENT ON INDEX idx_roles_active_priority IS 'Composite index for active roles by priority';
COMMENT ON INDEX idx_refresh_tokens_valid IS 'Partial index for valid token validation';
COMMENT ON INDEX idx_audit_logs_user_activity IS 'Composite index for user activity history';
COMMENT ON INDEX idx_audit_logs_resource_trail IS 'Composite index for resource audit trails';
