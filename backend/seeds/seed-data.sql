-- ============================================================================
-- TROSSAPP SEED DATA
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
-- ============================================================================
INSERT INTO user_preferences (
    user_id,
    preferences
) VALUES (
    (SELECT id FROM users WHERE email = 'zarika.amber@gmail.com'),
    '{"theme": "system", "notificationsEnabled": true}'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
    preferences = EXCLUDED.preferences;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data applied successfully';
    RAISE NOTICE '   - Roles: %', (SELECT COUNT(*) FROM roles);
    RAISE NOTICE '   - Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '   - Preferences: %', (SELECT COUNT(*) FROM user_preferences);
END $$;
