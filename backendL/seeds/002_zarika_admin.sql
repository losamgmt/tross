-- Add Zarika as admin user
-- IDEMPOTENT: Safe to run multiple times
-- This user will be matched when logging in via Auth0 with Google
-- Auth0 ID from logs: google-oauth2|106216621173067609100

-- Insert or update user with admin role
INSERT INTO users (
  auth0_id, 
  email, 
  first_name, 
  last_name, 
  role_id, 
  is_active,
  created_at, 
  updated_at
)
SELECT 
  'google-oauth2|106216621173067609100',
  'zarika.amber@gmail.com',
  'Zarika',
  'Amber',
  r.id,  -- admin role_id
  true,
  NOW(),
  NOW()
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (email) 
DO UPDATE SET
  auth0_id = EXCLUDED.auth0_id,
  role_id = EXCLUDED.role_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = true,
  updated_at = NOW();

-- Verify admin user exists
SELECT 
  u.id,
  u.email, 
  u.first_name, 
  u.last_name, 
  u.auth0_id,
  r.name as role,
  u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'zarika.amber@gmail.com';
