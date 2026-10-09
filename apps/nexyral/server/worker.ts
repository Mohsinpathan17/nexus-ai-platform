import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { retentionPolicy, retainPreview, type PreviewRetentionPolicy } from "./retention.ts";
import { transaction } from "./database.ts";
import { validatePlan, type Planner } from "./planner.ts";
import type { Builder } from "./build.ts";
import { inputForRun } from "./project-requirements.ts";
const leaseMs = 15000;
export function executorState(db: DatabaseSync) {
  const lease = db.prepare("SELECT owner,expires_at FROM worker_lease WHERE id=1").get() as { owner: string; expires_at: number } | undefined;
  const available = Boolean(lease && lease.expires_at > Date.now());
  const capabilities = lease && db.prepare("SELECT build_enabled FROM worker_capabilities WHERE owner=?").get(lease.owner) as { build_enabled: number } | undefined;
  const buildAvailable = available && capabilities?.build_enabled === 1;
  return { available, buildAvailable, reason: buildAvailable ? "Local planning and isolated frontend builds are enabled. Only owner-approved plans can build. Selected browser checks run after compilation. Deployment is not enabled." : available
    ? "Planning worker connected. Plans require human review; code execution and deployment are not enabled."
    : "No engineering worker is connected. Your intent is stored; no software has been generated or verified." };
}
export function createWorker(db: DatabaseSync, planner: Planner, builder?: Builder, options: { retention?: PreviewRetentionPolicy } = {}) {
  const policy = options.retention ?? retentionPolicy();
  const owner = randomUUID();
  let active: AbortController | undefined;
  let busy = false;
  let stopped = false;
  function event(id: string, type: string, message: string) {
    db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(id, type, message, new Date().toISOString());
  }
  function heartbeat() {
    return transaction(db, () => {
      const lease = db.prepare("SELECT owner,expires_at FROM worker_lease WHERE id=1").get() as { owner: string; expires_at: number } | undefined;
      if (lease && lease.owner !== owner && lease.expires_at > Date.now()) return false;
      if (!lease || lease.owner !== owner) {
        const interrupted = db.prepare("SELECT id FROM runs WHERE status='running'").all() as unknown as { id: string }[];
        for (const run of interrupted) {
          db.prepare("UPDATE runs SET status='failed',updated_at=? WHERE id=?").run(new Date().toISOString(), run.id);
          event(run.id, "worker.failed", "Worker interrupted. No automatic retry was performed; create a new run to retry.");
        }
      }
      db.prepare("INSERT INTO worker_lease VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at").run(owner, Date.now() + leaseMs);
      db.prepare("DELETE FROM worker_capabilities WHERE owner!=?").run(owner);
      db.prepare("INSERT INTO worker_capabilities VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET build_enabled=excluded.build_enabled").run(owner, builder ? 1 : 0);
      return true;
    });
  }
  async function tick() {
    if (busy || stopped) return;
    busy = true;
    let id: string | undefined;
    let building = false;
    let monitor: ReturnType<typeof setInterval> | undefined;
    try {
      if (!heartbeat()) return;
      const run = transaction(db, () => {
        const next = db.prepare("SELECT id,intent,stage FROM runs WHERE status='awaiting_executor' AND (stage='intent' OR (stage='build' AND ?=1)) ORDER BY created_at,id LIMIT 1").get(builder ? 1 : 0) as { id: string; intent: string; stage: string } | undefined;
        if (next) {
          building = next.stage === "build";
          db.prepare("UPDATE runs SET status='running',stage=?,updated_at=? WHERE id=?").run(building ? "build" : "plan", new Date().toISOString(), next.id);
          event(next.id, building ? "build.started" : "worker.started", building ? "Approved frontend generation started. Verification uses an isolated network-disabled container." : "Planning worker started. Intent is sent to the configured local model provider; no code execution is permitted at this stage.");
        }
        return next;
      });
      if (!run) return;
      id = run.id;
      const controller = new AbortController();
      active = controller;
      monitor = setInterval(() => {
        const state = db.prepare("SELECT status FROM runs WHERE id=?").get(run.id) as { status: string };
        if (stopped || state.status !== "running" || !heartbeat()) controller.abort();
      }, 500);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(building ? 240000 : 120000)]);
      const approved = building ? db.prepare("SELECT content FROM artifacts WHERE run_id=? AND name='approved-plan.json'").get(run.id) as { content: string } | undefined : undefined;
      if (building && !approved) throw new Error("Missing approval");
      const input = inputForRun(db, run.id, run.intent);
      const evidence = building ? await builder!(input, validatePlan(JSON.parse(approved!.content).plan), signal) : undefined;
      const plan = building ? undefined : validatePlan(await planner(input, signal));
      transaction(db, () => {
        const state = db.prepare("SELECT status FROM runs WHERE id=?").get(run.id) as { status: string };
        const lease = db.prepare("SELECT owner,expires_at FROM worker_lease WHERE id=1").get() as { owner: string; expires_at: number } | undefined;
        if (state.status !== "running" || stopped || lease?.owner !== owner || lease.expires_at <= Date.now()) return;
        const insert = db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)");
        const now = new Date().toISOString();
        if (evidence) {
          const source = JSON.stringify(evidence.source, null, 2);
          insert.run(randomUUID(), run.id, "frontend-source.json", "patch", source, now);
          const preview = evidence.verification.passed && evidence.preview ? JSON.stringify(evidence.preview) : undefined;
          const retention = preview ? retainPreview(db, run.id, preview, policy) : undefined;
          insert.run(randomUUID(), run.id, "verification.json", "verification", JSON.stringify({ ...evidence.verification, ...(retention ? { previewRetention: retention } : {}), ...(preview && retention?.retained ? { previewSha256: createHash("sha256").update(preview).digest("hex") } : {}), sourceSha256: createHash("sha256").update(source).digest("hex"), approvedPlanSha256: JSON.parse(approved!.content).sha256 }, null, 2), now);
          db.prepare("UPDATE runs SET status=?,stage='verify',updated_at=? WHERE id=?").run(evidence.verification.passed ? "succeeded" : "failed", now, run.id);
          event(run.id, evidence.verification.passed ? "build.completed" : "build.failed", evidence.verification.passed ? `Frontend type check and production build passed. Browser behavior: ${evidence.verification.behavior?.status ?? "not_run"}. No security audit or deployment was performed.` : "Frontend verification failed. Stored source and actual check output are available for review. No deployment occurred.");
        } else {
          insert.run(randomUUID(), run.id, "engineering-plan.json", "plan", JSON.stringify(plan, null, 2), now);
          db.prepare("UPDATE runs SET status='awaiting_approval',updated_at=? WHERE id=?").run(now, run.id);
          event(run.id, "plan.ready", "Planning completed. Review the stored proposal. Nothing has been built, verified or deployed.");
        }
      });
    } catch {
      if (id) transaction(db, () => {
        const lease = db.prepare("SELECT owner FROM worker_lease WHERE id=1").get() as { owner: string } | undefined;
        if (lease?.owner !== owner) return;
        const result = db.prepare("UPDATE runs SET status='failed',updated_at=? WHERE id=? AND status='running'").run(new Date().toISOString(), id!);
        if (result.changes) event(id!, building ? "build.failed" : "worker.failed", building ? "Frontend generation or execution was interrupted. No successful verification is recorded. No deployment occurred." : "Planning failed or was interrupted. No verified plan was stored. Provider details are withheld; create a new run to retry.");
      });
    } finally {
      if (monitor) clearInterval(monitor);
      active = undefined;
      busy = false;
    }
  }
  async function stop() {
    stopped = true;
    active?.abort();
    while (busy) await new Promise<void>((resolve) => setTimeout(resolve, 20));
    db.prepare("DELETE FROM worker_lease WHERE owner=?").run(owner);
    db.prepare("DELETE FROM worker_capabilities WHERE owner=?").run(owner);
  }
  return { tick, heartbeat, stop };
}
