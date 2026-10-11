CREATE TABLE project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX project_versions_owner ON project_versions(project_id, owner_id, created_at DESC);
