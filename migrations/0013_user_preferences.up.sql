-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION flip.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User preferences for onboarding and feature tour state
CREATE TABLE flip.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_checklist JSONB NOT NULL DEFAULT '{
        "created_workspace": false,
        "added_prospect": false,
        "calculated_score": false,
        "converted_to_property": false
    }'::jsonb,
    feature_tour_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user_id
CREATE INDEX idx_user_preferences_user_id ON flip.user_preferences(user_id);

-- Trigger to update updated_at on changes
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON flip.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION flip.update_updated_at_column();
