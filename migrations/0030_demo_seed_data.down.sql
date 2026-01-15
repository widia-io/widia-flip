-- Remove demo seed data
DELETE FROM flip.workspaces WHERE name = 'Demo - Screenshots';
-- CASCADE vai remover memberships, properties, costs, suppliers, etc.
