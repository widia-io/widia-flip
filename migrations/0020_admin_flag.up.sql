-- Add admin flag and active status to user table
ALTER TABLE flip."user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE flip."user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for querying admins
CREATE INDEX IF NOT EXISTS idx_user_is_admin ON flip."user" (is_admin) WHERE is_admin = true;
