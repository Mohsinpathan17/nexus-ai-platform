import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Project, Session } from "../shared/contracts.ts";
import { openDatabase } from "./database.ts";
import { createApp } from "./app.ts";
import { createRun, eventsFor, artifactsFor } from "./runs.ts";

test("project rename requires owner, Origin and CSRF; rejects invalid/stale changes and preserves run evidence", async () => {
  const db = openDatabase(":memory:");
  const origin = "http://localhost:5173";
  const server = createApp({ db, origins: [origin] });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function account(email: string) {
    const response = await fetch(`${base}/api/auth/signup`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Project Owner", email, password: "a-long-project-password" }) });
    assert.equal(response.status, 201);
    return { cookie: response.headers.get("set-cookie")!.split(";")[0], session: await response.json() as Session };
  }
  try {
    const owner = await account("owner@projects.test"); const other = await account("other@projects.test");
    const created = await fetch(`${base}/api/projects`, { method: "POST", headers: { Origin: origin, Cookie: owner.cookie, "Content-Type": "application/json", "X-CSRF-Token": owner.session.csrfToken! }, body: JSON.stringify({ name: "Original project" }) });
    const { project } = await created.json() as { project: Project };
    const run = createRun(db, owner.session.user!.id, project.id, "Build an accessible project workspace.");
    const before = { events: eventsFor(db, run.id), artifacts: artifactsFor(db, run.id) };
    const path = `${base}/api/projects/${project.id}`;
    const briefPath = `${path}/requirements`;
    const patchBrief = (body: unknown, cookie = owner.cookie, csrf = owner.session.csrfToken!, requestOrigin = origin) => fetch(briefPath, { method: "PATCH", headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
    assert.equal((await fetch(briefPath)).status, 401);
    assert.equal((await fetch(briefPath, { headers: { Cookie: other.cookie } })).status, 404);
    assert.equal((await patchBrief({ text: "foreign", expectedRevision: 0 }, other.cookie, other.session.csrfToken!)).status, 404);
    assert.equal((await patchBrief({ text: "bad csrf", expectedRevision: 0 }, owner.cookie, "wrong")).status, 403);
    assert.equal((await patchBrief({ text: "bad origin", expectedRevision: 0 }, owner.cookie, owner.session.csrfToken!, "https://other.invalid")).status, 403);
    assert.equal((await patchBrief({ text: "x".repeat(6001), expectedRevision: 0 })).status, 400);
    assert.equal((await patchBrief({ text: "valid", expectedRevision: 0.5 })).status, 400);
    assert.equal((await patchBrief({ text: "  Accessible local-state requirements.  ", expectedRevision: 0 })).status, 200);
    assert.equal((await patchBrief({ text: "stale", expectedRevision: 0 })).status, 409);
    assert.equal((await fetch(briefPath, { headers: { Cookie: owner.cookie } })).status, 200);
    const patch = (body: unknown, cookie = owner.cookie, csrf = owner.session.csrfToken!, requestOrigin = origin) => fetch(path, { method: "PATCH", headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { Cookie: other.cookie } })).status, 404);
    assert.equal((await patch({ name: "Unauthorized", expectedName: project.name }, other.cookie, other.session.csrfToken!)).status, 404);
    assert.equal((await patch({ name: "Unauthorized", expectedName: project.name }, owner.cookie, "wrong")).status, 403);
    assert.equal((await patch({ name: "Unauthorized", expectedName: project.name }, owner.cookie, owner.session.csrfToken!, "https://other.invalid")).status, 403);
    for (const name of [" ", "x".repeat(101), null]) assert.equal((await patch({ name, expectedName: project.name })).status, 400);
    assert.equal((await patch({ name: "Missing expectation" })).status, 400);
    const renamed = await patch({ name: "  Renamed project  ", expectedName: project.name });
    assert.equal(renamed.status, 200);
    assert.deepEqual((await renamed.json() as { project: Project }).project, { ...project, name: "Renamed project", runCount: 1 });
    assert.equal((await patch({ name: "Stale edit", expectedName: project.name })).status, 409);
    const detail = await fetch(path, { headers: { Cookie: owner.cookie } });
    assert.equal((await detail.json() as { project: Project }).project.name, "Renamed project");
    assert.deepEqual({ events: eventsFor(db, run.id), artifacts: artifactsFor(db, run.id) }, before);
    assert.equal((await fetch(`${path}/runs`, { headers: { Cookie: owner.cookie } })).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
