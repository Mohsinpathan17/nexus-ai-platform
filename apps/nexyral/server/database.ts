import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(path: string) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  // Apply the connection's wait budget before any schema read or WAL change.
  db.exec("PRAGMA busy_timeout=5000;");
  if (path !== ":memory:") chmodSync(path, 0o600);
  const version = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  if (version.user_version > 7) {
    db.close();
    throw new Error("Database schema is newer than this server supports.");
  }
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
 CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id);
 CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), intent TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('awaiting_executor','running','awaiting_approval','succeeded','failed','cancelled')), stage TEXT NOT NULL CHECK(stage IN ('intent','understand','plan','build','verify','ship')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS runs_project ON runs(project_id);
 CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(id), type TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS events_run ON events(run_id,id);
 CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), name TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS worker_lease (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS worker_capabilities (owner TEXT PRIMARY KEY, build_enabled INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS preview_retention (run_id TEXT PRIMARY KEY REFERENCES runs(id), expires_at INTEGER NOT NULL, bytes INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('retained','expired','quota')), created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS preview_retention_expiry ON preview_retention(state,expires_at);
 CREATE TABLE IF NOT EXISTS preview_grants (token_hash TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), app_origin TEXT NOT NULL, expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS preview_grants_expiry ON preview_grants(expires_at);
 CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS password_resets_expiry ON password_resets(expires_at);
 CREATE TABLE IF NOT EXISTS project_requirements (project_id TEXT PRIMARY KEY REFERENCES projects(id), text TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS github_identities (github_id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS verified_emails (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, verified_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS email_verification_grants (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
 PRAGMA user_version=7;`);
  return db;
}
export function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
