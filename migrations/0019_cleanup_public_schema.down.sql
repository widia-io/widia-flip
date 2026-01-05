-- Down: Cannot restore dropped tables (they were empty duplicates)
-- This is a one-way cleanup migration

-- Remove columns added to flip.user (rollback to pre-0018 state)
ALTER TABLE flip."user" DROP COLUMN IF EXISTS is_admin;
ALTER TABLE flip."user" DROP COLUMN IF EXISTS is_active;
DROP INDEX IF EXISTS flip.idx_user_is_admin;
