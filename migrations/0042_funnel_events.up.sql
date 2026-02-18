CREATE TABLE IF NOT EXISTS flip.funnel_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NULL REFERENCES flip."user"(id) ON DELETE SET NULL,
  workspace_id UUID NULL REFERENCES flip.workspaces(id) ON DELETE SET NULL,
  variant TEXT NOT NULL DEFAULT 'control',
  source TEXT NOT NULL DEFAULT 'direct',
  device_type TEXT NOT NULL DEFAULT 'unknown',
  path TEXT NOT NULL DEFAULT '/',
  request_id TEXT NULL,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_at
  ON flip.funnel_events(event_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name
  ON flip.funnel_events(event_name);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id
  ON flip.funnel_events(session_id);

CREATE INDEX IF NOT EXISTS idx_funnel_events_user_id
  ON flip.funnel_events(user_id)
  WHERE user_id IS NOT NULL;
