-- Seed Data: Development Users
-- IDEMPOTENT: Safe to run multiple times
-- KISS Architecture: role_id directly on users table (many-to-one relationship)
-- For development/testing only - NOT for production

-- Create development test users with roles assigned directly
INSERT INTO users (email, auth0_id, first_name, last_name, role_id, is_active)
SELECT 
  email,
  auth0_id,
  first_name,
  last_name,
  r.id,
  true
FROM (VALUES
  ('admin@trossapp.dev', 'dev|admin123', 'Admin', 'User', 'admin'),
  ('manager@trossapp.dev', 'dev|manager123', 'Test', 'Manager', 'manager'),
  ('dispatcher@trossapp.dev', 'dev|dispatcher123', 'Sarah', 'Dispatcher', 'dispatcher'),
  ('tech1@trossapp.dev', 'dev|tech123', 'John', 'Technician', 'technician'),
  ('tech2@trossapp.dev', 'dev|tech456', 'Mike', 'Smith', 'technician'),
  ('client@trossapp.dev', 'dev|client123', 'Test', 'Client', 'client'),
  ('jane.tech@trossapp.dev', 'dev|jane789', 'Jane', 'Wilson', 'technician'),
  ('bob.dispatcher@trossapp.dev', 'dev|bob456', 'Bob', 'Johnson', 'dispatcher'),
  ('alice.manager@trossapp.dev', 'dev|alice678', 'Alice', 'Brown', 'manager')
) AS v(email, auth0_id, first_name, last_name, role_name)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (email) 
DO UPDATE SET
  auth0_id = EXCLUDED.auth0_id,
  role_id = EXCLUDED.role_id,
  is_active = true,
  updated_at = NOW();

-- Verify seeded users
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role,
  u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email LIKE '%@trossapp.dev'
ORDER BY r.id, u.email;