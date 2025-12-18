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
-- Contract compliance: ✓ FULL (TIER 1 + TIER 2)
--
-- Identity field: name
-- Soft deletes: is_active
-- Lifecycle: status (active, disabled)
-- Audit: audit_logs table (created_by/updated_by removed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    -- TIER 1: Contract required fields
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Lifecycle status
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'disabled')),
    
    -- Entity-specific fields
    description TEXT,
    priority INTEGER NOT NULL CHECK (priority > 0)
);

-- Performance index on status for filtered queries
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);

-- Insert the 5 core roles (idempotent)
-- Hierarchy: admin(5) > manager(4) > dispatcher(3) > technician(2) > customer(1)
INSERT INTO roles (name, description, priority, status) VALUES 
('admin', 'Full system access and user management', 5, 'active'),
('manager', 'Full data access, manages work orders and technicians', 4, 'active'),  
('dispatcher', 'Medium access, assigns and schedules work orders', 3, 'active'),
('technician', 'Limited access, updates assigned work orders', 2, 'active'),
('customer', 'Basic access, submits and tracks service requests', 1, 'active')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status;

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
-- USER PREFERENCES TABLE
-- ============================================================================
-- Business entity: User preferences storage (1:1 relationship with users)
-- Contract compliance: ✓ SIMPLIFIED (no lifecycle states needed)
--
-- Design rationale:
--   - SHARED PRIMARY KEY pattern: id = users.id (true 1:1 identifying relationship)
--   - Uses JSONB for flexible preference storage (schema-on-read)
--   - CASCADE delete when user is deleted
--   - Trigger-managed updated_at for consistency
--
-- Initial preference keys:
--   - theme: 'system' | 'light' | 'dark'
--   - notificationsEnabled: boolean
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    -- Primary key = users.id (shared PK pattern for 1:1)
    -- NOT SERIAL - id is provided, not auto-generated
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preferences storage (JSONB for flexibility)
    preferences JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps (TIER 1 compliance)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
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

-- User preferences indexes (user_id already has UNIQUE constraint which creates implicit index)
-- No additional indexes needed - UNIQUE constraint handles fast lookups

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

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
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
-- WORK ORDER SYSTEM TABLES (Added: 2025-11-13)
-- ============================================================================
-- Run migration 008 to create these tables:
--   cat migrations/008_add_work_order_schema.sql | docker exec -i trossapp-postgres psql -U postgres -d trossapp_dev
--
-- Tables added:
--   - customers (polymorphic profile for role_id=5)
--   - technicians (polymorphic profile for role_id=2)
--   - work_orders (core business entity)
--   - invoices (billing)
--   - contracts (service agreements)
--   - inventory (parts/supplies)
--
-- Users table updated with polymorphic profile links:
--   - customer_profile_id → customers(id)
--   - technician_profile_id → technicians(id)
--
-- See: migrations/008_add_work_order_schema.sql for full schema
-- ============================================================================

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
-- Business entity: Customer profiles (polymorphic profile for role_id=5)
-- Contract compliance: ✓ FULL
--
-- Identity field: email
-- Soft deletes: is_active
-- Lifecycle states: status (pending → active → suspended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended')),
    
    -- Entity-specific data fields
    phone VARCHAR(50),
    company_name VARCHAR(255),
    billing_address JSONB,  -- { street, city, state, zip, country }
    service_address JSONB   -- { street, city, state, zip, country }
);

-- ============================================================================
-- TECHNICIANS TABLE
-- ============================================================================
-- Business entity: Technician profiles (polymorphic profile for role_id=2)
-- Contract compliance: ✓ FULL
--
-- Identity field: license_number
-- Soft deletes: is_active
-- Lifecycle states: status (available → on_job → off_duty → suspended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    license_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'available'
        CHECK (status IN ('available', 'on_job', 'off_duty', 'suspended')),
    
    -- Entity-specific data fields
    certifications JSONB,  -- [{ name, issued_by, expires_at }]
    skills JSONB,          -- ['plumbing', 'electrical', 'hvac']
    hourly_rate DECIMAL(10, 2)
);

-- ============================================================================
-- WORK_ORDERS TABLE
-- ============================================================================
-- Business entity: Service work orders
-- Contract compliance: ✓ FULL
--
-- Identity field: title
-- Soft deletes: is_active
-- Lifecycle states: status (pending → assigned → in_progress → completed → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    
    -- Entity-specific data fields
    description TEXT,
    priority VARCHAR(50) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Relationships
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    assigned_technician_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
    
    -- Scheduling
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Business entity: Billing invoices
-- Contract compliance: ✓ FULL
--
-- Identity field: invoice_number
-- Soft deletes: is_active
-- Lifecycle states: status (draft → sent → paid → overdue → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Entity-specific data fields
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Financial data
    amount DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Payment tracking
    due_date DATE,
    paid_at TIMESTAMP
);

-- ============================================================================
-- CONTRACTS TABLE
-- ============================================================================
-- Business entity: Service contracts
-- Contract compliance: ✓ FULL
--
-- Identity field: contract_number
-- Soft deletes: is_active
-- Lifecycle states: status (draft → active → expired → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
    
    -- Entity-specific data fields
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Contract details
    start_date DATE NOT NULL,
    end_date DATE,
    terms TEXT,
    value DECIMAL(10, 2),
    billing_cycle VARCHAR(50)
        CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually', 'one_time'))
);

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================
-- Business entity: Parts and supplies inventory
-- Contract compliance: ✓ FULL
--
-- Identity field: name
-- Soft deletes: is_active
-- Lifecycle states: status (in_stock → low_stock → out_of_stock → discontinued)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,  -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'in_stock'
        CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    
    -- Entity-specific data fields
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Inventory management
    quantity INTEGER DEFAULT 0 NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    unit_cost DECIMAL(10, 2),
    
    -- Warehouse details
    location VARCHAR(255),
    supplier VARCHAR(255)
);

-- ============================================================================
-- USERS TABLE UPDATE - POLYMORPHIC PROFILE LINKS
-- ============================================================================
-- Add foreign keys to link users to their specific profile types
-- - role_id=5 (customer) → customer_profile_id populated
-- - role_id=2 (technician) → technician_profile_id populated
-- - Other roles (admin, manager, dispatcher) → both NULL
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS customer_profile_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS technician_profile_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);

-- Technicians indexes
CREATE INDEX IF NOT EXISTS idx_technicians_license ON technicians(license_number);
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_created ON technicians(created_at DESC);

-- Work orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_active ON work_orders(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_created ON work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled ON work_orders(scheduled_start);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_active ON invoices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created ON contracts(created_at DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory(created_at DESC);

-- Users polymorphic profile indexes
CREATE INDEX IF NOT EXISTS idx_users_customer_profile ON users(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_users_technician_profile ON users(technician_profile_id);

-- ============================================================================
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- ============================================================================
-- Apply updated_at trigger to all new tables

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians;
CREATE TRIGGER update_technicians_updated_at
    BEFORE UPDATE ON technicians
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
--   customers  | t         | NULL
--   technicians| t         | NULL
--   work_orders| t         | NULL
--   invoices   | t         | NULL
--   contracts  | t         | NULL
--   inventory  | t         | NULL
-- ============================================================================
