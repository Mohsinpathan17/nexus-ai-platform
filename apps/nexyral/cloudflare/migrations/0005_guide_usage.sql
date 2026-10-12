CREATE TABLE guide_usage (
  day TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,owner_id)
);
