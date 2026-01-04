-- Add ON DELETE CASCADE to workspaces.created_by_user_id
-- This allows deleting a user to automatically delete all their workspaces (and cascade to all data)

ALTER TABLE flip.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_created_by_user_id_fkey;

ALTER TABLE flip.workspaces
  ADD CONSTRAINT workspaces_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id)
  REFERENCES flip."user"(id)
  ON DELETE CASCADE;
