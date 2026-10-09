import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database.ts";
import { createProject, createRun } from "./runs.ts";
import { createBackup, restoreBackup } from "./backups.ts";
import { issueRecovery } from "./password-recovery.ts";
test("online WAL backup restores project evidence, revokes access and fails interrupted runs without altering the source", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexyral-backup-"));
  const source = join(root, "source.sqlite"); const db = openDatabase(source);
  try {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run("owner", "Owner", "owner@fixture.test", "hash", "salt", now);
    db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run("session", "owner", "csrf", Date.now() + 60_000);
    issueRecovery(db, "owner@fixture.test");
    db.prepare("INSERT INTO verified_emails VALUES(?,?)").run("owner", now);
    db.prepare("INSERT INTO github_identities VALUES(?,?)").run("100", "owner");
    db.prepare("INSERT INTO email_verification_grants VALUES(?,?,?)").run("verification-hash", "owner", Date.now() + 60000);
    const project = createProject(db, "owner", "Preserved project");
    const run = createRun(db, "owner", project.id, "Preserve this engineering evidence across recovery");
    db.prepare("UPDATE runs SET status='running' WHERE id=?").run(run.id);
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run("artifact", run.id, "frontend-source.json", "patch", "exact source content", now);
    db.prepare("INSERT INTO preview_grants VALUES(?,?,?,?,?,?)").run("grant", run.id, "session", "owner", "https://app.fixture.test", Date.now()+60_000);
    db.prepare("INSERT INTO worker_lease VALUES(1,?,?)").run("worker", Date.now()+60_000);
    db.prepare("INSERT INTO worker_capabilities VALUES(?,1)").run("worker");
    const directory = await createBackup(source, join(root, "backups"));
    // A post-backup mutation must not enter the captured snapshot.
    db.prepare("UPDATE projects SET name='Changed after snapshot' WHERE id=?").run(project.id);
    const destination = join(root, "recovered.sqlite");
    const result = await restoreBackup(directory, destination);
    assert.equal(result.interruptedRuns, 1);
    assert.equal((await stat(destination)).mode & 0o777, 0o600);
    const recovered = openDatabase(destination);
    try {
      assert.equal((recovered.prepare("SELECT name FROM projects").get() as { name: string }).name, "Preserved project");
      assert.equal((recovered.prepare("SELECT content FROM artifacts WHERE id='artifact'").get() as { content: string }).content, "exact source content");
      assert.equal((recovered.prepare("SELECT status FROM runs").get() as { status: string }).status, "failed");
      assert.equal((recovered.prepare("SELECT github_id FROM github_identities WHERE user_id='owner'").get() as { github_id: string }).github_id, "100");
      assert.ok(recovered.prepare("SELECT user_id FROM verified_emails WHERE user_id='owner'").get());
      for (const table of ["sessions", "preview_grants", "password_resets", "email_verification_grants", "worker_lease", "worker_capabilities"])
        assert.equal((recovered.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count, 0);
    } finally { recovered.close(); }
    assert.equal((db.prepare("SELECT status FROM runs").get() as { status: string }).status, "running");
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM sessions").get() as { count: number }).count, 1);
    await assert.rejects(restoreBackup(directory, source), /EEXIST/);
    assert.equal((db.prepare("SELECT name FROM projects").get() as { name: string }).name, "Changed after snapshot");
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
test("a pre-recovery v4 backup remains restorable and upgrades additively", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexyral-legacy-backup-"));
  const source = join(root, "legacy.sqlite"); const db = openDatabase(source);
  try {
    db.exec("DROP TABLE password_resets; PRAGMA user_version=4;");
    const directory = await createBackup(source, join(root, "backups"));
    const destination = join(root, "restored.sqlite"); await restoreBackup(directory, destination);
    const recovered = openDatabase(destination);
    try { assert.equal((recovered.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 7); }
    finally { recovered.close(); }
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
test("tampered snapshot is rejected before creating a restore destination", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexyral-tamper-"));
  const source = join(root, "source.sqlite"); const db = openDatabase(source);
  try {
    const directory = await createBackup(source, join(root, "backups"));
    const file = join(directory, "database.sqlite"); const bytes = await readFile(file);
    bytes[bytes.length - 1] ^= 1; await writeFile(file, bytes);
    const destination = join(root, "recovered.sqlite");
    await assert.rejects(restoreBackup(directory, destination), /checksum/);
    await assert.rejects(stat(destination), /ENOENT/);
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
