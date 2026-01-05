DROP INDEX IF EXISTS flip.idx_user_is_admin;
ALTER TABLE flip."user" DROP COLUMN IF EXISTS is_admin;
ALTER TABLE flip."user" DROP COLUMN IF EXISTS is_active;
