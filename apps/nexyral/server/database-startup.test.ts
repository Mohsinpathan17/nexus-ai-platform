import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./database.ts";

test("opening a database waits for another process's schema lock and preserves data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexyral-startup-lock-"));
  const path = join(directory, "workspace.sqlite");
  const seed = new DatabaseSync(path);
  seed.exec("CREATE TABLE retained_fixture(value TEXT); INSERT INTO retained_fixture VALUES('preserved');"); seed.close();
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import { DatabaseSync } from 'node:sqlite';
    const db = new DatabaseSync(process.argv[1]);
    db.exec('BEGIN EXCLUSIVE');
    process.stdout.write('locked');
    setTimeout(() => { db.exec('COMMIT'); db.close(); }, 500);
  `, path], { stdio: ["ignore", "pipe", "pipe"] });
  const closed = new Promise<number | null>(resolve => child.once("close", resolve));
  try {
    await new Promise<void>((resolve, reject) => {
      child.stdout.once("data", () => resolve());
      child.once("error", reject);
      child.once("exit", code => { if (code !== 0) reject(new Error("Lock fixture failed")); });
    });
    const db = openDatabase(path);
    try {
      assert.equal((db.prepare("SELECT value FROM retained_fixture").get() as { value: string }).value, "preserved");
      assert.equal((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 7);
    } finally { db.close(); }
    assert.equal(await closed, 0);
  } finally {
    child.kill(); await closed;
    await rm(directory, { recursive: true, force: true });
  }
});
