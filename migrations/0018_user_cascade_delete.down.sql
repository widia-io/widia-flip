-- Remove CASCADE, restore original constraint without cascade
ALTER TABLE flip.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_created_by_user_id_fkey;

ALTER TABLE flip.workspaces
  ADD CONSTRAINT workspaces_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id)
  REFERENCES flip."user"(id);
