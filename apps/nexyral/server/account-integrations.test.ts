import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.ts";
import { openDatabase } from "./database.ts";
import type { Session } from "../shared/contracts.ts";
import { configuredMail } from "./account-mail.ts";
import { githubIdentity } from "./github-auth.ts";
async function fixture(mail = false) {
  const db = openDatabase(":memory:"); const origins = ["http://127.0.0.1:0"];
  const github = { appOrigin: origins[0], clientId: "fixture-client", clientSecret: "fixture-secret" };
  const messages: { to: string; subject: string; text: string }[] = [];
  let identity = { id: "100", name: "GitHub Owner", email: "github@fixture.test" };
  let onExchange = () => {}, failMail = false;
  const server = createApp({ db, origins, github, githubExchange: async () => { onExchange(); return identity; }, ...(mail ? { mail: { origin: origins[0], send: async (to, subject, text) => { if (failMail) throw new Error("Fixture delivery failure"); messages.push({ to, subject, text }); } } } : {}) });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; origins[0] = origin; github.appOrigin = origin;
  const post = (path: string, body: unknown, cookie = "", csrf = "", from = origin) => fetch(origin + path, { method: "POST", headers: { Origin: from, Cookie: cookie, "X-CSRF-Token": csrf, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const close = async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); };
  return { db, origin, messages, post, close, setIdentity: (value: typeof identity) => { identity = value; }, onExchange: (handler: () => void) => { onExchange = handler; }, failMail: () => { failMail = true; } };
}
test("revoking an account session while GitHub responds prevents linking or reauthentication", async () => {
  const f = await fixture();
  try {
    const created = await f.post("/api/auth/signup", { name: "Email Owner", email: "email@fixture.test", password: "a-long-integration-password" });
    const cookie = created.headers.get("set-cookie")!.split(";")[0], session = await created.json() as Session;
    f.setIdentity({ id: "200", name: "Email Owner", email: "email@fixture.test" });
    const begin = await f.post("/api/auth/github/connect", {}, cookie, session.csrfToken!);
    const state = new URL((await begin.json() as { url: string }).url).searchParams.get("state");
    f.onExchange(() => { f.db.prepare("DELETE FROM sessions WHERE user_id=?").run(session.user!.id); });
    const response = await fetch(`${f.origin}/api/auth/github/callback?state=${state}&code=x`, { headers: { Cookie: cookie + "; " + begin.headers.get("set-cookie")!.split(";")[0] }, redirect: "manual" });
    assert.equal(response.headers.get("location"), f.origin + "/login?github=failed");
    assert.equal(f.db.prepare("SELECT user_id FROM github_identities").get(), undefined);
    assert.equal(f.db.prepare("SELECT token_hash FROM sessions").get(), undefined);
  } finally { await f.close(); }
});
test("failed verification delivery keeps the account but invalidates its unsent link", async () => {
  const f = await fixture(true); f.failMail();
  try {
    const response = await f.post("/api/auth/signup", { name: "Mail Owner", email: "failure@fixture.test", password: "a-long-integration-password" });
    assert.equal(response.status, 201); assert.equal((await response.json() as Session).emailDelivery, "failed");
    assert.ok(f.db.prepare("SELECT id FROM users WHERE email='failure@fixture.test'").get());
    assert.equal(f.db.prepare("SELECT token_hash FROM email_verification_grants").get(), undefined);
  } finally { await f.close(); }
});
test("GitHub callbacks bind the browser, rotate sessions, reject replay and require explicit existing-account linking", async () => {
  const f = await fixture();
  try {
    const begin = await fetch(f.origin + "/api/auth/github/start", { redirect: "manual" });
    const authorization = new URL(begin.headers.get("location")!);
    assert.equal(authorization.origin, "https://github.com"); assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorization.searchParams.get("scope"), "read:user user:email");
    const state = authorization.searchParams.get("state")!;
    const cookie = begin.headers.get("set-cookie")!.split(";")[0];
    const callback = `${f.origin}/api/auth/github/callback?state=${state}&code=fixture-code`;
    const completed = await fetch(callback, { headers: { Cookie: cookie }, redirect: "manual" });
    assert.equal(completed.status, 303); assert.equal(completed.headers.get("location"), f.origin + "/workspace");
    const sessionCookie = completed.headers.getSetCookie().find(value => value.startsWith("nexyral_session="))!.split(";")[0];
    const session = await (await fetch(f.origin + "/api/auth/session", { headers: { Cookie: sessionCookie } })).json() as Session;
    assert.equal(session.githubConnected, true); assert.equal(session.emailVerified, true);
    assert.equal((await fetch(callback, { headers: { Cookie: cookie }, redirect: "manual" })).headers.get("location"), f.origin + "/login?github=failed");
    const other = await fetch(f.origin + "/api/auth/github/start", { redirect: "manual" });
    const otherState = new URL(other.headers.get("location")!).searchParams.get("state");
    assert.equal((await fetch(`${f.origin}/api/auth/github/callback?state=${otherState}&code=x`, { redirect: "manual" })).headers.get("location"), f.origin + "/login?github=failed");
    const signup = await f.post("/api/auth/signup", { name: "Email Owner", email: "email@fixture.test", password: "a-long-integration-password" });
    const accountCookie = signup.headers.get("set-cookie")!.split(";")[0], account = await signup.json() as Session;
    f.setIdentity({ id: "200", name: "Email Owner", email: "email@fixture.test" });
    const collision = await fetch(f.origin + "/api/auth/github/start", { redirect: "manual" });
    const collisionState = new URL(collision.headers.get("location")!).searchParams.get("state");
    const rejected = await fetch(`${f.origin}/api/auth/github/callback?state=${collisionState}&code=x`, { headers: { Cookie: collision.headers.get("set-cookie")!.split(";")[0] }, redirect: "manual" });
    assert.equal(rejected.headers.get("location"), f.origin + "/login?github=link-required");
    assert.equal((await f.post("/api/auth/github/connect", {}, accountCookie, "wrong")).status, 403);
    const connect = await f.post("/api/auth/github/connect", {}, accountCookie, account.csrfToken!);
    const connectState = new URL((await connect.json() as { url: string }).url).searchParams.get("state");
    const linked = await fetch(`${f.origin}/api/auth/github/callback?state=${connectState}&code=x`, { headers: { Cookie: accountCookie + "; " + connect.headers.get("set-cookie")!.split(";")[0] }, redirect: "manual" });
    assert.equal(linked.headers.get("location"), f.origin + "/workspace");
    assert.equal((f.db.prepare("SELECT user_id FROM github_identities WHERE github_id='200'").get() as { user_id: string }).user_id, account.user!.id);
  } finally { await f.close(); }
});
test("mail grants verify once, gate writes, revoke sessions on reset and do not enumerate recipients", async () => {
  const f = await fixture(true);
  try {
    const created = await f.post("/api/auth/signup", { name: "Mail Owner", email: "mail@fixture.test", password: "a-long-integration-password" });
    const cookie = created.headers.get("set-cookie")!.split(";")[0], session = await created.json() as Session;
    assert.equal(session.emailDelivery, "sent"); assert.equal(session.emailVerified, false);
    const token = f.messages[0].text.match(/token=([a-f0-9]{64})/)![1];
    assert.equal(JSON.stringify(f.db.prepare("SELECT * FROM email_verification_grants").all()).includes(token), false);
    assert.equal((await f.post("/api/projects", { name: "Mail project" }, cookie, session.csrfToken!)).status, 403);
    assert.equal((await f.post("/api/auth/verify-email", { token }, "", "", "https://foreign.test")).status, 403);
    assert.equal((await f.post("/api/auth/verify-email", { token })).status, 200);
    assert.equal((await f.post("/api/auth/verify-email", { token })).status, 400);
    assert.equal((await f.post("/api/projects", { name: "Mail project" }, cookie, session.csrfToken!)).status, 201);
    const known = await f.post("/api/auth/request-recovery", { email: "mail@fixture.test" });
    const unknown = await f.post("/api/auth/request-recovery", { email: "missing@fixture.test" });
    assert.equal(known.status, 202); assert.deepEqual(await known.json(), await unknown.json());
    const recovery = f.messages.at(-1)!.text.match(/token=([a-f0-9]{64})/)![1];
    assert.equal((await f.post("/api/auth/recovery", { token: recovery, password: "updated-integration-password" })).status, 200);
    const expiredSession = await (await fetch(f.origin + "/api/auth/session", { headers: { Cookie: cookie } })).json() as Session;
    assert.equal(expiredSession.user, null);
  } finally { await f.close(); }
});
test("GitHub rejects unverified emails and SMTP configuration never permits plaintext or invalid senders", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(JSON.stringify(String(url).includes("access_token") ? { access_token: "fixture" } : String(url).endsWith("/emails") ? [{ primary: true, verified: false, email: "x@test.example" }] : { id: 10, login: "test" }));
  try { await assert.rejects(githubIdentity({ clientId: "fixture", clientSecret: "fixture", appOrigin: "https://app.test" }, "code", "verifier"), /Verified primary/); }
  finally { globalThis.fetch = previousFetch; }
  const old = process.env.NEXYRAL_SMTP_HOST;
  process.env.NEXYRAL_SMTP_HOST = "smtp.test";
  try { assert.throws(() => configuredMail("http://app.test"), /Configure/); }
  finally { if (old === undefined) delete process.env.NEXYRAL_SMTP_HOST; else process.env.NEXYRAL_SMTP_HOST = old; }
});
