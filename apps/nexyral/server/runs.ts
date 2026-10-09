import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  executorReason,
  type Artifact,
  type EngineeringRun,
  type Project,
  type RunEvent,
  type RunHistoryEntry,
} from "../shared/contracts.ts";
import { transaction } from "./database.ts";
import { executorState } from "./worker.ts";
import { HttpError } from "./http.ts";
import { validatePlan } from "../shared/plans.ts";
import { requirementsFor } from "./project-requirements.ts";
const projectFields =
  "p.id,p.name,p.created_at AS createdAt,COUNT(r.id) AS runCount";
const runFields =
  "r.id,r.project_id AS projectId,r.intent,r.status,r.stage,r.created_at AS createdAt,r.updated_at AS updatedAt";
export function projectsFor(db: DatabaseSync, userId: string) {
  return db
    .prepare(
      `SELECT ${projectFields} FROM projects p LEFT JOIN runs r ON r.project_id=p.id WHERE p.owner_id=? GROUP BY p.id ORDER BY p.created_at DESC`,
    )
    .all(userId) as unknown as Project[];
}
export function ownedProject(db: DatabaseSync, userId: string, id: string) {
  const project = db.prepare(`SELECT ${projectFields} FROM projects p LEFT JOIN runs r ON r.project_id=p.id WHERE p.owner_id=? AND p.id=? GROUP BY p.id`).get(userId, id) as unknown as Project | undefined;
  if (!project) throw new HttpError(404, "Project not found.");
  return project;
}
export function createProject(db: DatabaseSync, userId: string, name: string) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO projects VALUES (?,?,?,?)").run(
    id,
    userId,
    name,
    createdAt,
  );
  return { id, name, createdAt, runCount: 0 } satisfies Project;
}
export function runsFor(db: DatabaseSync, userId: string, projectId: string) {
  ownedProject(db, userId, projectId);
  const runs = db
    .prepare(
      `SELECT ${runFields},ROW_NUMBER() OVER (ORDER BY r.created_at,r.rowid) AS sequence FROM runs r WHERE project_id=? ORDER BY r.created_at DESC,r.rowid DESC`,
    )
    .all(projectId) as unknown as RunHistoryEntry[];
  const ids = new Set(runs.map(run => run.id));
  const lineage = new Map<string, string>();
  const rows = db.prepare("SELECT a.run_id AS runId,a.content FROM artifacts a JOIN runs r ON r.id=a.run_id WHERE r.project_id=? AND a.name='retry-origin.json' AND a.kind='intent' ORDER BY a.rowid").all(projectId) as { runId: string; content: string }[];
  for (const row of rows) {
    try {
      const value: unknown = JSON.parse(row.content);
      if (value && typeof value === "object" && "parentRunId" in value && typeof value.parentRunId === "string" && value.parentRunId !== row.runId && ids.has(value.parentRunId)) lineage.set(row.runId, value.parentRunId);
    } catch { /* Malformed legacy metadata must not break owner-scoped history. */ }
  }
  return runs.map((run): RunHistoryEntry => ({ ...run, ...(lineage.has(run.id) ? { parentRunId: lineage.get(run.id) } : {}) }));
}
export function ownedRun(db: DatabaseSync, userId: string, id: string) {
  const run = db
    .prepare(
      `SELECT ${runFields} FROM runs r JOIN projects p ON p.id=r.project_id WHERE r.id=? AND p.owner_id=?`,
    )
    .get(id, userId) as unknown as EngineeringRun | undefined;
  if (!run) throw new HttpError(404, "Run not found.");
  return run;
}
export function eventsFor(db: DatabaseSync, runId: string, after = 0) {
  return db
    .prepare(
      "SELECT id,run_id AS runId,type,message,created_at AS createdAt FROM events WHERE run_id=? AND id>? ORDER BY id",
    )
    .all(runId, after) as unknown as RunEvent[];
}
export function artifactsFor(db: DatabaseSync, runId: string) {
  return db
    .prepare(
      "SELECT id,run_id AS runId,name,kind,content,created_at AS createdAt FROM artifacts WHERE run_id=? ORDER BY created_at,rowid",
    )
    .all(runId) as unknown as Artifact[];
}
export function createRun(db: DatabaseSync, userId: string, projectId: string, intent: string): EngineeringRun;
export function createRun(db: DatabaseSync, userId: string, projectId: string, intent: string, retry: { sourceId: string; requestId: string }): { run: EngineeringRun; created: boolean };
export function createRun(
  db: DatabaseSync,
  userId: string,
  projectId: string,
  intent: string,
  retry?: { sourceId: string; requestId: string },
) {
  ownedProject(db, userId, projectId);
  const id = randomUUID();
  const now = new Date().toISOString();
  return transaction(db, () => {
    let snapshot: string | undefined;
    if (retry) {
      const source = ownedRun(db, userId, retry.sourceId);
      if (source.projectId !== projectId) throw new HttpError(404, "Run not found.");
      if (!["failed", "cancelled"].includes(source.status)) throw new HttpError(409, "Only failed or cancelled runs can be retried.");
      const existing = db.prepare("SELECT r.id,r.intent FROM artifacts a JOIN runs r ON r.id=a.run_id WHERE r.project_id=? AND a.name='retry-origin.json' AND json_extract(a.content,'$.parentRunId')=? AND json_extract(a.content,'$.requestId')=?").get(projectId, retry.sourceId, retry.requestId) as { id: string; intent: string } | undefined;
      if (existing) {
        if (existing.intent !== intent) throw new HttpError(409, "This retry request was already used with different intent.");
        return { run: ownedRun(db, userId, existing.id), created: false };
      }
      snapshot = artifactsFor(db, source.id).find(artifact => artifact.name === "project-requirements.json" && artifact.kind === "intent")?.content;
    } else {
      const requirements = requirementsFor(db, userId, projectId);
      if (requirements.revision > 0) snapshot = JSON.stringify(requirements);
    }
    db.prepare("INSERT INTO runs VALUES (?,?,?,?,?,?,?)").run(
      id,
      projectId,
      intent,
      "awaiting_executor",
      "intent",
      now,
      now,
    );
    const insert = db.prepare(
      "INSERT INTO events (run_id,type,message,created_at) VALUES (?,?,?,?)",
    );
    insert.run(
      id,
      "run.created",
      "Intent recorded. Engineering run created.",
      now,
    );
    if (!executorState(db).available) insert.run(id, "executor.unavailable", executorReason, now);
    db.prepare("INSERT INTO artifacts VALUES (?,?,?,?,?,?)").run(
      randomUUID(),
      id,
      "intent.md",
      "intent",
      intent,
      now,
    );
    if (snapshot) db.prepare("INSERT INTO artifacts VALUES (?,?,?,?,?,?)").run(randomUUID(), id, "project-requirements.json", "intent", snapshot, now);
    if (retry) db.prepare("INSERT INTO artifacts VALUES (?,?,?,?,?,?)").run(randomUUID(), id, "retry-origin.json", "intent", JSON.stringify({ parentRunId: retry.sourceId, requestId: retry.requestId, createdAt: now }), now);
    const run = ownedRun(db, userId, id);
    return retry ? { run, created: true } : run;
  });
}
export function cancelRun(db: DatabaseSync, userId: string, id: string) {
  const run = ownedRun(db, userId, id);
  if (run.status === "cancelled") return run;
  if (["succeeded", "failed"].includes(run.status))
    throw new HttpError(409, "This run has already finished.");
  const now = new Date().toISOString();
  transaction(db, () => {
    db.prepare(
      "UPDATE runs SET status='cancelled',updated_at=? WHERE id=?",
    ).run(now, id);
    db.prepare(
      "INSERT INTO events (run_id,type,message,created_at) VALUES (?,?,?,?)",
    ).run(
      id,
      "run.cancelled",
      "Run cancelled by its owner. Any active planning request will be aborted; its result will not be stored.",
      now,
    );
  });
  return ownedRun(db, userId, id);
}
export function approvePlan(db: DatabaseSync, userId: string, id: string, artifactId: string) {
  return transaction(db, () => {
    const run = ownedRun(db, userId, id);
    const approved = artifactsFor(db, id).find((item) => item.name === "approved-plan.json");
    if (approved && JSON.parse(approved.content).artifactId === artifactId && run.status !== "cancelled") return run;
    if (run.status !== "awaiting_approval") throw new HttpError(409, "This run has no plan awaiting approval.");
    if (!executorState(db).buildAvailable) throw new HttpError(409, "No isolated frontend build worker is connected.");
    const artifact = artifactsFor(db, id).filter((item) => item.name === "engineering-plan.json" && item.kind === "plan").at(-1);
    if (!artifact || artifact.id !== artifactId) throw new HttpError(409, "The selected plan is unavailable or superseded. Refresh before approving.");
    const plan = validatePlan(JSON.parse(artifact.content));
    const now = new Date().toISOString();
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), id, "approved-plan.json", "plan", JSON.stringify({ artifactId, sha256: createHash("sha256").update(artifact.content).digest("hex"), approvedBy: userId, approvedAt: now, plan }), now);
    db.prepare("UPDATE runs SET status='awaiting_executor',stage='build',updated_at=? WHERE id=?").run(now, id);
    db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(id, "plan.approved", "Owner approved this exact plan for a client-side React build. Only selected browser behavior checks are authorized; no backend or deployment is authorized.", now);
    return ownedRun(db, userId, id);
  });
}

export function reviewPlan(db: DatabaseSync, userId: string, id: string, artifactId: string, reason: string, value?: unknown) {
  return transaction(db, () => {
    const run = ownedRun(db, userId, id);
    if (run.status !== "awaiting_approval") throw new HttpError(409, "This run has no plan awaiting review.");
    const latest = artifactsFor(db, id).filter((item) => item.name === "engineering-plan.json").at(-1);
    if (!latest || latest.id !== artifactId) throw new HttpError(409, "This proposal has been superseded. Refresh before reviewing.");
    let plan;
    if (value !== undefined) {
      try { plan = validatePlan(value); } catch { throw new HttpError(400, "Every plan section must contain valid, bounded text."); }
    }
    const now = new Date().toISOString();
    const revisionId = plan ? randomUUID() : null;
    if (plan) db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(revisionId, id, "engineering-plan.json", "plan", JSON.stringify(plan), now);
    db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), id, "plan-review.json", "plan", JSON.stringify({ action: plan ? "revised" : "rejected", parentArtifactId: artifactId, revisionId, reviewedBy: userId, reason, reviewedAt: now }), now);
    db.prepare("UPDATE runs SET status=?,updated_at=? WHERE id=?").run(plan ? "awaiting_approval" : "cancelled", now, id);
    db.prepare("INSERT INTO events(run_id,type,message,created_at) VALUES(?,?,?,?)").run(id, plan ? "plan.revised" : "plan.rejected", plan ? "Owner saved a new proposal revision. Approval of the latest version is required." : "Owner rejected the proposal. This run will not execute.", now);
    return ownedRun(db, userId, id);
  });
}
