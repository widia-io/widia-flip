-- Down migration for Email Marketing MVP

DROP INDEX IF EXISTS flip.idx_email_sends_user;
DROP INDEX IF EXISTS flip.idx_email_sends_campaign_status;
DROP TABLE IF EXISTS flip.email_sends;

DROP INDEX IF EXISTS flip.idx_email_campaigns_created_at;
DROP TABLE IF EXISTS flip.email_campaigns;

DROP INDEX IF EXISTS flip.idx_user_marketing_eligible;
ALTER TABLE flip."user"
  DROP COLUMN IF EXISTS unsubscribe_token,
  DROP COLUMN IF EXISTS marketing_opt_out_at,
  DROP COLUMN IF EXISTS marketing_opt_in_at;
