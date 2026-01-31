-- Rollback email events

DROP TABLE IF EXISTS flip.email_events;

DROP INDEX IF EXISTS flip.idx_email_sends_resend_id;

ALTER TABLE flip.email_sends
  DROP COLUMN IF EXISTS resend_email_id;
