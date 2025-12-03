-- Migration 006 ROLLBACK: Remove Performance Indexes
-- Description: Remove all indexes added in migration 006
-- Author: System
-- Date: 2025-11-05

-- ============================================================================
-- DROP USERS TABLE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_users_active_only;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_active_role;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_role_id;
DROP INDEX IF EXISTS idx_users_auth0_id;
DROP INDEX IF EXISTS idx_users_email;

-- ============================================================================
-- DROP ROLES TABLE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_roles_active_priority;
DROP INDEX IF EXISTS idx_roles_is_active;
DROP INDEX IF EXISTS idx_roles_priority;
DROP INDEX IF EXISTS idx_roles_name;

-- ============================================================================
-- DROP REFRESH TOKENS TABLE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_refresh_tokens_valid;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;

-- ============================================================================
-- DROP AUDIT LOGS TABLE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_logs_resource_trail;
DROP INDEX IF EXISTS idx_audit_logs_user_activity;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_user_id;

-- ============================================================================
-- ANALYZE TABLES (Update statistics after index removal)
-- ============================================================================

ANALYZE users;
ANALYZE roles;
ANALYZE refresh_tokens;
ANALYZE audit_logs;

-- Rollback complete - all performance indexes removed
