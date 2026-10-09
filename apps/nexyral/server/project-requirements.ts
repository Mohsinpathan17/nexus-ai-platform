import type { DatabaseSync } from "node:sqlite";
import type { ProjectRequirements } from "../shared/contracts.ts";
import { transaction } from "./database.ts";
import { HttpError } from "./http.ts";

export function requirementsFor(db: DatabaseSync, ownerId: string, projectId: string): ProjectRequirements {
  if (!db.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").get(projectId, ownerId)) throw new HttpError(404, "Project not found.");
  return db.prepare("SELECT text,revision,updated_at AS updatedAt FROM project_requirements WHERE project_id=?").get(projectId) as unknown as ProjectRequirements | undefined
    ?? { text: "", revision: 0, updatedAt: null };
}
export function saveRequirements(db: DatabaseSync, ownerId: string, projectId: string, text: string, expectedRevision: unknown) {
  if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER) throw new HttpError(400, "A valid expected revision is required.");
  return transaction(db, () => {
    const current = requirementsFor(db, ownerId, projectId);
    if (current.revision !== expectedRevision) throw new HttpError(409, "Project requirements changed elsewhere. Refresh before saving again.");
    if (current.text === text) return current;
    const next: ProjectRequirements = { text, revision: current.revision + 1, updatedAt: new Date().toISOString() };
    db.prepare("INSERT INTO project_requirements VALUES(?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET text=excluded.text,revision=excluded.revision,updated_at=excluded.updated_at").run(projectId, next.text, next.revision, next.updatedAt);
    return next;
  });
}
export function inputForRun(db: DatabaseSync, runId: string, intent: string) {
  const artifact = db.prepare("SELECT content FROM artifacts WHERE run_id=? AND name='project-requirements.json' AND kind='intent'").get(runId) as { content: string } | undefined;
  if (!artifact) return intent;
  const snapshot = JSON.parse(artifact.content) as ProjectRequirements;
  if (typeof snapshot.text !== "string" || snapshot.text.length > 6000 || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new Error("Invalid project requirements snapshot.");
  return snapshot.text ? JSON.stringify({ intent, projectRequirements: { text: snapshot.text, revision: snapshot.revision } }) : intent;
}
