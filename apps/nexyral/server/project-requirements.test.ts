import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database.ts";
import { createProject, createRun, artifactsFor, ownedRun } from "./runs.ts";
import { requirementsFor, saveRequirements, inputForRun } from "./project-requirements.ts";
import { createWorker } from "./worker.ts";
import { createBackup, restoreBackup } from "./backups.ts";
function fixture(path = ":memory:") {
  const db = openDatabase(path);
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run("owner", "Owner", "owner@brief.test", "hash", "salt", new Date().toISOString());
  const project = createProject(db, "owner", "Brief project");
  return { db, project };
}
test("requirements revisions enforce ownership and conflicts; clearing keeps immutable earlier run snapshots", () => {
  const { db, project } = fixture();
  try {
    assert.equal(requirementsFor(db, "owner", project.id).revision, 0);
    assert.throws(() => saveRequirements(db, "other", project.id, "foreign", 0), /Project not found/);
    for (const revision of [-1, 1.5, "0", Number.MAX_SAFE_INTEGER]) assert.throws(() => saveRequirements(db, "owner", project.id, "brief", revision), /valid expected/);
    const saved = saveRequirements(db, "owner", project.id, "Accessible local state only.", 0);
    assert.equal(saved.revision, 1);
    assert.equal(saveRequirements(db, "owner", project.id, saved.text, 1).revision, 1);
    assert.throws(() => saveRequirements(db, "owner", project.id, "stale", 0), /changed elsewhere/);
    const run = createRun(db, "owner", project.id, "Build a counter with keyboard controls.");
    const snapshot = artifactsFor(db, run.id).find(item => item.name === "project-requirements.json")!;
    assert.deepEqual(JSON.parse(snapshot.content), saved);
    saveRequirements(db, "owner", project.id, "Different users and constraints.", 1);
    assert.equal(JSON.parse(inputForRun(db, run.id, run.intent)).projectRequirements.text, saved.text);
    const cleared = saveRequirements(db, "owner", project.id, "", 2);
    assert.equal(cleared.revision, 3);
    const later = createRun(db, "owner", project.id, "Build another accessible counter.");
    assert.equal(inputForRun(db, later.id, later.intent), later.intent);
    assert.equal(artifactsFor(db, run.id).find(item => item.id === snapshot.id)!.content, snapshot.content);
  } finally { db.close(); }
});
test("planner consumes captured context even after the project brief changes", async () => {
  const { db, project } = fixture(); let received = "";
  saveRequirements(db, "owner", project.id, "Captured project context.", 0);
  const run = createRun(db, "owner", project.id, "Build a local counter.");
  saveRequirements(db, "owner", project.id, "Future context only.", 1);
  const worker = createWorker(db, async input => {
    received = input;
    return { summary: "A local counter", requirements: ["Counter"], architecture: ["React state"], acceptanceCriteria: ["Increment button"], risks: ["No backend"] };
  });
  try { await worker.tick(); assert.equal(JSON.parse(received).projectRequirements.text, "Captured project context."); assert.equal(ownedRun(db, "owner", run.id).status, "awaiting_approval"); }
  finally { worker.stop(); db.close(); }
});
test("v5 upgrades additively and v6 backup restores project requirements and captured run context", async () => {
  const root = mkdtempSync(join(tmpdir(), "nexyral-brief-backup-"));
  const path = join(root, "source.sqlite");
  let db;
  try {
    const f = fixture(path); db = f.db;
    const before = createRun(db, "owner", f.project.id, "An existing legacy run intent.");
    db.exec("DROP TABLE project_requirements; PRAGMA user_version=5;"); db.close(); db = openDatabase(path);
    assert.equal(ownedRun(db, "owner", before.id).intent, before.intent);
    assert.equal(requirementsFor(db, "owner", f.project.id).revision, 0);
    saveRequirements(db, "owner", f.project.id, "Persistent brief after upgrade.", 0);
    const run = createRun(db, "owner", f.project.id, "A new run after migration.");
    const backup = await createBackup(path, join(root, "backups"));
    const restored = join(root, "restored.sqlite"); await restoreBackup(backup, restored);
    const recovered = openDatabase(restored);
    try { assert.equal(requirementsFor(recovered, "owner", f.project.id).text, "Persistent brief after upgrade."); assert.equal(JSON.parse(inputForRun(recovered, run.id, run.intent)).projectRequirements.revision, 1); }
    finally { recovered.close(); }
  } finally { db?.close(); rmSync(root, { recursive: true, force: true }); }
});
