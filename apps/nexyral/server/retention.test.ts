import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase, transaction } from "./database.ts";
import { createProject, createRun } from "./runs.ts";
import { expirePreviews, retainPreview } from "./retention.ts";
import { validatePreviewOrigin } from "./config.ts";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function fixture() {
  const db = openDatabase(":memory:");
  for (const id of ["one", "two"]) db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(id, id, `${id}@fixture.test`, "hash", "salt", new Date().toISOString());
  const projects = [createProject(db, "one", "One"), createProject(db, "two", "Two")];
  const run = (owner = 0) => createRun(db, owner === 0 ? "one" : "two", projects[owner].id, "Controlled retention fixture intent").id;
  return { db, run };
}
test("retention quotas are owner-scoped, preserve legacy outputs, and expire only scheduled preview payloads", () => {
  const { db, run } = fixture();
  try {
    const legacy = run();
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), legacy, "frontend-preview.json", "preview", "legacy preview", new Date(0).toISOString());
    const retained = run();
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), retained, "frontend-source.json", "patch", "keep source", new Date().toISOString());
    const policy = { ttlHours: 1, maxPerOwner: 2, maxBytesPerOwner: 10000 };
    assert.equal(transaction(db, () => retainPreview(db, retained, "new preview", policy, 1000)).retained, true);
    const blocked = run();
    assert.equal(transaction(db, () => retainPreview(db, blocked, "quota preview", policy, 1000)).retained, false);
    const other = run(1);
    assert.equal(transaction(db, () => retainPreview(db, other, "other preview", policy, 2000)).retained, true);
    assert.equal(expirePreviews(db, 3601000), 1);
    assert.equal(expirePreviews(db, 3601000), 0);
    const names = db.prepare("SELECT run_id,name FROM artifacts WHERE name='frontend-preview.json'").all() as { run_id: string; name: string }[];
    assert.deepEqual(new Set(names.map((item) => item.run_id)), new Set([legacy, other]));
    assert.equal((db.prepare("SELECT content FROM artifacts WHERE run_id=? AND name='frontend-source.json'").get(retained) as { content: string }).content, "keep source");
    assert.equal((db.prepare("SELECT state FROM preview_retention WHERE run_id=?").get(retained) as { state: string }).state, "expired");
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM events WHERE run_id=? AND type='preview.expired'").get(retained) as { count: number }).count, 1);
  } finally { db.close(); }
});
test("preview byte quota uses UTF-8 size and never evicts an older payload", () => {
  const { db, run } = fixture();
  try {
    const policy = { ttlHours: 1, maxPerOwner: 5, maxBytesPerOwner: 5 };
    const first = run(); const second = run();
    assert.equal(transaction(db, () => retainPreview(db, first, "éé", policy)).retained, true);
    assert.equal(transaction(db, () => retainPreview(db, second, "é", policy)).retained, false);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM artifacts WHERE kind='preview'").get() as { count: number }).count, 1);
  } finally { db.close(); }
});
test("preview origin configuration rejects same-host ports and insecure production origins", () => {
  assert.throws(() => validatePreviewOrigin("http://localhost:8788", ["http://localhost:5173"]), /different hostnames/);
  assert.throws(() => validatePreviewOrigin("http://preview.example", ["https://app.example"], true), /HTTPS/);
  assert.throws(() => validatePreviewOrigin("https://preview.example/path", ["https://app.example"]), /without a path/);
  assert.equal(validatePreviewOrigin("https://preview.example", ["https://app.example"], true), "https://preview.example");
});
test("v3 database upgrade preserves legacy source, preview, owner and session without scheduling deletion", () => {
  const directory = mkdtempSync(join(tmpdir(), "nexyral-migration-"));
  const path = join(directory, "fixture.sqlite");
  let db = openDatabase(path);
  try {
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run("owner", "Owner", "owner@fixture.test", "hash", "salt", new Date().toISOString());
    db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run("session-hash", "owner", "csrf", Date.now() + 60_000);
    const project = createProject(db, "owner", "Existing project");
    const run = createRun(db, "owner", project.id, "Existing approved engineering intent");
    for (const [name, kind] of [["frontend-preview.json", "preview"], ["frontend-source.json", "patch"]])
      db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), run.id, name, kind, "preserved content", new Date(0).toISOString());
    db.exec("DROP TABLE password_resets; DROP TABLE preview_grants; DROP TABLE preview_retention; PRAGMA user_version=3;");
    db.close();
    db = openDatabase(path);
    assert.equal((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 7);
    assert.equal(expirePreviews(db, Date.now() + 365 * 86400_000), 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM artifacts WHERE run_id=? AND content='preserved content'").get(run.id) as { count: number }).count, 2);
    assert.equal((db.prepare("SELECT user_id FROM sessions WHERE token_hash='session-hash'").get() as { user_id: string }).user_id, "owner");
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM preview_retention").get() as { count: number }).count, 0);
    assert.equal((db.prepare("SELECT owner_id FROM projects WHERE id=?").get(project.id) as { owner_id: string }).owner_id, "owner");
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});
