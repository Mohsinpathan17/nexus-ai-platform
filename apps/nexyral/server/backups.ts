import { DatabaseSync, backup } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, writeFile, lstat, copyFile, chmod, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
interface BackupManifest { version: 1; schema: number; createdAt: string; bytes: number; sha256: string }
async function digest(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function validate(db: DatabaseSync) {
  const schema = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  if (![4, 5, 6, 7].includes(schema)) throw new Error("Backup requires supported schema v4, v5, v6 or v7.");
  const integrity = db.prepare("PRAGMA integrity_check").all() as { integrity_check: string }[];
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("Database integrity validation failed.");
  return schema;
}
async function regularFile(path: string) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Expected a regular database file.");
  return stat;
}
export async function createBackup(source: string, root: string) {
  source = resolve(source);
  await regularFile(source);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = join(resolve(root), `backup-${Date.now()}-${randomUUID()}`);
  await mkdir(directory, { mode: 0o700 });
  const destination = join(directory, "database.sqlite");
  const reserved = await open(destination, "wx", 0o600); await reserved.close();
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, destination);
    const snapshot = new DatabaseSync(destination, { readOnly: true });
    let schema: number;
    try { schema = validate(snapshot); } finally { snapshot.close(); }
    const manifest: BackupManifest = { version: 1, schema, createdAt: new Date().toISOString(), bytes: (await regularFile(destination)).size, sha256: await digest(destination) };
    await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx", mode: 0o600 });
    return directory;
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
  finally { db.close(); }
}
export async function restoreBackup(directory: string, destination: string) {
  const source = join(resolve(directory), "database.sqlite");
  const stat = await regularFile(source);
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as BackupManifest;
  if (manifest.version !== 1 || ![4, 5, 6, 7].includes(manifest.schema) || manifest.bytes !== stat.size || manifest.sha256 !== await digest(source))
    throw new Error("Backup manifest or checksum validation failed.");
  const snapshot = new DatabaseSync(source, { readOnly: true });
  try { validate(snapshot); } finally { snapshot.close(); }
  destination = resolve(destination);
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  // Refuse all existing files; never replace a live database or its WAL.
  const reserved = await open(destination, "wx", 0o600); await reserved.close();
  let db: DatabaseSync | undefined;
  try {
    await copyFile(source, destination);
    await chmod(destination, 0o600);
    if (await digest(destination) !== manifest.sha256) throw new Error("Restored copy checksum mismatch.");
    db = new DatabaseSync(destination);
    db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;");
    if ((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version >= 5) db.exec("DELETE FROM password_resets;");
    if ((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version >= 7) db.exec("DELETE FROM email_verification_grants;");
    db.exec("DELETE FROM preview_grants; DELETE FROM sessions; DELETE FROM worker_lease; DELETE FROM worker_capabilities;");
    const interrupted = db.prepare("SELECT id FROM runs WHERE status='running'").all() as { id: string }[];
    const now = new Date().toISOString();
    for (const { id } of interrupted) {
      db.prepare("UPDATE runs SET status='failed',updated_at=? WHERE id=?").run(now, id);
      db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(id, "worker.failed", "Run interrupted by database recovery. No automatic retry was performed.", now);
    }
    db.exec("COMMIT;");
    validate(db);
    return { destination, interruptedRuns: interrupted.length, sessionsRevoked: true };
  } catch (error) {
    db?.close(); db = undefined;
    await rm(destination, { force: true });
    for (const suffix of ["-wal", "-shm", "-journal"]) await rm(destination + suffix, { force: true });
    throw error;
  } finally { db?.close(); }
}
