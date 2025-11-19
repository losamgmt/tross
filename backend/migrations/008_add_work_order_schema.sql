-- Migration: 008
-- Description: Add work order system tables (customers, technicians, work_orders, invoices, contracts, inventory)
-- Author: System
-- Date: 2025-11-13
-- Reversible: Yes (see rollback section at bottom)

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
-- TABLE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE customers IS 'Customer profiles - polymorphic profile for users with role_id=5 (customer)';
COMMENT ON TABLE technicians IS 'Technician profiles - polymorphic profile for users with role_id=2 (technician)';
COMMENT ON TABLE work_orders IS 'Service work orders - core business entity';
COMMENT ON TABLE invoices IS 'Billing invoices linked to work orders';
COMMENT ON TABLE contracts IS 'Service contracts with customers';
COMMENT ON TABLE inventory IS 'Parts and supplies inventory management';

COMMENT ON COLUMN users.customer_profile_id IS 'Foreign key to customers table (populated for role_id=5)';
COMMENT ON COLUMN users.technician_profile_id IS 'Foreign key to technicians table (populated for role_id=2)';

-- ============================================================================
-- ROLLBACK SCRIPT (for reference - do not execute)
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
-- DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
-- DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
-- DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
-- DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians;
-- DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
--
-- ALTER TABLE users DROP COLUMN IF EXISTS technician_profile_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS customer_profile_id;
--
-- DROP TABLE IF EXISTS inventory CASCADE;
-- DROP TABLE IF EXISTS contracts CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS work_orders CASCADE;
-- DROP TABLE IF EXISTS technicians CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- ============================================================================
