-- ============================================================================
-- TROSSAPP DATABASE SCHEMA
-- ============================================================================
-- IDEMPOTENT: Safe to run multiple times
-- VERSION: 3.0
-- LAST UPDATED: 2025-12-20
--
-- PRE-PRODUCTION MODE: Full reset on each deploy
-- When going live, remove the DROP TABLE section below
--
-- ENTITY CATEGORIES:
--   HUMAN (user, customer, technician): first_name + last_name, email identity
--   SIMPLE (role, inventory): name field, unique identifier (priority/sku)
--   COMPUTED (work_order, invoice, contract): auto-generated identifier, computed name
-- ============================================================================

-- ============================================================================
-- PRE-PRODUCTION: DROP ALL TABLES FOR CLEAN RESET
-- Remove this section when you have production data to preserve
-- ============================================================================
DROP TABLE IF EXISTS file_attachments CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS entity_settings CASCADE;  -- Legacy table cleanup
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS saved_views CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
-- Business entity: System roles for RBAC
-- Category: SIMPLE (name field, priority as identity)
-- Contract compliance: ✓ FULL (TIER 1 + TIER 2)
--
-- Identity field: priority (unique role hierarchy position)
-- Human-readable: name
-- Soft deletes: is_active
-- Lifecycle: status (active, disabled)
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
    priority INTEGER UNIQUE NOT NULL CHECK (priority > 0)  -- Identity field (unique)
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
-- Category: HUMAN (first_name + last_name, email identity)
-- Contract compliance: ✓ FULL
--
-- Identity field: email
-- Human-readable: fullName (computed from first_name + last_name)
-- Soft deletes: is_active (TIER 1 - universal)
-- Lifecycle states: status (TIER 2 - pending_activation → active → suspended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    -- SSOT: Must match Customer and Technician status values
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended')),
    
    -- HUMAN entity name fields
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Entity-specific data fields
    auth0_id VARCHAR(255) UNIQUE,  -- Nullable for pending_activation users
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL
);

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
--   - FLAT FIELDS for type safety (no JSONB - per field type standards)
--   - CASCADE delete when user is deleted
--   - Trigger-managed updated_at for consistency
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferences (
    -- Primary key = users.id (shared PK pattern for 1:1)
    -- NOT SERIAL - id is provided, not auto-generated
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- UI Theme preference
    theme VARCHAR(20) NOT NULL DEFAULT 'system'
        CHECK (theme IN ('system', 'light', 'dark')),
    
    -- Table display density
    density VARCHAR(20) NOT NULL DEFAULT 'comfortable'
        CHECK (density IN ('compact', 'standard', 'comfortable')),
    
    -- Notification preference
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Default page size for tables
    items_per_page INTEGER NOT NULL DEFAULT 25
        CHECK (items_per_page IN (10, 25, 50, 100)),
    
    -- Notification retention (days to keep)
    notification_retention_days INTEGER NOT NULL DEFAULT 30
        CHECK (notification_retention_days BETWEEN 1 AND 365),
    
    -- Auto-refresh interval (seconds, 0 = disabled)
    auto_refresh_interval INTEGER NOT NULL DEFAULT 0
        CHECK (auto_refresh_interval BETWEEN 0 AND 300),
    
    -- Timestamps (TIER 1 compliance)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- USER SAVED VIEWS TABLE
-- ============================================================================
-- Stores user's saved table views (filters, columns, sort, density)
-- RLS: Each user can only see their own views (user_id filter)
-- Category: N/A (system table, not a business entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_views (
    id SERIAL PRIMARY KEY,
    
    -- Owner of this saved view (RLS filter field)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Which entity this view applies to (e.g., 'work_order', 'customer')
    entity_name VARCHAR(50) NOT NULL,
    
    -- User-defined name for this view (e.g., "My Pending Orders")
    view_name VARCHAR(100) NOT NULL,
    
    -- View configuration as JSONB
    -- Structure: {
    --   hiddenColumns: string[],
    --   density: 'compact'|'standard'|'comfortable',
    --   filters: { [field]: value },
    --   sort: { field: string, direction: 'asc'|'desc' }
    -- }
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Whether this is the default view for this entity
    is_default BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Each user can only have one view with a given name per entity
    CONSTRAINT unique_user_entity_view_name UNIQUE (user_id, entity_name, view_name)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- User notifications for the notification tray (bell icon)
-- RLS: Each user can only see their own notifications (user_id filter)
-- Category: N/A (system table, not a business entity)
--
-- Pattern: Per-user data (same as saved_views)
-- Backend creates notifications; users only read/mark-read/delete
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    
    -- Recipient (FK to users, RLS filter field)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    body TEXT,
    
    -- Type for UI styling (info, success, warning, error, assignment, reminder)
    type VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'reminder')),
    
    -- Optional link to related entity for navigation on click
    resource_type VARCHAR(50),  -- e.g., 'work_order', 'invoice', 'customer'
    resource_id INTEGER,
    
    -- Read status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FILE ATTACHMENTS TABLE
-- ============================================================================
-- System table for storing file metadata (actual files in Cloudflare R2)
-- Polymorphic attachment: can be attached to any entity type
-- Category: N/A (system table, not a business entity)
--
-- Design notes:
--   - Files stored in R2 with storage_key as the path
--   - Metadata stored here for querying/permissions
--   - Polymorphic: entity_type + entity_id links to any table
--   - Soft delete: is_active flag
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
    id SERIAL PRIMARY KEY,
    
    -- What entity this file is attached to (polymorphic)
    entity_type VARCHAR(50) NOT NULL,    -- 'work_order', 'customer', 'technician', etc.
    entity_id INTEGER NOT NULL,          -- ID of the parent entity
    
    -- File metadata
    original_filename VARCHAR(255) NOT NULL,  -- Original name uploaded by user
    storage_key VARCHAR(500) NOT NULL UNIQUE, -- Path in R2: {entity_type}/{entity_id}/{uuid}.{ext}
    mime_type VARCHAR(100) NOT NULL,          -- e.g., 'image/jpeg', 'application/pdf'
    file_size INTEGER NOT NULL,               -- Size in bytes
    
    -- Optional categorization
    category VARCHAR(50) DEFAULT 'attachment', -- 'photo', 'document', 'receipt', etc.
    description TEXT,                          -- User-provided description
    
    -- Upload tracking
    uploaded_by INTEGER REFERENCES users(id),
    
    -- Soft delete and timestamps
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- File attachments indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_active ON file_attachments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(entity_type, category);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created ON file_attachments(created_at DESC);

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

-- User saved views indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_user_entity ON saved_views(user_id, entity_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_default ON saved_views(user_id, entity_name, is_default) WHERE is_default = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

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

DROP TRIGGER IF EXISTS update_preferences_updated_at ON preferences;
CREATE TRIGGER update_preferences_updated_at
    BEFORE UPDATE ON preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_views_updated_at ON saved_views;
CREATE TRIGGER update_saved_views_updated_at
    BEFORE UPDATE ON saved_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set read_at when is_read changes to true
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = CURRENT_TIMESTAMP;
    ELSIF NEW.is_read = FALSE THEN
        NEW.read_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_read_at ON notifications;
CREATE TRIGGER trigger_notification_read_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION set_notification_read_at();

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
-- Category: HUMAN (first_name + last_name, email identity)
-- Contract compliance: ✓ FULL
--
-- Identity field: email
-- Human-readable: fullName (computed from first_name + last_name)
-- Soft deletes: is_active
-- Lifecycle states: status (pending → active → suspended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended')),
    
    -- HUMAN entity name fields
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Entity-specific data fields
    phone VARCHAR(50),
    organization_name VARCHAR(255),  -- Optional company/org they represent
    
    -- Billing Address (flat fields per field-type-standards)
    billing_line1 VARCHAR(255),
    billing_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(10),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2) DEFAULT 'US',
    
    -- Service Address (flat fields per field-type-standards)
    service_line1 VARCHAR(255),
    service_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(10),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(2) DEFAULT 'US'
);

-- ============================================================================
-- TECHNICIANS TABLE
-- ============================================================================
-- Business entity: Technician profiles (polymorphic profile for role_id=2)
-- Category: HUMAN (first_name + last_name, email identity)
-- Contract compliance: ✓ FULL
--
-- Identity field: email
-- Human-readable: fullName (computed from first_name + last_name)
-- Soft deletes: is_active
-- Lifecycle states: status (available → on_job → off_duty → suspended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    -- SSOT: Must match User and Customer status values
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended')),
    
    -- Operational availability (separate from lifecycle status)
    availability VARCHAR(50) DEFAULT 'available'
        CHECK (availability IN ('available', 'on_job', 'off_duty')),
    
    -- HUMAN entity name fields
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Entity-specific data fields
    license_number VARCHAR(100),  -- Informational, not identity
    hourly_rate DECIMAL(10, 2),
    
    -- Skills and certifications as comma-separated text
    -- Simple MVP approach - can migrate to junction tables later if needed
    certifications TEXT,  -- e.g., "EPA 608, NATE HVAC, Master Plumber"
    skills TEXT           -- e.g., "plumbing, electrical, hvac"
);

-- ============================================================================
-- WORK_ORDERS TABLE
-- ============================================================================
-- Business entity: Service work orders
-- Category: COMPUTED (auto-generated identifier, computed name)
-- Contract compliance: ✓ FULL
--
-- Identity field: work_order_number (auto-generated: WO-YYYY-NNNN)
-- Human-readable: name (computed, aliased as "Title" in UI)
-- Computed name template: "{customer.fullName}: {summary}: {work_order_number}"
-- Soft deletes: is_active
-- Lifecycle states: status (pending → assigned → in_progress → completed → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field (auto-generated)
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    
    -- COMPUTED entity name field (aliased as "Title" in UI)
    name VARCHAR(255) NOT NULL,  -- Computed: "{customer}: {summary}: {work_order_number}"
    summary VARCHAR(255),        -- Brief description: "fix kitchen sink", "replace door"
    
    -- Entity-specific data fields
    priority VARCHAR(50) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Relationships
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    assigned_technician_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
    
    -- Location Address (where work is performed - flat fields per field-type-standards)
    location_line1 VARCHAR(255),
    location_line2 VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(10),
    location_postal_code VARCHAR(20),
    location_country VARCHAR(2) DEFAULT 'US',
    
    -- Scheduling
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Business entity: Billing invoices
-- Category: COMPUTED (auto-generated identifier, computed name)
-- Contract compliance: ✓ FULL
--
-- Identity field: invoice_number (auto-generated: INV-YYYY-NNNN)
-- Human-readable: name (computed)
-- Computed name template: "{customer.fullName}: {summary}: {invoice_number}"
-- Soft deletes: is_active
-- Lifecycle states: status (draft → sent → paid → overdue → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field (auto-generated)
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void')),
    
    -- COMPUTED entity name field
    name VARCHAR(255),  -- Computed: "{customer}: {summary}: {invoice_number}"
    summary VARCHAR(255),  -- Brief description of invoiced work
    
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
-- Category: COMPUTED (auto-generated identifier, computed name)
-- Contract compliance: ✓ FULL
--
-- Identity field: contract_number (auto-generated: CTR-YYYY-NNNN)
-- Human-readable: name (computed)
-- Computed name template: "{customer.fullName}: {summary}: {contract_number}"
-- Soft deletes: is_active
-- Lifecycle states: status (draft → active → expired → cancelled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,  -- Identity field (auto-generated)
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'terminated')),
    
    -- COMPUTED entity name field
    name VARCHAR(255),  -- Computed: "{customer}: {summary}: {contract_number}"
    summary VARCHAR(255),  -- Brief description: "annual maintenance", "HVAC service agreement"
    
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
-- Category: SIMPLE (name field, sku as identity)
-- Contract compliance: ✓ FULL
--
-- Identity field: sku (unique stock keeping unit)
-- Human-readable: name (multiple items can share same name, distinguished by sku)
-- Soft deletes: is_active
-- Lifecycle states: status (in_stock → low_stock → out_of_stock → discontinued)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
    -- TIER 1: Universal Entity Contract Fields
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,  -- Identity field
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- TIER 2: Entity-Specific Lifecycle Field
    status VARCHAR(50) DEFAULT 'in_stock'
        CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    
    -- SIMPLE entity name field
    name VARCHAR(255) NOT NULL,  -- Human-readable (e.g., "Hammer", "Wrench")
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
CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_name);

-- Technicians indexes
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_created ON technicians(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_technicians_license ON technicians(license_number);

-- Work orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number);
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
-- SYSTEM SETTINGS TABLE
-- ============================================================================
-- Key-value store for system-wide configuration
-- Used for: maintenance mode, feature flags, system preferences
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

-- Seed default settings
INSERT INTO system_settings (key, value, description) VALUES 
(
    'maintenance_mode',
    '{"enabled": false, "message": "System is under maintenance. Please try again later.", "allowed_roles": ["admin"], "estimated_end": null}',
    'Controls system-wide maintenance mode. When enabled, only allowed_roles can access the system.'
),
(
    'feature_flags',
    '{"dark_mode": true, "file_attachments": true, "audit_logging": true}',
    'Feature flags for enabling/disabling system features.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================================
-- NOTE: These must come AFTER all tables are created

COMMENT ON TABLE roles IS 'System roles for RBAC - SIMPLE entity (priority=identity, name=display)';
COMMENT ON TABLE users IS 'Application users - HUMAN entity (email=identity, first_name+last_name=display)';
COMMENT ON TABLE customers IS 'Customer profiles - HUMAN entity (email=identity, first_name+last_name=display)';
COMMENT ON TABLE technicians IS 'Technician profiles - HUMAN entity (email=identity, first_name+last_name=display)';
COMMENT ON TABLE work_orders IS 'Service work orders - COMPUTED entity (work_order_number=identity, name=computed display)';
COMMENT ON TABLE invoices IS 'Billing invoices - COMPUTED entity (invoice_number=identity, name=computed display)';
COMMENT ON TABLE contracts IS 'Service contracts - COMPUTED entity (contract_number=identity, name=computed display)';
COMMENT ON TABLE inventory IS 'Parts and supplies - SIMPLE entity (sku=identity, name=display)';
COMMENT ON TABLE audit_logs IS 'Complete audit trail - source of truth for who/when/what changed';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for authentication';

-- Roles columns
COMMENT ON COLUMN roles.id IS 'Unique identifier';
COMMENT ON COLUMN roles.name IS 'Human-readable role name (admin, manager, etc)';
COMMENT ON COLUMN roles.priority IS 'Identity field - role hierarchy (1-5, higher = more permissions)';
COMMENT ON COLUMN roles.is_active IS 'Soft delete flag (true=active, false=deleted)';
COMMENT ON COLUMN roles.created_at IS 'Creation timestamp';
COMMENT ON COLUMN roles.updated_at IS 'Last update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN roles.description IS 'Human-readable role description';

-- Users columns
COMMENT ON COLUMN users.id IS 'Unique identifier';
COMMENT ON COLUMN users.email IS 'Identity field - user email address';
COMMENT ON COLUMN users.first_name IS 'User first name (for fullName display)';
COMMENT ON COLUMN users.last_name IS 'User last name (for fullName display)';
COMMENT ON COLUMN users.is_active IS 'Soft delete flag (true=active, false=deleted)';
COMMENT ON COLUMN users.created_at IS 'Creation timestamp';
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
--   customers  | t         | NULL
--   technicians| t         | NULL
--   work_orders| t         | NULL
--   invoices   | t         | NULL
--   contracts  | t         | NULL
--   inventory  | t         | NULL
-- ============================================================================
