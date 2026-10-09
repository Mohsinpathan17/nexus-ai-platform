import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { openDatabase } from "./database.ts";
import { createProject, createRun, cancelRun, approvePlan, reviewPlan, artifactsFor, eventsFor, ownedRun } from "./runs.ts";
import { createWorker, executorState } from "./worker.ts";
import { ollamaPlanner, validatePlan } from "./planner.ts";
const plan = { summary: "Support inbox", requirements: ["Assign tickets"], architecture: ["Typed API"], acceptanceCriteria: ["Owner can assign ticket"], risks: ["Authentication requires review"] };
function fixture() {
  const db = openDatabase(":memory:");
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run("owner", "Owner", "owner@test", "hash", "salt", new Date().toISOString());
  const project = createProject(db, "owner", "Inbox");
  const run = createRun(db, "owner", project.id, "Build an accessible customer support inbox.");
  return { db, run };
}
test("local provider HTTP contract produces a persisted reviewable plan, never executes code", async () => {
  let received: unknown;
  const provider = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received = JSON.parse(body);
    assert.equal(req.url, "/api/chat");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ done: true, message: { content: JSON.stringify(plan) } }));
  });
  await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
  const f = fixture();
  const worker = createWorker(f.db, ollamaPlanner("fixture-model", `http://127.0.0.1:${(provider.address() as AddressInfo).port}`));
  try {
    assert.equal(executorState(f.db).available, false);
    await worker.tick();
    assert.equal(executorState(f.db).available, true);
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "awaiting_approval");
    assert.deepEqual(JSON.parse(artifactsFor(f.db, f.run.id)[1].content), plan);
    assert.deepEqual(eventsFor(f.db, f.run.id).slice(-2).map((e) => e.type), ["worker.started", "plan.ready"]);
    assert.equal((received as { model: string }).model, "fixture-model");
    assert.deepEqual((received as { format: { required: string[] } }).format.required,
      ["summary", "requirements", "architecture", "acceptanceCriteria", "risks"]);
    await worker.tick();
    assert.equal(artifactsFor(f.db, f.run.id).length, 2);
  } finally {
    await worker.stop();
    assert.equal(executorState(f.db).available, false);
    f.db.close();
    provider.closeAllConnections();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
  }
});
test("cancellation aborts active planning and never persists late output", async () => {
  const f = fixture();
  let aborted = false;
  const worker = createWorker(f.db, async (_, signal) => new Promise((resolve) => {
    signal.addEventListener("abort", () => { aborted = true; resolve(plan); }, { once: true });
  }));
  try {
    const running = worker.tick();
    cancelRun(f.db, "owner", f.run.id);
    await running;
    assert.equal(aborted, true);
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "cancelled");
    assert.equal(artifactsFor(f.db, f.run.id).length, 1);
    assert.equal(eventsFor(f.db, f.run.id).at(-1)?.type, "run.cancelled");
  } finally { await worker.stop(); f.db.close(); }
});
test("malformed proposals fail with sanitized persisted evidence", async () => {
  const f = fixture();
  const worker = createWorker(f.db, async () => { throw new Error("secret credential or private provider detail"); });
  try {
    await worker.tick();
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "failed");
    assert.equal(artifactsFor(f.db, f.run.id).length, 1);
    assert.doesNotMatch(eventsFor(f.db, f.run.id).at(-1)!.message, /secret credential/);
    assert.throws(() => validatePlan({ ...plan, risks: [] }));
    assert.throws(() => validatePlan({ ...plan, requirements: [42] }));
  } finally { await worker.stop(); f.db.close(); }
});
test("only one worker claims a run; expired leases recover interrupted work without retry", async () => {
  const f = fixture();
  let calls = 0;
  const first = createWorker(f.db, async () => { calls++; return plan; });
  const second = createWorker(f.db, async () => { calls++; return plan; });
  try {
    assert.equal(first.heartbeat(), true);
    await second.tick();
    assert.equal(calls, 0);
    f.db.prepare("UPDATE runs SET status='running',stage='plan' WHERE id=?").run(f.run.id);
    f.db.prepare("UPDATE worker_lease SET expires_at=0").run();
    await second.tick();
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "failed");
    assert.equal(calls, 0);
    assert.match(eventsFor(f.db, f.run.id).at(-1)!.message, /interrupted/);
  } finally { await first.stop(); await second.stop(); f.db.close(); }
});
test("shutdown aborts in-flight request and releases lease", async () => {
  const f = fixture();
  const worker = createWorker(f.db, async (_, signal) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  try {
    const running = worker.tick();
    await worker.stop();
    await running;
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "failed");
    assert.equal(executorState(f.db).available, false);
  } finally { f.db.close(); }
});
test("build cannot start without owner approval of an exact stored plan; approval is idempotent", async () => {
  const f = fixture();
  let builds = 0;
  const worker = createWorker(f.db, async () => plan, async () => {
    builds++;
    return { source: { "src/App.tsx": "controlled fixture source" }, verification: { passed: true, checks: [{ name: "fixture only", exitCode: 0 }], output: "Controlled test fixture, not actual compilation", image: "fixture", testsRun: false, deployed: false } };
  });
  try {
    await worker.tick();
    assert.equal(builds, 0);
    const artifact = artifactsFor(f.db, f.run.id).find((a) => a.name === "engineering-plan.json")!;
    assert.throws(() => approvePlan(f.db, "other-owner", f.run.id, artifact.id), /not found/);
    assert.throws(() => approvePlan(f.db, "owner", f.run.id, "stale-id"), /unavailable/);
    approvePlan(f.db, "owner", f.run.id, artifact.id);
    approvePlan(f.db, "owner", f.run.id, artifact.id);
    assert.equal(eventsFor(f.db, f.run.id).filter((e) => e.type === "plan.approved").length, 1);
    await worker.tick();
    assert.equal(builds, 1);
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "succeeded");
    const verification = artifactsFor(f.db, f.run.id).find((a) => a.kind === "verification")!;
    assert.match(JSON.parse(verification.content).approvedPlanSha256, /^[a-f0-9]{64}$/);
    await worker.tick(); assert.equal(builds, 1);
  } finally { await worker.stop(); f.db.close(); }
});
test("planning-only worker cannot authorize builds and cancelled approved builds never execute", async () => {
  const f = fixture();
  const planner = createWorker(f.db, async () => plan);
  try {
    await planner.tick();
    const artifact = artifactsFor(f.db, f.run.id).find((a) => a.name === "engineering-plan.json")!;
    assert.throws(() => approvePlan(f.db, "owner", f.run.id, artifact.id), /No isolated/);
    await planner.stop();
    let called = false;
    const builder = createWorker(f.db, async () => plan, async () => { called = true; throw new Error("should not execute"); });
    try {
      builder.heartbeat();
      approvePlan(f.db, "owner", f.run.id, artifact.id);
      cancelRun(f.db, "owner", f.run.id);
      await builder.tick();
      assert.equal(called, false);
      assert.throws(() => approvePlan(f.db, "owner", f.run.id, artifact.id), /no plan awaiting/);
    } finally { await builder.stop(); }
  } finally { await planner.stop(); f.db.close(); }
});

test("immutable revisions supersede old approvals and execute only the latest proposal", async () => {
  const f = fixture();
  let builtSummary = "";
  const worker = createWorker(f.db, async () => plan, async (_, approved) => {
    builtSummary = approved.summary;
    return { source: {}, verification: { passed: true, checks: [], output: "Fixture", image: "fixture", testsRun: false, deployed: false } };
  });
  try {
    await worker.tick();
    const original = artifactsFor(f.db, f.run.id).at(-1)!;
    assert.throws(() => reviewPlan(f.db, "other", f.run.id, original.id, "Change scope", plan), /not found/);
    assert.throws(() => reviewPlan(f.db, "owner", f.run.id, original.id, "Invalid proposal", { summary: "Invalid" }), /valid/);
    reviewPlan(f.db, "owner", f.run.id, original.id, "Clarify frontend scope", { ...plan, summary: "Revised inbox" });
    const proposals = artifactsFor(f.db, f.run.id).filter((a) => a.name === "engineering-plan.json");
    assert.equal(proposals.length, 2);
    assert.equal(proposals[0].content, original.content);
    assert.throws(() => approvePlan(f.db, "owner", f.run.id, original.id), /superseded/);
    assert.throws(() => reviewPlan(f.db, "owner", f.run.id, original.id, "Stale rejection"), /superseded/);
    approvePlan(f.db, "owner", f.run.id, proposals[1].id);
    assert.throws(() => reviewPlan(f.db, "owner", f.run.id, proposals[1].id, "Too late", plan), /no plan awaiting/);
    await worker.tick();
    assert.equal(builtSummary, "Revised inbox");
  } finally { await worker.stop(); f.db.close(); }
});
test("rejecting the current proposal ends the run without executing a build", async () => {
  const f = fixture(); let builds = 0;
  const worker = createWorker(f.db, async () => plan, async () => { builds++; throw new Error("Not authorized"); });
  try {
    await worker.tick();
    const proposal = artifactsFor(f.db, f.run.id).at(-1)!;
    reviewPlan(f.db, "owner", f.run.id, proposal.id, "Scope requires a backend");
    await worker.tick();
    assert.equal(builds, 0);
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "cancelled");
    assert.equal(eventsFor(f.db, f.run.id).at(-1)?.type, "plan.rejected");
    assert.throws(() => approvePlan(f.db, "owner", f.run.id, proposal.id), /no plan awaiting/);
    assert.equal(JSON.parse(artifactsFor(f.db, f.run.id).at(-1)!.content).reason, "Scope requires a backend");
  } finally { await worker.stop(); f.db.close(); }
});

test("failed verification never retains a supplied preview", async () => {
  const f = fixture();
  const worker = createWorker(f.db, async () => plan, async () => ({
    source: {}, preview: { scripts: [{ name: "assets/app.js", content: "fixture" }], styles: [] },
    verification: { passed: false, checks: [{ name: "Failed fixture", exitCode: 1 }], output: "Fixture failure", image: "fixture", testsRun: false, deployed: false },
  }));
  try {
    await worker.tick();
    const proposal = artifactsFor(f.db, f.run.id).find((artifact) => artifact.name === "engineering-plan.json")!;
    approvePlan(f.db, "owner", f.run.id, proposal.id);
    await worker.tick();
    assert.equal(ownedRun(f.db, "owner", f.run.id).status, "failed");
    assert.equal(artifactsFor(f.db, f.run.id).some((artifact) => artifact.kind === "preview"), false);
  } finally { await worker.stop(); f.db.close(); }
});
