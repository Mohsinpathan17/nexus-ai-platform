CREATE TABLE IF NOT EXISTS public_examples (
 id TEXT PRIMARY KEY,
 status TEXT NOT NULL CHECK(status IN ('generating','generated','failed')),
 source TEXT,
 model TEXT,
 generated_at TEXT,
 updated_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 1
);
