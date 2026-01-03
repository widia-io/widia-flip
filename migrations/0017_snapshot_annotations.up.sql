-- Snapshot annotations table for adding notes to any snapshot
CREATE TABLE flip.snapshot_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('cash', 'financing')),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_snapshot_annotations_snapshot ON flip.snapshot_annotations(snapshot_id, snapshot_type);
CREATE INDEX idx_snapshot_annotations_workspace ON flip.snapshot_annotations(workspace_id);
