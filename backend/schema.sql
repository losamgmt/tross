-- ============================================================================
-- TROSS DATABASE SCHEMA
-- ============================================================================
-- AUTO-GENERATED from entity metadata via npm run compose:schema
-- DO NOT EDIT MANUALLY - Changes will be overwritten
--
-- Source of Truth: backend/config/models/*-metadata.js
-- Regenerate: npm run compose:schema
--
-- PRE-PRODUCTION MODE: Full reset on each deploy
-- When going live, modify compose-schema.js to skip DROP section
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PRE-PRODUCTION: DROP ALL TABLES FOR CLEAN RESET
-- Remove this section when you have production data to preserve
-- ============================================================================
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS visit_technicians CASCADE;
DROP TABLE IF EXISTS visit_subcontractors CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS subcontractors CASCADE;
DROP TABLE IF EXISTS service_templates CASCADE;
DROP TABLE IF EXISTS service_agreements CASCADE;
DROP TABLE IF EXISTS service_agreement_items CASCADE;
DROP TABLE IF EXISTS saved_views CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS property_roles CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS file_attachments CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS customer_units CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;


-- ============================================================================
-- Entity: approval_request
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
    target_entity VARCHAR(31) NOT NULL CHECK (target_entity IN ('recommendation', 'quote', 'purchase_order')),
    target_id VARCHAR(255) NOT NULL,
    target_field VARCHAR(100) NOT NULL,
    previous_value JSON,
    proposed_value JSON NOT NULL,
    approver_role VARCHAR(25) NOT NULL CHECK (approver_role IN ('customer', 'technician', 'dispatcher', 'manager', 'admin')),
    decision_notes TEXT,
    decided_at TIMESTAMPTZ,
    requested_by INTEGER NOT NULL,
    approved_by INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_request_number ON approval_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approved_by ON approval_requests(approved_by);

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
    unit_id INTEGER NOT NULL,
    property_id INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_assets_unit_id ON assets(unit_id);
CREATE INDEX IF NOT EXISTS idx_assets_property_id ON assets(property_id);

-- ============================================================================
-- AUDIT_LOGS
-- ============================================================================
-- Entity: audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    action VARCHAR(50),
    resource_type VARCHAR(100),
    resource_id INTEGER,
    user_id INTEGER,
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
-- CONTRACTS
-- ============================================================================
-- Entity: contract
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'terminated')),
    name VARCHAR(255),
    summary VARCHAR(255),
    customer_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    terms TEXT,
    value DECIMAL(12,2),
    billing_cycle VARCHAR(25) CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually', 'one_time'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);

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
    customer_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    effective_date DATE,
    end_date DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_units_role ON customer_units(role);
CREATE INDEX IF NOT EXISTS idx_customer_units_customer_id ON customer_units(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_units_unit_id ON customer_units(unit_id);

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
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
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
    manager_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
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
    uploaded_by INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_original_filename ON file_attachments(original_filename);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);

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

-- ============================================================================
-- INVOICES
-- ============================================================================
-- Entity: invoice
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void')),
    name VARCHAR(255),
    summary VARCHAR(255),
    customer_id INTEGER NOT NULL,
    work_order_id INTEGER,
    amount DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    due_date DATE,
    paid_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order_id ON invoices(work_order_id);

-- ============================================================================
-- MAINTENANCE_SCHEDULES
-- ============================================================================
-- Entity: maintenance_schedule
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id SERIAL PRIMARY KEY,
    schedule_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    frequency VARCHAR(28) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually')),
    frequency_interval INTEGER DEFAULT 1,
    next_due_date DATE NOT NULL,
    last_generated_date DATE,
    notes TEXT,
    customer_id INTEGER NOT NULL,
    asset_id INTEGER,
    service_template_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_schedule_number ON maintenance_schedules(schedule_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_customer_id ON maintenance_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_service_template_id ON maintenance_schedules(service_template_id);

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
    user_id INTEGER NOT NULL,
    body TEXT,
    type VARCHAR(25) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'assignment', 'reminder')),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_title ON notifications(title);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
-- Entity: payment
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other')),
    reference_number VARCHAR(50),
    notes TEXT,
    customer_id INTEGER NOT NULL,
    invoice_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- ============================================================================
-- PREFERENCES
-- ============================================================================
-- Entity: preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    theme VARCHAR(25) DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    density VARCHAR(27) DEFAULT 'comfortable' CHECK (density IN ('compact', 'standard', 'comfortable')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    notification_retention_days INTEGER DEFAULT 30,
    items_per_page INTEGER DEFAULT 25,
    auto_refresh_interval INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preferences_id ON preferences(id);

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
    customer_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    effective_date DATE,
    end_date DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_roles_role ON property_roles(role);
CREATE INDEX IF NOT EXISTS idx_property_roles_customer_id ON property_roles(customer_id);
CREATE INDEX IF NOT EXISTS idx_property_roles_property_id ON property_roles(property_id);

-- ============================================================================
-- PURCHASE_ORDERS
-- ============================================================================
-- Entity: purchase_order
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'received', 'cancelled')),
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2),
    notes TEXT,
    vendor_id INTEGER NOT NULL,
    work_order_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_work_order_id ON purchase_orders(work_order_id);

-- ============================================================================
-- QUOTES
-- ============================================================================
-- Entity: quote
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')),
    description TEXT,
    notes TEXT,
    valid_until DATE,
    total_amount DECIMAL(10,2),
    customer_id INTEGER NOT NULL,
    property_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_property_id ON quotes(property_id);

-- ============================================================================
-- RECEIPTS
-- ============================================================================
-- Entity: receipt
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'approved', 'rejected', 'invoiced')),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    receipt_date DATE,
    notes TEXT,
    work_order_id INTEGER,
    purchase_order_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_work_order_id ON receipts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_purchase_order_id ON receipts(purchase_order_id);

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
-- Entity: recommendation
-- ============================================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    recommendation_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'approved', 'rejected', 'converted', 'cancelled')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(25) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notes TEXT,
    customer_id INTEGER NOT NULL,
    asset_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_recommendation_number ON recommendations(recommendation_number);
CREATE INDEX IF NOT EXISTS idx_recommendations_customer_id ON recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_asset_id ON recommendations(asset_id);

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
    user_id INTEGER NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_view_name ON saved_views(view_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);

-- ============================================================================
-- SERVICE_AGREEMENT_ITEMS
-- ============================================================================
-- Entity: service_agreement_item
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_agreement_items (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    service_agreement_id INTEGER NOT NULL,
    service_template_id INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_agreement_items_service_agreement_id ON service_agreement_items(service_agreement_id);
CREATE INDEX IF NOT EXISTS idx_service_agreement_items_service_template_id ON service_agreement_items(service_template_id);

-- ============================================================================
-- SERVICE_AGREEMENTS
-- ============================================================================
-- Entity: service_agreement
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_agreements (
    id SERIAL PRIMARY KEY,
    agreement_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'expired', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renewal BOOLEAN DEFAULT FALSE,
    notes TEXT,
    customer_id INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_agreements_agreement_number ON service_agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_service_agreements_customer_id ON service_agreements(customer_id);

-- ============================================================================
-- SERVICE_TEMPLATES
-- ============================================================================
-- Entity: service_template
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_templates (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    estimated_duration INTEGER,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_templates_name ON service_templates(name);

-- ============================================================================
-- SUBCONTRACTORS
-- ============================================================================
-- Entity: subcontractor
-- ============================================================================
CREATE TABLE IF NOT EXISTS subcontractors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    contact_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subcontractors_company_name ON subcontractors(company_name);

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
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    availability VARCHAR(25) DEFAULT 'available' CHECK (availability IN ('available', 'on_job', 'off_duty')),
    license_number VARCHAR(100),
    hourly_rate DECIMAL(12,2),
    certifications TEXT,
    skills TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);

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
    property_id INTEGER NOT NULL,
    ownership_type VARCHAR(25) NOT NULL CHECK (ownership_type IN ('private', 'common')),
    unit_category VARCHAR(27) CHECK (unit_category IN ('residential', 'commercial', 'amenity', 'utility', 'parking')),
    floor INTEGER,
    square_footage INTEGER,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_units_unit_identifier ON units(unit_identifier);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

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
    status VARCHAR(25) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    auth0_id VARCHAR(255),
    role_id INTEGER,
    customer_profile_id INTEGER,
    technician_profile_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_profile_id ON users(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_users_technician_profile_id ON users(technician_profile_id);

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

-- ============================================================================
-- VISIT_SUBCONTRACTORS
-- ============================================================================
-- Entity: visit_subcontractor
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_subcontractors (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    visit_id INTEGER NOT NULL,
    subcontractor_id INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_subcontractors_visit_id ON visit_subcontractors(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_subcontractors_subcontractor_id ON visit_subcontractors(subcontractor_id);

-- ============================================================================
-- VISIT_TECHNICIANS
-- ============================================================================
-- Entity: visit_technician
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_technicians (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    visit_id INTEGER NOT NULL,
    technician_id INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_technicians_visit_id ON visit_technicians(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_technicians_technician_id ON visit_technicians(technician_id);

-- ============================================================================
-- VISITS
-- ============================================================================
-- Entity: visit
-- ============================================================================
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    visit_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(27) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    notes TEXT,
    work_order_id INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visits_visit_number ON visits(visit_number);
CREATE INDEX IF NOT EXISTS idx_visits_work_order_id ON visits(work_order_id);

-- ============================================================================
-- WORK_ORDERS
-- ============================================================================
-- Entity: work_order
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(27) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    name VARCHAR(255),
    summary VARCHAR(255),
    priority VARCHAR(25) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    customer_id INTEGER NOT NULL,
    property_id INTEGER,
    unit_id INTEGER,
    assigned_technician_id INTEGER,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    service_region VARCHAR(25) CHECK (service_region IN ('north', 'south', 'east', 'west')),
    location_line1 VARCHAR(255),
    location_line2 VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(25) CHECK (location_state IN ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
    location_postal_code VARCHAR(20),
    location_country VARCHAR(25) DEFAULT 'US' CHECK (location_country IN ('US', 'CA')),
    origin_type VARCHAR(40) DEFAULT 'direct' CHECK (origin_type IN ('direct', 'quote', 'recommendation', 'maintenance_schedule')),
    origin_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_number ON work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_unit_id ON work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_technician_id ON work_orders(assigned_technician_id);
-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (deferred to avoid forward reference issues)
-- ============================================================================
ALTER TABLE approval_requests ADD CONSTRAINT fk_approval_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE approval_requests ADD CONSTRAINT fk_approval_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE assets ADD CONSTRAINT fk_assets_unit_id FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE assets ADD CONSTRAINT fk_assets_property_id FOREIGN KEY (property_id) REFERENCES properties(id);
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_units ADD CONSTRAINT fk_customer_units_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_units ADD CONSTRAINT fk_customer_units_unit_id FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager_id FOREIGN KEY (manager_id) REFERENCES users(id);
ALTER TABLE file_attachments ADD CONSTRAINT fk_file_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id);
ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_maintenance_schedules_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_maintenance_schedules_asset_id FOREIGN KEY (asset_id) REFERENCES assets(id);
ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_maintenance_schedules_service_template_id FOREIGN KEY (service_template_id) REFERENCES service_templates(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id);
ALTER TABLE preferences ADD CONSTRAINT fk_preferences_id FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE property_roles ADD CONSTRAINT fk_property_roles_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE property_roles ADD CONSTRAINT fk_property_roles_property_id FOREIGN KEY (property_id) REFERENCES properties(id);
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id);
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_property_id FOREIGN KEY (property_id) REFERENCES properties(id);
ALTER TABLE receipts ADD CONSTRAINT fk_receipts_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id);
ALTER TABLE receipts ADD CONSTRAINT fk_receipts_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);
ALTER TABLE recommendations ADD CONSTRAINT fk_recommendations_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE recommendations ADD CONSTRAINT fk_recommendations_asset_id FOREIGN KEY (asset_id) REFERENCES assets(id);
ALTER TABLE saved_views ADD CONSTRAINT fk_saved_views_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE service_agreement_items ADD CONSTRAINT fk_service_agreement_items_service_agreement_id FOREIGN KEY (service_agreement_id) REFERENCES service_agreements(id);
ALTER TABLE service_agreement_items ADD CONSTRAINT fk_service_agreement_items_service_template_id FOREIGN KEY (service_template_id) REFERENCES service_templates(id);
ALTER TABLE service_agreements ADD CONSTRAINT fk_service_agreements_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE units ADD CONSTRAINT fk_units_property_id FOREIGN KEY (property_id) REFERENCES properties(id);
ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE users ADD CONSTRAINT fk_users_customer_profile_id FOREIGN KEY (customer_profile_id) REFERENCES customers(id);
ALTER TABLE users ADD CONSTRAINT fk_users_technician_profile_id FOREIGN KEY (technician_profile_id) REFERENCES technicians(id);
ALTER TABLE visit_subcontractors ADD CONSTRAINT fk_visit_subcontractors_visit_id FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE visit_subcontractors ADD CONSTRAINT fk_visit_subcontractors_subcontractor_id FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id);
ALTER TABLE visit_technicians ADD CONSTRAINT fk_visit_technicians_visit_id FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE visit_technicians ADD CONSTRAINT fk_visit_technicians_technician_id FOREIGN KEY (technician_id) REFERENCES technicians(id);
ALTER TABLE visits ADD CONSTRAINT fk_visits_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id);
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_property_id FOREIGN KEY (property_id) REFERENCES properties(id);
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_unit_id FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_assigned_technician_id FOREIGN KEY (assigned_technician_id) REFERENCES technicians(id);

-- ============================================================================
-- INFRASTRUCTURE TABLES (Non-entity system tables)
-- ============================================================================
-- These tables are NOT generated from entity metadata because they:
-- 1. Have special relationships (refresh_tokens: security/sessions)
-- 2. Are system infrastructure, not business entities
-- 3. Support API semantics (idempotency_keys: retry safety)
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
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for system_settings
-- Note: PRIMARY KEY on 'key' already creates an index; no additional index needed

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
-- IDEMPOTENCY KEYS TABLE
-- ============================================================================
-- Purpose: Stores request/response pairs for retry-safe mutations
-- Relationship: Many-to-one with users (scoped per-user to prevent collision)
-- TTL: Records expire after 24 hours (enforced by application cleanup job)
-- ============================================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id SERIAL PRIMARY KEY,
    
    -- Client-provided idempotency key (unique per user)
    idempotency_key VARCHAR(255) NOT NULL,
    
    -- Scoped to user (prevents cross-user collision)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request fingerprint for mismatch detection
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(500) NOT NULL,
    request_body_hash VARCHAR(64) NOT NULL,  -- SHA-256 hex
    
    -- Cached response
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    
    -- Timestamp for TTL enforcement (matches entity convention)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Per-user uniqueness (same user cannot reuse key within TTL)
    CONSTRAINT uq_idempotency_key_user UNIQUE (idempotency_key, user_id)
);

-- Indexes for idempotency_keys
-- Note: UNIQUE constraint already creates index on (idempotency_key, user_id)
-- Cleanup job finds expired keys efficiently
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at 
    ON idempotency_keys(created_at);

-- ============================================================================
-- TROSS SEED DATA
-- ============================================================================
-- IDEMPOTENT: Safe to run multiple times (uses ON CONFLICT)
-- PURPOSE: Core data required for application to function
-- ============================================================================

-- ============================================================================
-- ROLES (5 core system roles)
-- ============================================================================
-- These are seeded in schema.sql via ON CONFLICT, but included here for clarity
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
-- ADMIN USER (primary developer account)
-- ============================================================================
INSERT INTO users (
    email,
    auth0_id,
    first_name,
    last_name,
    role_id,
    status,
    is_active
) VALUES (
    'zarika.amber@gmail.com',
    'google-oauth2|106216621173067609100',
    'Zarika',
    'Amber',
    (SELECT id FROM roles WHERE name = 'admin'),
    'active',
    true
)
ON CONFLICT (email) DO UPDATE SET
    auth0_id = EXCLUDED.auth0_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- USER PREFERENCES (linked to admin user)
-- Uses individual columns per schema.sql (NOT JSONB)
-- ============================================================================
INSERT INTO preferences (
    id,
    theme,
    density,
    notifications_enabled,
    items_per_page,
    notification_retention_days,
    auto_refresh_interval
) VALUES (
    (SELECT id FROM users WHERE email = 'zarika.amber@gmail.com'),
    'system',
    'comfortable',
    true,
    25,
    30,
    0
)
ON CONFLICT (id) DO UPDATE SET
    theme = EXCLUDED.theme,
    density = EXCLUDED.density,
    notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================================================
-- SYSTEM SETTINGS (default configuration)
-- ============================================================================
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
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data applied successfully';
    RAISE NOTICE '   - Roles: %', (SELECT COUNT(*) FROM roles);
    RAISE NOTICE '   - Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '   - Preferences: %', (SELECT COUNT(*) FROM preferences);
    RAISE NOTICE '   - System Settings: %', (SELECT COUNT(*) FROM system_settings);
END $$;