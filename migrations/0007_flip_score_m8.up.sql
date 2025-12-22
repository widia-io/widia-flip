-- M8: Flip Score v0
-- Add flip score fields to prospecting_properties

ALTER TABLE prospecting_properties
    ADD COLUMN IF NOT EXISTS listing_text TEXT,
    ADD COLUMN IF NOT EXISTS flip_score INT,
    ADD COLUMN IF NOT EXISTS flip_score_version TEXT,
    ADD COLUMN IF NOT EXISTS flip_score_confidence NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS flip_score_breakdown JSONB,
    ADD COLUMN IF NOT EXISTS flip_score_updated_at TIMESTAMPTZ;

-- Index for sorting/filtering by score within workspace
CREATE INDEX IF NOT EXISTS idx_prospects_flip_score
    ON prospecting_properties(workspace_id, flip_score DESC NULLS LAST);
