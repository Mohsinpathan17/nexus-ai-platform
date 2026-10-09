CREATE TABLE email_code_challenges (
  owner_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  sends INTEGER NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  receipt TEXT
);
CREATE TABLE verified_addresses (
  owner_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  verified_at INTEGER NOT NULL
);
CREATE TABLE email_send_usage (
  day TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
