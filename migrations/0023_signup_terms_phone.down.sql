-- Rollback phone and terms acceptance fields
DROP INDEX IF EXISTS flip.idx_user_phone;
ALTER TABLE flip."user" DROP COLUMN IF EXISTS phone;
ALTER TABLE flip."user" DROP COLUMN IF EXISTS accepted_terms_at;
