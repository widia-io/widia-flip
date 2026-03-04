SET search_path TO flip, public;

DROP INDEX IF EXISTS idx_offer_recommendations_workspace_decision;
DROP INDEX IF EXISTS idx_offer_recommendations_workspace_is_stale;
DROP INDEX IF EXISTS idx_offer_recommendations_workspace_prospect_created;

DROP TABLE IF EXISTS offer_recommendations;
