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
-- DEMO ADMIN USER (pending - auth0_id will be set on first login)
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
    'lane.vandeventer@gmail.com',
    NULL,
    'Lane',
    'Vandeventer',
    (SELECT id FROM roles WHERE name = 'admin'),
    'pending',
    true
)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEMO CUSTOMERS (realistic property management customers)
-- ============================================================================
INSERT INTO customers (
    email, first_name, last_name, phone, organization_name, status,
    billing_line1, billing_city, billing_state, billing_postal_code, billing_country
) VALUES
-- Residential customer
(
    'sarah.mitchell@email.com', 'Sarah', 'Mitchell', '555-100-2001', NULL, 'active',
    '742 Evergreen Terrace', 'Springfield', 'IL', '62701', 'US'
),
-- Commercial property management company
(
    'accounts@sterlingproperties.com', 'James', 'Sterling', '555-100-3001', 'Sterling Properties LLC', 'active',
    '500 Commerce Drive', 'Austin', 'TX', '78701', 'US'
),
-- HOA / Condo association
(
    'board@oceanviewhoa.org', 'Margaret', 'Chen', '555-100-4001', 'Oceanview Condo Association', 'active',
    '1200 Ocean Boulevard', 'Miami', 'FL', '33139', 'US'
)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    organization_name = EXCLUDED.organization_name,
    status = EXCLUDED.status;

-- ============================================================================
-- DEMO VENDORS (suppliers and service providers)
-- ============================================================================
INSERT INTO vendors (name, contact_email, phone, notes, status) VALUES
('HVAC Supply Co', 'orders@hvacsupply.com', '555-200-1001', 'Primary HVAC parts supplier', 'active'),
('FastParts Plumbing', 'support@fastparts.com', '555-200-2001', 'Next-day delivery available', 'active'),
('Metro Electrical Wholesale', 'sales@metroelectrical.com', '555-200-3001', 'Net 30 terms', 'active')
ON CONFLICT (name) DO UPDATE SET
    contact_email = EXCLUDED.contact_email,
    phone = EXCLUDED.phone,
    notes = EXCLUDED.notes,
    status = EXCLUDED.status;

-- ============================================================================
-- DEMO TECHNICIANS (service technicians)
-- ============================================================================
INSERT INTO technicians (
    email, first_name, last_name, license_number, hourly_rate, status, availability
) VALUES
('mike.johnson@tross.app', 'Mike', 'Johnson', 'HVAC-2024-0042', 75.00, 'active', 'available'),
('jennifer.torres@tross.app', 'Jennifer', 'Torres', 'PLB-2023-0188', 80.00, 'active', 'available'),
('david.kim@tross.app', 'David', 'Kim', 'ELE-2024-0221', 85.00, 'active', 'on_job')
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    license_number = EXCLUDED.license_number,
    hourly_rate = EXCLUDED.hourly_rate,
    status = EXCLUDED.status,
    availability = EXCLUDED.availability;

-- ============================================================================
-- DEMO PROPERTIES (service locations)
-- ============================================================================
INSERT INTO properties (
    name, property_type, status,
    address_line1, address_city, address_state, address_postal_code, address_country,
    access_instructions, notes
) VALUES
-- Residential property
(
    '742 Evergreen Terrace', 'residential', 'active',
    '742 Evergreen Terrace', 'Springfield', 'IL', '62701', 'US',
    'Gate code: 1234. Dog in backyard - friendly.', 'Single family home, owner occupied'
),
-- Commercial office building
(
    'Sterling Tower', 'commercial', 'active',
    '500 Commerce Drive', 'Austin', 'TX', '78701', 'US',
    'Check in with security desk. Service elevator access required.', 'Multi-tenant office building, 12 floors'
),
-- Condo complex
(
    'Oceanview Condominiums', 'residential', 'active',
    '1200 Ocean Boulevard', 'Miami', 'FL', '33139', 'US',
    'Contact property manager for access. Key box at maintenance room.', '48-unit beachfront condo complex'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO UNITS (individual units within properties)
-- ============================================================================
-- Note: Uses property.name lookup since we don't have deterministic IDs
DO $$
DECLARE
    v_sterling_tower_id INTEGER;
    v_oceanview_id INTEGER;
BEGIN
    SELECT id INTO v_sterling_tower_id FROM properties WHERE name = 'Sterling Tower' LIMIT 1;
    SELECT id INTO v_oceanview_id FROM properties WHERE name = 'Oceanview Condominiums' LIMIT 1;
    
    -- Sterling Tower units (commercial)
    INSERT INTO units (property_id, unit_identifier, unit_category, ownership_type, floor, square_footage, status)
    VALUES
        (v_sterling_tower_id, 'Suite 101', 'commercial', 'private', 1, 2500, 'active'),
        (v_sterling_tower_id, 'Suite 305', 'commercial', 'private', 3, 1800, 'active'),
        (v_sterling_tower_id, 'Suite 800', 'commercial', 'private', 8, 5000, 'active')
    ON CONFLICT DO NOTHING;
    
    -- Oceanview units (residential condos)
    INSERT INTO units (property_id, unit_identifier, unit_category, ownership_type, floor, square_footage, status)
    VALUES
        (v_oceanview_id, 'Unit 12A', 'residential', 'private', 12, 1200, 'active'),
        (v_oceanview_id, 'Unit 6B', 'residential', 'private', 6, 950, 'active'),
        (v_oceanview_id, 'Pool Area', 'amenity', 'common', 1, 3000, 'active')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- DEMO ASSETS (equipment and appliances)
-- ============================================================================
DO $$
DECLARE
    v_suite101_id INTEGER;
    v_unit12a_id INTEGER;
    v_pool_id INTEGER;
BEGIN
    SELECT u.id INTO v_suite101_id 
    FROM units u 
    JOIN properties p ON u.property_id = p.id 
    WHERE p.name = 'Sterling Tower' AND u.unit_identifier = 'Suite 101' LIMIT 1;
    
    SELECT u.id INTO v_unit12a_id 
    FROM units u 
    JOIN properties p ON u.property_id = p.id 
    WHERE p.name = 'Oceanview Condominiums' AND u.unit_identifier = 'Unit 12A' LIMIT 1;
    
    SELECT u.id INTO v_pool_id 
    FROM units u 
    JOIN properties p ON u.property_id = p.id 
    WHERE p.name = 'Oceanview Condominiums' AND u.unit_identifier = 'Pool Area' LIMIT 1;
    
    IF v_suite101_id IS NOT NULL THEN
        INSERT INTO assets (unit_id, name, asset_type, manufacturer, model, status, install_date)
        VALUES
            (v_suite101_id, 'Main HVAC Unit', 'hvac', 'Carrier', 'Infinity 26', 'active', '2022-03-15'),
            (v_suite101_id, 'Water Heater', 'plumbing', 'Rheem', 'Performance Plus', 'active', '2021-08-10')
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_unit12a_id IS NOT NULL THEN
        INSERT INTO assets (unit_id, name, asset_type, manufacturer, model, status, install_date)
        VALUES
            (v_unit12a_id, 'Split AC System', 'hvac', 'Daikin', 'Aurora Series', 'needs_repair', '2020-05-20'),
            (v_unit12a_id, 'Kitchen Refrigerator', 'appliance', 'Samsung', 'RF28R7551SR', 'active', '2023-01-12')
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_pool_id IS NOT NULL THEN
        INSERT INTO assets (unit_id, name, asset_type, manufacturer, model, status, install_date)
        VALUES
            (v_pool_id, 'Pool Pump System', 'plumbing', 'Pentair', 'IntelliFlo3', 'active', '2023-06-01')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- DEMO SERVICE TEMPLATES
-- ============================================================================
INSERT INTO service_templates (name, description, estimated_duration, status, notes) VALUES
('HVAC Annual Maintenance', 'Complete system inspection, filter replacement, coil cleaning', 120, 'active', 'Includes up to 2 filters'),
('Plumbing Inspection', 'Check all fixtures, water pressure, drain flow', 60, 'active', NULL),
('Electrical Safety Audit', 'Panel inspection, outlet testing, GFCI verification', 90, 'active', 'Requires licensed electrician')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    estimated_duration = EXCLUDED.estimated_duration,
    status = EXCLUDED.status;

-- ============================================================================
-- DEMO WORK ORDERS (various statuses to show workflow)
-- ============================================================================
DO $$
DECLARE
    v_sarah_id INTEGER;
    v_sterling_id INTEGER;
    v_oceanview_id INTEGER;
    v_evergreen_id INTEGER;
    v_mike_id INTEGER;
    v_jennifer_id INTEGER;
    v_wo_completed_id INTEGER;
    v_wo_scheduled_id INTEGER;
    v_wo_pending_id INTEGER;
BEGIN
    -- Get customer IDs
    SELECT id INTO v_sarah_id FROM customers WHERE email = 'sarah.mitchell@email.com' LIMIT 1;
    SELECT id INTO v_sterling_id FROM customers WHERE email = 'accounts@sterlingproperties.com' LIMIT 1;
    SELECT id INTO v_oceanview_id FROM customers WHERE email = 'board@oceanviewhoa.org' LIMIT 1;
    
    -- Get property IDs
    SELECT id INTO v_evergreen_id FROM properties WHERE name = '742 Evergreen Terrace' LIMIT 1;
    
    -- Get technician IDs
    SELECT id INTO v_mike_id FROM technicians WHERE email = 'mike.johnson@tross.app' LIMIT 1;
    SELECT id INTO v_jennifer_id FROM technicians WHERE email = 'jennifer.torres@tross.app' LIMIT 1;
    
    -- Work Order 1: Completed (Sarah's home - HVAC maintenance)
    IF v_sarah_id IS NOT NULL AND v_evergreen_id IS NOT NULL THEN
        INSERT INTO work_orders (
            work_order_number, customer_id, property_id, assigned_technician_id,
            summary, status, priority, service_region, origin_type,
            scheduled_start,
            location_line1, location_city, location_state, location_postal_code, location_country
        ) VALUES (
            'WO-2026-0001', v_sarah_id, v_evergreen_id, v_mike_id,
            'Annual HVAC maintenance and filter replacement', 'completed', 'normal', 'north', 'direct',
            CURRENT_DATE - INTERVAL '14 days',
            '742 Evergreen Terrace', 'Springfield', 'IL', '62701', 'US'
        ) RETURNING id INTO v_wo_completed_id;
        
        -- Visit for completed work order
        IF v_wo_completed_id IS NOT NULL THEN
            INSERT INTO visits (visit_number, work_order_id, scheduled_start, scheduled_end, actual_start, actual_end, status, notes)
            VALUES (
                'VIS-2026-0001', v_wo_completed_id,
                (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '09:00',
                (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '11:00',
                (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '09:15',
                (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '10:45',
                'completed',
                'Replaced 2 filters, cleaned coils, system operating normally'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Work Order 2: Scheduled (Sterling - plumbing inspection)
    IF v_sterling_id IS NOT NULL THEN
        INSERT INTO work_orders (
            work_order_number, customer_id, assigned_technician_id,
            summary, status, priority, service_region, origin_type,
            scheduled_start,
            location_line1, location_city, location_state, location_postal_code, location_country
        ) VALUES (
            'WO-2026-0002', v_sterling_id, v_jennifer_id,
            'Quarterly plumbing inspection - Suite 305', 'scheduled', 'normal', 'south', 'direct',
            CURRENT_DATE + INTERVAL '3 days',
            '500 Commerce Drive', 'Austin', 'TX', '78701', 'US'
        ) RETURNING id INTO v_wo_scheduled_id;
        
        -- Future visit for scheduled work order
        IF v_wo_scheduled_id IS NOT NULL THEN
            INSERT INTO visits (visit_number, work_order_id, scheduled_start, scheduled_end, status, notes)
            VALUES (
                'VIS-2026-0002', v_wo_scheduled_id,
                (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '14:00',
                (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '15:00',
                'scheduled',
                'Access via service elevator'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Work Order 3: Pending (Oceanview - pool pump issue)
    IF v_oceanview_id IS NOT NULL THEN
        INSERT INTO work_orders (
            work_order_number, customer_id,
            summary, status, priority, service_region, origin_type,
            location_line1, location_city, location_state, location_postal_code, location_country
        ) VALUES (
            'WO-2026-0003', v_oceanview_id,
            'Pool pump making unusual noise - needs diagnosis', 'pending', 'high', 'east', 'direct',
            '1200 Ocean Boulevard', 'Miami', 'FL', '33139', 'US'
        ) RETURNING id INTO v_wo_pending_id;
    END IF;
END $$;

-- ============================================================================
-- DEMO QUOTES (showing sales pipeline)
-- ============================================================================
DO $$
DECLARE
    v_sarah_id INTEGER;
    v_sterling_id INTEGER;
    v_evergreen_id INTEGER;
BEGIN
    SELECT id INTO v_sarah_id FROM customers WHERE email = 'sarah.mitchell@email.com' LIMIT 1;
    SELECT id INTO v_sterling_id FROM customers WHERE email = 'accounts@sterlingproperties.com' LIMIT 1;
    SELECT id INTO v_evergreen_id FROM properties WHERE name = '742 Evergreen Terrace' LIMIT 1;
    
    -- Quote 1: Accepted (Sarah - water heater replacement)
    IF v_sarah_id IS NOT NULL AND v_evergreen_id IS NOT NULL THEN
        INSERT INTO quotes (
            quote_number, customer_id, property_id, description, notes, status, total_amount, valid_until
        ) VALUES (
            'QT-2026-0001', v_sarah_id, v_evergreen_id,
            'Water heater replacement - 50 gallon hybrid electric',
            'Includes removal of old unit, installation, and 1-year warranty',
            'accepted', 2850.00, CURRENT_DATE + INTERVAL '30 days'
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Quote 2: Sent (Sterling - HVAC upgrade)
    IF v_sterling_id IS NOT NULL THEN
        INSERT INTO quotes (
            quote_number, customer_id, description, notes, status, total_amount, valid_until
        ) VALUES (
            'QT-2026-0002', v_sterling_id,
            'Suite 800 HVAC system upgrade - multi-zone',
            'Complete system replacement with modern VRF units',
            'sent', 45000.00, CURRENT_DATE + INTERVAL '45 days'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- DEMO INVOICES AND PAYMENTS (financial records)
-- ============================================================================
DO $$
DECLARE
    v_sarah_id INTEGER;
    v_wo_completed_id INTEGER;
    v_invoice_id INTEGER;
BEGIN
    SELECT id INTO v_sarah_id FROM customers WHERE email = 'sarah.mitchell@email.com' LIMIT 1;
    SELECT id INTO v_wo_completed_id FROM work_orders 
    WHERE customer_id = v_sarah_id AND status = 'completed' LIMIT 1;
    
    -- Invoice for completed HVAC maintenance
    IF v_sarah_id IS NOT NULL AND v_wo_completed_id IS NOT NULL THEN
        INSERT INTO invoices (
            invoice_number, customer_id, work_order_id, summary,
            amount, tax, total, status, due_date, paid_at
        ) VALUES (
            'INV-2026-0001', v_sarah_id, v_wo_completed_id,
            'Annual HVAC maintenance - labor and filters',
            185.00, 15.28, 200.28, 'paid', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days'
        ) RETURNING id INTO v_invoice_id;
        
        -- Payment for the invoice
        IF v_invoice_id IS NOT NULL THEN
            INSERT INTO payments (
                payment_number, customer_id, invoice_id, amount, payment_method, payment_date, status, reference_number, notes
            ) VALUES (
                'PMT-2026-0001', v_sarah_id, v_invoice_id, 200.28, 'credit_card', CURRENT_DATE - INTERVAL '5 days', 'completed',
                'CC-2025-001234', 'Online payment via Stripe'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- DEMO RECOMMENDATIONS (upsell opportunities from completed work)
-- ============================================================================
DO $$
DECLARE
    v_sarah_id INTEGER;
    v_ac_asset_id INTEGER;
BEGIN
    SELECT id INTO v_sarah_id FROM customers WHERE email = 'sarah.mitchell@email.com' LIMIT 1;
    SELECT a.id INTO v_ac_asset_id FROM assets a
    JOIN units u ON a.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE a.name = 'Split AC System' AND a.status = 'needs_repair' LIMIT 1;
    
    -- Recommendation for AC repair (noted during maintenance visit)
    IF v_sarah_id IS NOT NULL THEN
        INSERT INTO recommendations (
            recommendation_number, customer_id, asset_id, title, description, priority, status, notes
        ) VALUES (
            'REC-2026-0001', v_sarah_id, v_ac_asset_id,
            'AC System Compressor Replacement',
            'Compressor showing signs of wear - recommend replacement before summer',
            'high', 'open',
            'Customer informed during HVAC maintenance visit'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

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
    RAISE NOTICE '   Core:';
    RAISE NOTICE '   - Roles: %', (SELECT COUNT(*) FROM roles);
    RAISE NOTICE '   - Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '   - Preferences: %', (SELECT COUNT(*) FROM preferences);
    RAISE NOTICE '   - System Settings: %', (SELECT COUNT(*) FROM system_settings);
    RAISE NOTICE '   Business:';
    RAISE NOTICE '   - Customers: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE '   - Vendors: %', (SELECT COUNT(*) FROM vendors);
    RAISE NOTICE '   - Technicians: %', (SELECT COUNT(*) FROM technicians);
    RAISE NOTICE '   - Properties: %', (SELECT COUNT(*) FROM properties);
    RAISE NOTICE '   - Units: %', (SELECT COUNT(*) FROM units);
    RAISE NOTICE '   - Assets: %', (SELECT COUNT(*) FROM assets);
    RAISE NOTICE '   - Service Templates: %', (SELECT COUNT(*) FROM service_templates);
    RAISE NOTICE '   Operations:';
    RAISE NOTICE '   - Work Orders: %', (SELECT COUNT(*) FROM work_orders);
    RAISE NOTICE '   - Visits: %', (SELECT COUNT(*) FROM visits);
    RAISE NOTICE '   - Quotes: %', (SELECT COUNT(*) FROM quotes);
    RAISE NOTICE '   - Invoices: %', (SELECT COUNT(*) FROM invoices);
    RAISE NOTICE '   - Payments: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE '   - Recommendations: %', (SELECT COUNT(*) FROM recommendations);
END $$;
