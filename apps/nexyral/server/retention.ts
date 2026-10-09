import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./database.ts";
export interface PreviewRetentionPolicy { ttlHours: number; maxPerOwner: number; maxBytesPerOwner: number }
export function retentionPolicy(): PreviewRetentionPolicy {
  const number = (name: string, fallback: number, min: number, max: number) => {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}.`);
    return value;
  };
  return { ttlHours: number("NEXYRAL_PREVIEW_TTL_HOURS", 168, 1, 720), maxPerOwner: number("NEXYRAL_PREVIEW_MAX_PER_OWNER", 5, 1, 100), maxBytesPerOwner: number("NEXYRAL_PREVIEW_MAX_BYTES_OWNER", 10000000, 2000000, 100000000) };
}
export function expirePreviewsInsideTransaction(db: DatabaseSync, now = Date.now()) {
  const expired = db.prepare("SELECT run_id FROM preview_retention WHERE state='retained' AND expires_at<=?").all(now) as { run_id: string }[];
  for (const { run_id: id } of expired) {
    db.prepare("DELETE FROM artifacts WHERE run_id=? AND name='frontend-preview.json' AND kind='preview'").run(id);
    db.prepare("UPDATE preview_retention SET state='expired',bytes=0 WHERE run_id=?").run(id);
    db.prepare("DELETE FROM preview_grants WHERE run_id=?").run(id);
    db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(id, "preview.expired", "The scheduled preview retention period ended. Source, approval and verification evidence remain available.", new Date(now).toISOString());
  }
  db.prepare("DELETE FROM preview_grants WHERE expires_at<=?").run(now);
  return expired.length;
}
export function expirePreviews(db: DatabaseSync, now = Date.now()) {
  return transaction(db, () => expirePreviewsInsideTransaction(db, now));
}
// Called inside the worker's atomic evidence commit. Legacy previews have no TTL and are never deleted here.
export function retainPreview(db: DatabaseSync, runId: string, content: string, policy: PreviewRetentionPolicy, now = Date.now()) {
  expirePreviewsInsideTransaction(db, now);
  const owner = db.prepare("SELECT p.owner_id FROM runs r JOIN projects p ON p.id=r.project_id WHERE r.id=?").get(runId) as { owner_id: string };
  const usage = db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(length(CAST(a.content AS BLOB))),0) AS bytes FROM artifacts a JOIN runs r ON r.id=a.run_id JOIN projects p ON p.id=r.project_id WHERE p.owner_id=? AND a.name='frontend-preview.json' AND a.kind='preview'").get(owner.owner_id) as { count: number; bytes: number };
  const bytes = Buffer.byteLength(content);
  const retained = bytes <= 3000000 && usage.count < policy.maxPerOwner && usage.bytes + bytes <= policy.maxBytesPerOwner;
  const expiresAt = now + policy.ttlHours * 3600000;
  db.prepare("INSERT INTO preview_retention VALUES(?,?,?,?,?)").run(runId, expiresAt, retained ? bytes : 0, retained ? "retained" : "quota", now);
  if (retained) db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), runId, "frontend-preview.json", "preview", content, new Date(now).toISOString());
  db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(runId, retained ? "preview.retained" : "preview.unavailable", retained ? "Verified preview retained with a scheduled expiry. Source and evidence have no automatic expiry." : "Preview quota reached. Source and verification evidence were retained; no older preview was evicted.", new Date(now).toISOString());
  return { retained, expiresAt: new Date(expiresAt).toISOString() };
}
