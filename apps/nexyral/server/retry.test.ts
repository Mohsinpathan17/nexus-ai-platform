import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Session, EngineeringRun } from "../shared/contracts.ts";
import { openDatabase } from "./database.ts";
import { createRun, createProject, artifactsFor, eventsFor, ownedRun } from "./runs.ts";
import { saveRequirements, inputForRun } from "./project-requirements.ts";
import { createWorker } from "./worker.ts";
import { createApp } from "./app.ts";
function fixture() {
  const db = openDatabase(":memory:");
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run("owner", "Owner", "owner@retry.test", "hash", "salt", new Date().toISOString());
  return { db, project: createProject(db, "owner", "Retry workspace") };
}
test("retry is idempotent, preserves source evidence and captured context, and copies no approvals or results", () => {
  const { db, project } = fixture();
  try {
    saveRequirements(db, "owner", project.id, "Original captured constraints.", 0);
    const source = createRun(db, "owner", project.id, "Build an accessible local counter.");
    assert.throws(() => createRun(db, "owner", project.id, source.intent, { sourceId: source.id, requestId: randomUUID() }), /Only failed or cancelled/);
    db.prepare("UPDATE runs SET status='failed',stage='verify' WHERE id=?").run(source.id);
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), source.id, "approved-plan.json", "plan", "{}", source.createdAt);
    saveRequirements(db, "owner", project.id, "New context for future projects.", 1);
    const before = { run: ownedRun(db, "owner", source.id), events: eventsFor(db, source.id), artifacts: artifactsFor(db, source.id) };
    const requestId = randomUUID();
    const first = createRun(db, "owner", project.id, source.intent, { sourceId: source.id, requestId });
    const second = createRun(db, "owner", project.id, source.intent, { sourceId: source.id, requestId });
    assert.equal(first.created, true); assert.equal(second.created, false); assert.equal(first.run.id, second.run.id);
    assert.equal(first.run.status, "awaiting_executor"); assert.equal(first.run.stage, "intent");
    assert.equal(JSON.parse(inputForRun(db, first.run.id, source.intent)).projectRequirements.text, "Original captured constraints.");
    assert.equal(artifactsFor(db, first.run.id).some(item => item.name === "approved-plan.json" || item.kind === "verification"), false);
    assert.deepEqual({ run: ownedRun(db, "owner", source.id), events: eventsFor(db, source.id), artifacts: artifactsFor(db, source.id) }, before);
    assert.throws(() => createRun(db, "owner", project.id, "Different retry request intent.", { sourceId: source.id, requestId }), /already used/);
  } finally { db.close(); }
});
test("a connected builder cannot execute a retried run until its new proposal is approved", async () => {
  const { db, project } = fixture(); let builds = 0;
  const source = createRun(db, "owner", project.id, "Create a local counter interface.");
  db.prepare("UPDATE runs SET status='cancelled' WHERE id=?").run(source.id);
  saveRequirements(db, "owner", project.id, "Added later, not the source context.", 0);
  const child = createRun(db, "owner", project.id, source.intent, { sourceId: source.id, requestId: randomUUID() }).run;
  assert.equal(inputForRun(db, child.id, child.intent), source.intent);
  const worker = createWorker(db, async () => ({ summary: "A counter", requirements: ["Local counter"], architecture: ["React"], acceptanceCriteria: ["Increment"], risks: ["No backend"] }), async () => { builds++; throw new Error("Unapproved build must not execute"); });
  try { await worker.tick(); await worker.tick(); assert.equal(ownedRun(db, "owner", child.id).status, "awaiting_approval"); assert.equal(builds, 0); }
  finally { worker.stop(); db.close(); }
});
test("retry endpoint enforces ownership, Origin, CSRF and bounds and deduplicates concurrent HTTP requests", async () => {
  const db = openDatabase(":memory:"); const origin = "http://localhost:5173";
  const server = createApp({ db, origins: [origin] });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function account(email: string) {
    const response = await fetch(`${base}/api/auth/signup`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Retry owner", email, password: "a-long-retry-account-password" }) });
    return { cookie: response.headers.get("set-cookie")!.split(";")[0], session: await response.json() as Session };
  }
  try {
    const owner = await account("owner@retry.test"); const other = await account("other@retry.test");
    const project = createProject(db, owner.session.user!.id, "Owner project");
    const source = createRun(db, owner.session.user!.id, project.id, "Build a local keyboard accessible counter.");
    db.prepare("UPDATE runs SET status='cancelled' WHERE id=?").run(source.id);
    const url = `${base}/api/runs/${source.id}/retry`;
    const payload = { intent: source.intent, requestId: randomUUID() };
    const send = (body: unknown, cookie = owner.cookie, csrf = owner.session.csrfToken!, requestOrigin = origin) => fetch(url, { method: "POST", headers: { Cookie: cookie, Origin: requestOrigin, "X-CSRF-Token": csrf, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await send(payload, other.cookie, other.session.csrfToken!)).status, 404);
    assert.equal((await send(payload, owner.cookie, "wrong")).status, 403);
    assert.equal((await send(payload, owner.cookie, owner.session.csrfToken!, "https://foreign.invalid")).status, 403);
    assert.equal((await send({ ...payload, requestId: "invalid" })).status, 400);
    assert.equal((await send({ ...payload, intent: "short" })).status, 400);
    const results = await Promise.all([send(payload), send(payload)]);
    assert.deepEqual(results.map(item => item.status).sort(), [200, 201]);
    const children = await Promise.all(results.map(item => item.json() as Promise<{ run: EngineeringRun }>));
    assert.equal(children[0].run.id, children[1].run.id);
    assert.equal((db.prepare("SELECT count(*) AS count FROM runs").get() as { count: number }).count, 2);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
