import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type {
  Session,
  EngineeringRun,
  Project,
  RunDetail,
} from "../shared/contracts.ts";
import { createPreviewServer } from "./preview-server.ts";
import { createApp } from "./app.ts";
import { openDatabase } from "./database.ts";
async function fixture(databasePath = ":memory:") {
  const db = openDatabase(databasePath);
  const origin = "http://localhost:5173";
  const previewOptions = { db, origins: [origin], previewOrigin: "http://127.0.0.2:0" };
  const previewServer = createPreviewServer(previewOptions);
  await new Promise<void>((resolve) => previewServer.listen(0, "127.0.0.2", resolve));
  previewOptions.previewOrigin = `http://127.0.0.2:${(previewServer.address() as AddressInfo).port}`;
  const server = createApp({ db, origins: [origin], previewOrigin: previewOptions.previewOrigin });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    cookie?: string,
    csrf?: string,
    customOrigin = origin,
  ) {
    return fetch(url + path, {
      method,
      headers: {
        Origin: customOrigin,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
  async function account(email = "owner@example.test") {
    const response = await request("/api/auth/signup", "POST", {
      name: "Test Owner",
      email,
      password: "correct-horse-account",
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const session = (await response.json()) as Session;
    return { cookie, csrf: session.csrfToken!, session };
  }
  async function close() {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    previewServer.closeAllConnections();
    await new Promise<void>((resolve) => previewServer.close(() => resolve()));
    db.close();
  }
  return { db, request, account, close, url, origin, previewOrigin: previewOptions.previewOrigin };
}
test("account validation, password hashing, sessions, and logout revocation", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request("/api/projects")).status, 401);
    assert.equal(
      (
        await f.request("/api/auth/signup", "POST", {
          name: "Test",
          email: "bad",
          password: "short",
        })
      ).status,
      400,
    );
    const owner = await f.account();
    assert.ok(owner.session.user);
    assert.match(owner.cookie, /^nexyral_session=[a-f0-9]{64}$/);
    const row = f.db.prepare("SELECT password_hash,salt FROM users").get() as {
      password_hash: string;
      salt: string;
    };
    assert.notEqual(row.password_hash, "correct-horse-account");
    assert.equal(row.password_hash.length, 128);
    assert.equal(row.salt.length, 32);
    assert.equal(
      (
        await f.request("/api/auth/signup", "POST", {
          name: "Duplicate",
          email: "owner@example.test",
          password: "another-long-password",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.request("/api/auth/login", "POST", {
          email: "owner@example.test",
          password: "wrong-password",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.request("/api/auth/login", "POST", {
          email: "missing@example.test",
          password: "wrong-password",
        })
      ).status,
      401,
    );
    const login = await f.request(
      "/api/auth/login",
      "POST",
      { email: "OWNER@example.test", password: "correct-horse-account" },
      owner.cookie,
    );
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(login.headers.get("set-cookie")!, /SameSite=Lax/);
    assert.equal(
      (await f.request("/api/projects", "GET", undefined, owner.cookie)).status,
      401,
    );
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const session = (await login.json()) as Session;
    assert.equal(
      (await f.request("/api/projects", "GET", undefined, cookie)).status,
      200,
    );
    assert.equal(
      (
        await f.request(
          "/api/auth/logout",
          "POST",
          {},
          cookie,
          session.csrfToken!,
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.request("/api/projects", "GET", undefined, cookie)).status,
      401,
    );
  } finally {
    await f.close();
  }
});
test("origin and CSRF protections reject mutations", async () => {
  const f = await fixture();
  try {
    const owner = await f.account();
    assert.equal(
      (
        await f.request(
          "/api/auth/login",
          "POST",
          { email: "owner@example.test", password: "correct-horse-account" },
          undefined,
          undefined,
          "https://unrelated.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/projects",
          "POST",
          { name: "Protected project" },
          owner.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/projects",
          "POST",
          { name: "Protected project" },
          owner.cookie,
          "0".repeat(64),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/projects",
          "POST",
          { name: "Protected project" },
          owner.cookie,
          owner.csrf,
          "https://unrelated.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/projects",
          "POST",
          { name: "Protected project" },
          owner.cookie,
          owner.csrf,
        )
      ).status,
      201,
    );
  } finally {
    await f.close();
  }
});
test("owner isolation, persisted intent, ordered events, and idempotent cancellation", async () => {
  const f = await fixture();
  try {
    const owner = await f.account();
    const outsider = await f.account("other@example.test");
    const project = (
      (await (
        await f.request(
          "/api/projects",
          "POST",
          { name: "SupportOS" },
          owner.cookie,
          owner.csrf,
        )
      ).json()) as { project: Project }
    ).project;
    assert.equal(
      (
        await f.request(
          `/api/projects/${project.id}/runs`,
          "GET",
          undefined,
          outsider.cookie,
        )
      ).status,
      404,
    );
    assert.deepEqual(
      (
        (await (
          await f.request("/api/projects", "GET", undefined, outsider.cookie)
        ).json()) as { projects: Project[] }
      ).projects,
      [],
    );
    const intent = "Build an accessible support inbox with ticket ownership.";
    const run = (
      (await (
        await f.request(
          `/api/projects/${project.id}/runs`,
          "POST",
          { intent },
          owner.cookie,
          owner.csrf,
        )
      ).json()) as { run: EngineeringRun }
    ).run;
    assert.equal(run.status, "awaiting_executor");
    assert.equal(run.stage, "intent");
    const detail = (await (
      await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)
    ).json()) as RunDetail;
    assert.equal(detail.artifacts[0].content, intent);
    assert.equal(detail.artifacts[0].kind, "intent");
    assert.equal(detail.executor.available, false);
    assert.deepEqual(
      detail.events.map((event) => event.type),
      ["run.created", "executor.unavailable"],
    );
    assert.ok(detail.events[0].id < detail.events[1].id);
    for (const path of [`/api/runs/${run.id}`, `/api/runs/${run.id}/events`])
      assert.equal(
        (await f.request(path, "GET", undefined, outsider.cookie)).status,
        404,
      );
    assert.equal(
      (
        await f.request(
          `/api/runs/${run.id}/cancel`,
          "POST",
          {},
          outsider.cookie,
          outsider.csrf,
        )
      ).status,
      404,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await f.request(
            `/api/runs/${run.id}/cancel`,
            "POST",
            {},
            owner.cookie,
            owner.csrf,
          )
        ).status,
        200,
      );
    const cancelled = (await (
      await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)
    ).json()) as RunDetail;
    assert.equal(cancelled.run.status, "cancelled");
    assert.equal(
      cancelled.events.filter((event) => event.type === "run.cancelled").length,
      1,
    );
    const projects = (await (
      await f.request("/api/projects", "GET", undefined, owner.cookie)
    ).json()) as { projects: Project[] };
    assert.equal(projects.projects[0].runCount, 1);
  } finally {
    await f.close();
  }
});
test("SSE streams actual persisted events and resumes after Last-Event-ID", async () => {
  const f = await fixture();
  try {
    const owner = await f.account();
    const project = (
      (await (
        await f.request(
          "/api/projects",
          "POST",
          { name: "Event project" },
          owner.cookie,
          owner.csrf,
        )
      ).json()) as { project: Project }
    ).project;
    const run = (
      (await (
        await f.request(
          `/api/projects/${project.id}/runs`,
          "POST",
          { intent: "Build a project with an ordered event stream." },
          owner.cookie,
          owner.csrf,
        )
      ).json()) as { run: EngineeringRun }
    ).run;
    const detail = (await (
      await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)
    ).json()) as RunDetail;
    const controller = new AbortController();
    const response = await fetch(`${f.url}/api/runs/${run.id}/events`, {
      headers: {
        Cookie: owner.cookie,
        "Last-Event-ID": String(detail.events[0].id),
      },
      signal: controller.signal,
    });
    assert.match(response.headers.get("content-type")!, /text\/event-stream/);
    const reader = response.body!.getReader();
    const chunk = await reader.read();
    const text = new TextDecoder().decode(chunk.value);
    assert.match(text, /executor.unavailable/);
    assert.doesNotMatch(text, /run.created/);
    controller.abort();
  } finally {
    await f.close();
  }
});
test("records and sessions survive database close and reopen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nexyral-api-"));
  const path = join(directory, "test.sqlite");
  let f = await fixture(path);
  try {
    const owner = await f.account();
    await f.request(
      "/api/projects",
      "POST",
      { name: "Persistent project" },
      owner.cookie,
      owner.csrf,
    );
    await f.close();
    f = await fixture(path);
    const session = (await (
      await f.request("/api/auth/session", "GET", undefined, owner.cookie)
    ).json()) as Session;
    assert.equal(session.user?.email, "owner@example.test");
    const result = (await (
      await f.request("/api/projects", "GET", undefined, owner.cookie)
    ).json()) as { projects: Project[] };
    assert.equal(result.projects[0].name, "Persistent project");
    f.db.prepare("UPDATE sessions SET expires_at=0").run();
    assert.equal(
      (await f.request("/api/projects", "GET", undefined, owner.cookie)).status,
      401,
    );
  } finally {
    await f.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("auth rate limits, body bounds, and HTTPS cookie attributes", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 20; i++)
      await f.request("/api/auth/login", "POST", {
        email: "missing@example.test",
        password: "bad",
      });
    assert.equal(
      (
        await f.request("/api/auth/login", "POST", {
          email: "missing@example.test",
          password: "bad",
        })
      ).status,
      429,
    );
  } finally {
    await f.close();
  }
  const db = openDatabase(":memory:");
  const server = createApp({ db, origins: ["https://nexyral.example"] });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${url}/api/auth/signup`, {
      method: "POST",
      headers: {
        Origin: "https://nexyral.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Secure user",
        email: "secure@example.test",
        password: "secure-account-password",
      }),
    });
    assert.equal(response.status, 201);
    assert.match(response.headers.get("set-cookie")!, /; Secure/);
    const tooLarge = await fetch(`${url}/api/auth/signup`, {
      method: "POST",
      headers: {
        Origin: "https://nexyral.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ padding: "x".repeat(20000) }),
    });
    assert.equal(tooLarge.status, 413);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
});

test("plan approval endpoint enforces owner, CSRF, exact artifact, and idempotence", async () => {
  const { createWorker } = await import("./worker.ts");
  const f = await fixture();
  const worker = createWorker(f.db, async () => ({ summary: "Inbox", requirements: ["Assign ticket"], architecture: ["Local React state"], acceptanceCriteria: ["Can assign"], risks: ["No backend"] }), async () => { throw new Error("No fixture build requested"); });
  try {
    const owner = await f.account();
    const other = await f.account("other@example.test");
    const projectResponse = await f.request("/api/projects", "POST", { name: "Inbox" }, owner.cookie, owner.csrf);
    const { project } = await projectResponse.json() as { project: Project };
    const runResponse = await f.request(`/api/projects/${project.id}/runs`, "POST", { intent: "Create a client side ticket inbox" }, owner.cookie, owner.csrf);
    const { run } = await runResponse.json() as { run: EngineeringRun };
    await worker.tick();
    const detail = await (await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)).json() as RunDetail;
    let artifact = detail.artifacts.find((item) => item.kind === "plan")!;
    const revision = { artifactId: artifact.id, reason: "Clarify scope", plan: { ...JSON.parse(artifact.content), summary: "Revised inbox" } };
    assert.equal((await f.request(`/api/runs/${run.id}/revise`, "POST", revision, owner.cookie)).status, 403);
    assert.equal((await f.request(`/api/runs/${run.id}/reject`, "POST", { artifactId: artifact.id, reason: "Unsupported scope" }, other.cookie, other.csrf)).status, 404);
    assert.equal((await f.request(`/api/runs/${run.id}/revise`, "POST", revision, owner.cookie, owner.csrf)).status, 200);
    assert.equal((await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: artifact.id }, owner.cookie, owner.csrf)).status, 409);
    const revised = await (await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)).json() as RunDetail;
    artifact = revised.artifacts.filter((item) => item.name === "engineering-plan.json").at(-1)!;
    assert.equal((await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: artifact.id }, owner.cookie)).status, 403);
    assert.equal((await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: artifact.id }, other.cookie, other.csrf)).status, 404);
    assert.equal((await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: "stale" }, owner.cookie, owner.csrf)).status, 409);
    for (let i=0;i<2;i++) assert.equal((await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: artifact.id }, owner.cookie, owner.csrf)).status, 200);
    const updated = await (await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)).json() as RunDetail;
    assert.equal(updated.run.stage, "build");
    assert.equal(updated.events.filter((event) => event.type === "plan.approved").length, 1);
  } finally { await worker.stop(); await f.close(); }
});

test("retained preview and source export enforce ownership, integrity, sandbox headers and persistence", async () => {
  const { createWorker } = await import("./worker.ts");
  const { execFileSync } = await import("node:child_process");
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "nexyral-output-"));
  const dbPath = join(dir, "outputs.sqlite");
  let f = await fixture(dbPath);
  const plan = { summary: "Output fixture", requirements: ["Counter"], architecture: ["React"], acceptanceCriteria: ["Updates"], risks: ["Fixture, not measured compilation"] };
  const source = Object.fromEntries(["src/App.tsx", "src/styles.css", "src/vite-env.d.ts", "src/main.tsx", "index.html", "package.json", "tsconfig.json"].map((path) => [path, path === "src/App.tsx" ? "Controlled source fixture" : ""]));
  const worker = createWorker(f.db, async () => plan, async () => ({ source, preview: { scripts: [{ name: "assets/app.js", content: "document.getElementById('root').textContent='Fixture preview';" }], styles: [] }, verification: { passed: true, checks: [], output: "Controlled fixture", image: "fixture", testsRun: false, deployed: false } }));
  try {
    const owner = await f.account(); const other = await f.account("output-other@example.test");
    const { project } = await (await f.request("/api/projects", "POST", { name: "Output fixture" }, owner.cookie, owner.csrf)).json() as { project: Project };
    const { run } = await (await f.request(`/api/projects/${project.id}/runs`, "POST", { intent: "Create an output fixture counter" }, owner.cookie, owner.csrf)).json() as { run: EngineeringRun };
    assert.equal((await f.request(`/api/runs/${run.id}/preview`, "GET", undefined, owner.cookie)).status, 410);
    await worker.tick();
    const detail = await (await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)).json() as RunDetail;
    const proposal = detail.artifacts.find((artifact) => artifact.name === "engineering-plan.json")!;
    await f.request(`/api/runs/${run.id}/approve`, "POST", { artifactId: proposal.id }, owner.cookie, owner.csrf);
    await worker.tick(); await worker.stop();
    for (const path of ["preview", "source"]) {
      assert.equal((await f.request(`/api/runs/${run.id}/${path}`)).status, 401);
      assert.equal((await f.request(`/api/runs/${run.id}/${path}`, "GET", undefined, other.cookie)).status, 404);
    }
    async function access() {
      const response = await f.request(`/api/runs/${run.id}/preview-access`, "POST", {}, owner.cookie, owner.csrf);
      assert.equal(response.status, 201);
      return await response.json() as { url: string; expiresAt: string };
    }
    assert.equal((await f.request(`/api/runs/${run.id}/preview-access`, "POST", {}, owner.cookie)).status, 403);
    assert.equal((await f.request(`/api/runs/${run.id}/preview-access`, "POST", {}, other.cookie, other.csrf)).status, 404);
    const grant = await access();
    assert.equal(new URL(grant.url).origin, f.previewOrigin);
    const preview = await fetch(grant.url);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("content-security-policy")!, /sandbox allow-scripts/);
    assert.doesNotMatch(preview.headers.get("content-security-policy")!, /allow-same-origin/);
    assert.match(preview.headers.get("content-security-policy")!, /connect-src 'none'/);
    assert.equal(preview.headers.get("cache-control"), "no-store");
    assert.match(await preview.text(), /data:text\/javascript;base64/);
    assert.equal((await fetch(grant.url)).status, 404);
    const expiredGrant = await access();
    f.db.prepare("UPDATE preview_grants SET expires_at=0 WHERE run_id=?").run(run.id);
    assert.equal((await fetch(expiredGrant.url)).status, 404);
    const archive = await f.request(`/api/runs/${run.id}/source`, "GET", undefined, owner.cookie);
    assert.equal(archive.status, 200);
    assert.match(archive.headers.get("content-disposition")!, /attachment/);
    const path = join(dir, "source.tar"); writeFileSync(path, Buffer.from(await archive.arrayBuffer()));
    assert.equal(execFileSync("tar", ["-xOf", path, "src/App.tsx"], { encoding: "utf8" }), source["src/App.tsx"]);
    assert.match(execFileSync("tar", ["-tf", path], { encoding: "utf8" }), /nexyral\/verification.json/);
    const exportedVerification = JSON.parse(execFileSync("tar", ["-xOf", path, "nexyral/verification.json"], { encoding: "utf8" }));
    assert.match(exportedVerification.previewSha256, /^[a-f0-9]{64}$/);
    const completed = await (await f.request(`/api/runs/${run.id}`, "GET", undefined, owner.cookie)).json() as RunDetail;
    assert.equal(completed.outputs?.sourceAvailable, true);
    assert.equal(completed.outputs?.previewAvailable, true);
    assert.ok(completed.outputs?.previewExpiresAt);
    assert.equal(completed.artifacts.some((artifact) => artifact.kind === "preview"), false);
    await f.close(); f = await fixture(dbPath);
    assert.equal((await fetch((await access()).url)).status, 200);
    assert.equal((await f.request(`/api/runs/${run.id}/source`, "GET", undefined, owner.cookie)).status, 200);
    const revoked = await access();
    await f.request("/api/auth/logout", "POST", {}, owner.cookie, owner.csrf);
    assert.equal((await fetch(revoked.url)).status, 404);
    const signedIn = await f.request("/api/auth/login", "POST", { email: "owner@example.test", password: "correct-horse-account" });
    owner.cookie = signedIn.headers.get("set-cookie")!.split(";")[0];
    owner.csrf = (await signedIn.json() as Session).csrfToken!;
    f.db.prepare("UPDATE artifacts SET content='{}' WHERE run_id=? AND name='frontend-preview.json'").run(run.id);
    assert.equal((await f.request(`/api/runs/${run.id}/preview-access`, "POST", {}, owner.cookie, owner.csrf)).status, 409);
    f.db.prepare("UPDATE artifacts SET content='{}' WHERE run_id=? AND name='frontend-source.json'").run(run.id);
    assert.equal((await f.request(`/api/runs/${run.id}/source`, "GET", undefined, owner.cookie)).status, 409);
  } finally { await f.close(); rmSync(dir, { recursive: true, force: true }); }
});
