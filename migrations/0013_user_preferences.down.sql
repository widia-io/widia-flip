DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON flip.user_preferences;
DROP TABLE IF EXISTS flip.user_preferences;
DROP FUNCTION IF EXISTS flip.update_updated_at_column();
