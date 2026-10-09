import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import { openDatabase } from "./database.ts";
import { createApp } from "./app.ts";
import { issueRecovery, resetPassword } from "./password-recovery.ts";
import { createProject, createRun } from "./runs.ts";
async function fixture() {
  const db = openDatabase(":memory:"); const origin = "http://app.fixture.test";
  const server = createApp({ db, origins: [origin] });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, requestOrigin = origin) => fetch(base + path, { method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const signup = await post("/api/auth/signup", { name: "Owner", email: "owner@fixture.test", password: "original-password-123" });
  const session = await signup.json() as { user: { id: string } };
  const cookie = signup.headers.get("set-cookie")!.split(";")[0];
  return { db, post, base, cookie, userId: session.user.id, close: async () => { await new Promise<void>(resolve => server.close(() => resolve())); db.close(); } };
}
test("one-time recovery changes credentials and revokes sessions without exposing tokens in database", async () => {
  const f = await fixture();
  try {
    const grant = issueRecovery(f.db, "owner@fixture.test");
    const project = createProject(f.db, f.userId, "Recovery fixture");
    const run = createRun(f.db, f.userId, project.id, "Verify session-bound preview access is revoked on password reset");
    const sessionHash = (f.db.prepare("SELECT token_hash FROM sessions WHERE user_id=?").get(f.userId) as { token_hash: string }).token_hash;
    f.db.prepare("INSERT INTO preview_grants VALUES(?,?,?,?,?,?)").run("fixture-grant", run.id, sessionHash, f.userId, "http://app.fixture.test", Date.now()+60_000);
    const row = f.db.prepare("SELECT token_hash FROM password_resets").get() as { token_hash: string };
    assert.notEqual(row.token_hash, grant.token);
    assert.equal(row.token_hash, createHash("sha256").update(grant.token).digest("hex"));
    const response = await f.post("/api/auth/recovery", { token: grant.token, password: "updated-password-456" });
    assert.equal(response.status, 200);
    assert.equal((f.db.prepare("SELECT COUNT(*) AS count FROM preview_grants").get() as { count: number }).count, 0);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
    const session = await fetch(f.base + "/api/auth/session", { headers: { Cookie: f.cookie } });
    assert.equal((await session.json() as { user: unknown }).user, null);
    assert.equal((await f.post("/api/auth/login", { email: "owner@fixture.test", password: "original-password-123" })).status, 401);
    assert.equal((await f.post("/api/auth/login", { email: "owner@fixture.test", password: "updated-password-456" })).status, 200);
    assert.equal((await f.post("/api/auth/recovery", { token: grant.token, password: "another-password-789" })).status, 400);
  } finally { await f.close(); }
});
test("expired, superseded and racing recovery requests cannot reuse a grant; invalid Origin cannot mutate", async () => {
  const f = await fixture();
  try {
    const expired = issueRecovery(f.db, "owner@fixture.test", Date.now() - 16 * 60_000);
    await assert.rejects(resetPassword(f.db, { token: expired.token, password: "updated-password-456" }), /invalid or expired/);
    const old = issueRecovery(f.db, "owner@fixture.test"); const current = issueRecovery(f.db, "owner@fixture.test");
    await assert.rejects(resetPassword(f.db, { token: old.token, password: "updated-password-456" }), /invalid or expired/);
    assert.equal((await f.post("/api/auth/recovery", { token: current.token, password: "updated-password-456" }, "https://attacker.fixture.test")).status, 403);
    const results = await Promise.allSettled([resetPassword(f.db, { token: current.token, password: "racing-password-one" }), resetPassword(f.db, { token: current.token, password: "racing-password-two" })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
  } finally { await f.close(); }
});
test("recovery endpoint bounds attempts and does not offer unauthenticated issuance", async () => {
  const f = await fixture();
  try {
    for (let index = 0; index < 5; index++) assert.equal((await f.post("/api/auth/recovery", { token: "0".repeat(64), password: "updated-password-456" })).status, 400);
    assert.equal((await f.post("/api/auth/recovery", { token: "0".repeat(64), password: "updated-password-456" })).status, 429);
    assert.equal((await f.post("/api/auth/recovery/request", { email: "owner@fixture.test" })).status, 401);
  } finally { await f.close(); }
});
