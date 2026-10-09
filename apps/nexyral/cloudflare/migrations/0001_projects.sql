CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','generating','generated','failed')),
  source TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX projects_owner ON projects(owner_id, created_at DESC);
CREATE TABLE generation_usage (
  day TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
