-- ============================================================================
-- MIGRATION: 004_notifications_user_cascade
-- ============================================================================
-- Adds ON DELETE CASCADE to the notifications.user_id foreign key.
--
-- Rationale: a notification is a child of its recipient user (user_id is
-- NOT NULL) and cannot exist without that user. Deleting a user must delete
-- their notifications (composition), consistent with preferences and
-- refresh_tokens which already cascade from users.
--
-- UP: Drop and re-add fk_notifications_user_id with ON DELETE CASCADE
-- DOWN: See rollback section at bottom
-- Idempotency: DROP ... IF EXISTS makes this safe to re-run
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user_id;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- ROLLBACK (DOWN) — restore the non-cascading constraint
-- ============================================================================
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user_id;
-- ALTER TABLE notifications
--   ADD CONSTRAINT fk_notifications_user_id
--   FOREIGN KEY (user_id) REFERENCES users(id);
-- ============================================================================
