-- Migration: 014
-- Description: Convert user_preferences to shared primary key pattern (1:1 identifying relationship)
-- Author: System
-- Date: 2024-12-17
-- Reversible: Yes (see rollback section at bottom)

-- ============================================================================
-- SHARED PRIMARY KEY PATTERN
-- ============================================================================
-- Design rationale:
--   - For true 1:1 relationships, the child table's PK = parent table's PK
--   - user_preferences.id = users.id (not a separate SERIAL)
--   - Eliminates redundant user_id column
--   - Simplifies queries and enforces 1:1 at database level
--   - Profile menu can link directly: /entity/preferences/{userId}
--
-- Before: id SERIAL PK, user_id INTEGER UNIQUE FK
-- After:  id INTEGER PK FK (references users.id)
-- ============================================================================

-- Step 1: Drop existing constraints and indexes
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_unique;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;

-- Step 2: For any existing data, ensure id = user_id before dropping user_id
-- (Safe even if table is empty)
UPDATE user_preferences SET id = user_id WHERE id != user_id;

-- Step 3: Drop user_id column (now redundant - id IS the user reference)
ALTER TABLE user_preferences DROP COLUMN IF EXISTS user_id;

-- Step 4: Remove SERIAL default (id is now provided, not auto-generated)
ALTER TABLE user_preferences ALTER COLUMN id DROP DEFAULT;

-- Step 5: Drop the sequence that was backing the SERIAL
DROP SEQUENCE IF EXISTS user_preferences_id_seq;

-- Step 6: Add new constraints
-- id is now both PK and FK to users.id
ALTER TABLE user_preferences ADD PRIMARY KEY (id);
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_fk 
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Recreate the updated_at trigger
CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Step 8: Update table comment
COMMENT ON TABLE user_preferences IS 'User-specific preferences (1:1 with users via shared PK)';
COMMENT ON COLUMN user_preferences.id IS 'Primary key = users.id (shared PK pattern for 1:1)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run after migration to verify:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_preferences' 
-- ORDER BY ordinal_position;
--
-- Expected columns: id, preferences, created_at, updated_at (NO user_id)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To reverse this migration (restore user_id column):
--
-- ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_user_fk;
-- ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_pkey;
-- ALTER TABLE user_preferences ADD COLUMN user_id INTEGER;
-- UPDATE user_preferences SET user_id = id;
-- ALTER TABLE user_preferences ALTER COLUMN user_id SET NOT NULL;
-- CREATE SEQUENCE user_preferences_id_seq;
-- ALTER TABLE user_preferences ALTER COLUMN id SET DEFAULT nextval('user_preferences_id_seq');
-- ALTER TABLE user_preferences ADD PRIMARY KEY (id);
-- ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_unique UNIQUE (user_id);
-- ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
-- ============================================================================
