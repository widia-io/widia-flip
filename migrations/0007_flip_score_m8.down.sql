-- M8: Rollback Flip Score
DROP INDEX IF EXISTS idx_prospects_flip_score;

ALTER TABLE prospecting_properties
    DROP COLUMN IF EXISTS listing_text,
    DROP COLUMN IF EXISTS flip_score,
    DROP COLUMN IF EXISTS flip_score_version,
    DROP COLUMN IF EXISTS flip_score_confidence,
    DROP COLUMN IF EXISTS flip_score_breakdown,
    DROP COLUMN IF EXISTS flip_score_updated_at;
