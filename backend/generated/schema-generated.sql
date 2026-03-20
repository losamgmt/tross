-- ============================================================================
-- GENERATED SCHEMA - SINGLE SOURCE OF TRUTH
-- ============================================================================
-- Generated: 2026-03-20T00:14:27.116Z
-- Command: npm run generate:schema
--
-- This file is for REVIEW. Merge changes into backend/schema.sql manually.
-- ============================================================================

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
-- Entity: customer
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    phone VARCHAR(50),
    organization_name VARCHAR(255),
    billing_line1 VARCHAR(255),
    billing_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(25) CHECK (billing_state IN ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(25) DEFAULT 'US' CHECK (billing_country IN ('US', 'CA')),
    service_line1 VARCHAR(255),
    service_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(25) CHECK (service_state IN ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(25) DEFAULT 'US' CHECK (service_country IN ('US', 'CA'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(last_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_organization_name ON customers(organization_name);

-- ============================================================================
-- CONTRACTS
-- ============================================================================
-- Entity: contract
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'terminated')),
    name VARCHAR(255),
    summary VARCHAR(255),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    start_date DATE NOT NULL,
    end_date DATE,
    terms TEXT,
    value DECIMAL(12,2),
    billing_cycle VARCHAR(25) CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually', 'one_time'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_name ON contracts(name);
CREATE INDEX IF NOT EXISTS idx_contracts_summary ON contracts(summary);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);

-- ============================================================================
-- INVENTORY
-- ============================================================================
-- Entity: inventory
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(28) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    description TEXT,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_cost DECIMAL(12,2),
    location VARCHAR(255),
    supplier VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_description ON inventory(description);

-- ============================================================================
-- PROPERTIES
-- ============================================================================
-- Entity: property
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    property_type VARCHAR(27) DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'industrial')),
    access_instructions TEXT,
    notes TEXT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(25) CHECK (address_state IN ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(25) DEFAULT 'US' CHECK (address_country IN ('US', 'CA'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_name ON properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_address_city ON properties(address_city);
CREATE INDEX IF NOT EXISTS idx_properties_address_state ON properties(address_state);

-- ============================================================================
-- PROPERTY_ROLES
-- ============================================================================
-- Entity: property_role
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(34) NOT NULL CHECK (role IN ('board_chair', 'board_member', 'property_manager', 'accountant')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    property_id INTEGER NOT NULL REFERENCES properties(id),
    effective_date DATE,
    end_date DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_roles_role ON property_roles(role);
CREATE INDEX IF NOT EXISTS idx_property_roles_customer_id ON property_roles(customer_id);
CREATE INDEX IF NOT EXISTS idx_property_roles_property_id ON property_roles(property_id);

-- ============================================================================
-- ROLES
-- ============================================================================
-- Entity: role
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    priority INTEGER NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    description TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_description ON roles(description);

-- ============================================================================
-- TECHNICIANS
-- ============================================================================
-- Entity: technician
-- ============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    availability VARCHAR(25) DEFAULT 'available' CHECK (availability IN ('available', 'on_job', 'off_duty')),
    license_number VARCHAR(100),
    hourly_rate DECIMAL(12,2),
    certifications TEXT,
    skills TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);
CREATE INDEX IF NOT EXISTS idx_technicians_first_name ON technicians(first_name);
CREATE INDEX IF NOT EXISTS idx_technicians_last_name ON technicians(last_name);
CREATE INDEX IF NOT EXISTS idx_technicians_license_number ON technicians(license_number);

-- ============================================================================
-- UNITS
-- ============================================================================
-- Entity: unit
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    unit_identifier VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    property_id INTEGER NOT NULL REFERENCES properties(id),
    ownership_type VARCHAR(25) NOT NULL CHECK (ownership_type IN ('private', 'common')),
    unit_category VARCHAR(27) CHECK (unit_category IN ('residential', 'commercial', 'amenity', 'utility', 'parking')),
    floor INTEGER,
    square_footage INTEGER,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_units_unit_identifier ON units(unit_identifier);
CREATE INDEX IF NOT EXISTS idx_units_notes ON units(notes);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

-- ============================================================================
-- ASSETS
-- ============================================================================
-- Entity: asset
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(31) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'needs_repair', 'decommissioned')),
    unit_id INTEGER NOT NULL REFERENCES units(id),
    property_id INTEGER REFERENCES properties(id),
    asset_type VARCHAR(25) NOT NULL CHECK (asset_type IN ('hvac', 'plumbing', 'electrical', 'appliance', 'other')),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    install_date DATE,
    last_service_date DATE,
    next_service_date DATE,
    warranty_expiry DATE,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
CREATE INDEX IF NOT EXISTS idx_assets_manufacturer ON assets(manufacturer);
CREATE INDEX IF NOT EXISTS idx_assets_model ON assets(model);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_unit_id ON assets(unit_id);
CREATE INDEX IF NOT EXISTS idx_assets_property_id ON assets(property_id);

-- ============================================================================
-- CUSTOMER_UNITS
-- ============================================================================
-- Entity: customer_unit
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_units (
    id SERIAL PRIMARY KEY,
    role VARCHAR(39) DEFAULT 'owner' CHECK (role IN ('owner', 'authorized_occupant')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    unit_id INTEGER NOT NULL REFERENCES units(id),
    effective_date DATE,
    end_date DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_units_role ON customer_units(role);
CREATE INDEX IF NOT EXISTS idx_customer_units_customer_id ON customer_units(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_units_unit_id ON customer_units(unit_id);

-- ============================================================================
-- USERS
-- ============================================================================
-- Entity: user
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    auth0_id VARCHAR(255),
    role_id INTEGER REFERENCES roles(id),
    customer_profile_id INTEGER REFERENCES customers(id),
    technician_profile_id INTEGER REFERENCES technicians(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_profile_id ON users(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_users_technician_profile_id ON users(technician_profile_id);

-- ============================================================================
-- AUDIT_LOGS
-- ============================================================================
-- Entity: audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    result VARCHAR(20),
    error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================
-- Entity: department
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    manager_id INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_description ON departments(description);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);

-- ============================================================================
-- FILE_ATTACHMENTS
-- ============================================================================
-- Entity: file_attachment
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'attachment',
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_original_filename ON file_attachments(original_filename);
CREATE INDEX IF NOT EXISTS idx_file_attachments_description ON file_attachments(description);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
-- Entity: notification
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT,
    type VARCHAR(25) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'reminder')),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_title ON notifications(title);
CREATE INDEX IF NOT EXISTS idx_notifications_body ON notifications(body);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================================
-- PREFERENCES
-- ============================================================================
-- Entity: preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    theme VARCHAR(25) DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    density VARCHAR(27) DEFAULT 'comfortable' CHECK (density IN ('compact', 'standard', 'comfortable')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    items_per_page INTEGER DEFAULT 25,
    notification_retention_days INTEGER DEFAULT 30,
    auto_refresh_interval INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preferences_id ON preferences(id);

-- ============================================================================
-- SAVED_VIEWS
-- ============================================================================
-- Entity: saved_view
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_views (
    id SERIAL PRIMARY KEY,
    view_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    entity_name VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_view_name ON saved_views(view_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);

-- ============================================================================
-- VENDORS
-- ============================================================================
-- Entity: vendor
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_contact_email ON vendors(contact_email);

-- ============================================================================
-- WORK_ORDERS
-- ============================================================================
-- Entity: work_order
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(27) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    name VARCHAR(255),
    summary VARCHAR(255),
    priority VARCHAR(25) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    property_id INTEGER REFERENCES properties(id),
    unit_id INTEGER REFERENCES units(id),
    assigned_technician_id INTEGER REFERENCES technicians(id),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    location_line1 VARCHAR(255),
    location_line2 VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(25) CHECK (location_state IN ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
    location_postal_code VARCHAR(20),
    location_country VARCHAR(25) DEFAULT 'US' CHECK (location_country IN ('US', 'CA'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_number ON work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_name ON work_orders(name);
CREATE INDEX IF NOT EXISTS idx_work_orders_summary ON work_orders(summary);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_unit_id ON work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_technician_id ON work_orders(assigned_technician_id);

-- ============================================================================
-- INVOICES
-- ============================================================================
-- Entity: invoice
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void')),
    name VARCHAR(255),
    summary VARCHAR(255),
    work_order_id INTEGER REFERENCES work_orders(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    amount DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    due_date DATE,
    paid_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_name ON invoices(name);
CREATE INDEX IF NOT EXISTS idx_invoices_summary ON invoices(summary);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order_id ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
