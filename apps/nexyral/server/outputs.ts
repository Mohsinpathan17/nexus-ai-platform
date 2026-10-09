import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { RunOutputs } from "../shared/preview.ts";
import { ownedRun } from "./runs.ts";
import { HttpError } from "./http.ts";
import { sourceArchive } from "./archive.ts";
import { previewHtml, validatePreview } from "./preview.ts";
const paths = ["src/App.tsx", "src/styles.css", "src/vite-env.d.ts", "src/main.tsx", "index.html", "package.json", "tsconfig.json"];
const digest = (content: string) => createHash("sha256").update(content).digest("hex");
export function outputsFor(db: DatabaseSync, userId: string, id: string): RunOutputs {
  const run = ownedRun(db, userId, id);
  const names = new Set((db.prepare("SELECT name FROM artifacts WHERE run_id=?").all(id) as { name: string }[]).map((item) => item.name));
  const sourceAvailable = ["succeeded", "failed"].includes(run.status) && ["frontend-source.json", "verification.json", "approved-plan.json"].every((name) => names.has(name));
  const retention = db.prepare("SELECT expires_at,state FROM preview_retention WHERE run_id=?").get(id) as { expires_at: number; state: string } | undefined;
  const expired = Boolean(retention && (retention.state === "expired" || retention.state === "retained" && retention.expires_at <= Date.now()));
  const blocked = expired || retention?.state === "quota";
  return { ...(retention?.state === "retained" || retention?.state === "expired" ? { previewExpiresAt: new Date(retention.expires_at).toISOString() } : {}), ...(blocked ? { previewUnavailableReason: expired ? "expired" as const : "quota" as const } : {}), sourceAvailable, previewAvailable: !blocked && sourceAvailable && run.status === "succeeded" && names.has("frontend-preview.json") };
}
function evidenceFor(db: DatabaseSync, userId: string, id: string) {
  const run = ownedRun(db, userId, id);
  if (!outputsFor(db, userId, id).sourceAvailable) throw new HttpError(404, "No frontend output is stored for this run.");
  const content = (name: string) => (db.prepare("SELECT content FROM artifacts WHERE run_id=? AND name=? ORDER BY rowid DESC LIMIT 1").get(id, name) as { content: string } | undefined)?.content;
  const sourceContent = content("frontend-source.json")!;
  const verificationContent = content("verification.json")!;
  const approvalContent = content("approved-plan.json")!;
  try {
    const verification = JSON.parse(verificationContent) as { sourceSha256: string; approvedPlanSha256: string; previewSha256?: string; passed: boolean };
    const approval = JSON.parse(approvalContent) as { artifactId: string; sha256: string };
    const plan = db.prepare("SELECT content FROM artifacts WHERE run_id=? AND id=? AND name='engineering-plan.json'").get(id, approval.artifactId) as { content: string } | undefined;
    if (!plan || digest(plan.content) !== approval.sha256 || verification.approvedPlanSha256 !== approval.sha256 || digest(sourceContent) !== verification.sourceSha256) throw new Error();
    const source = JSON.parse(sourceContent) as Record<string, unknown>;
    if (!source || typeof source !== "object" || Object.keys(source).length !== paths.length || paths.some((path) => typeof source[path] !== "string") || Buffer.byteLength(sourceContent) > 200000) throw new Error();
    return { run, content, source: source as Record<string, string>, verification, verificationContent, approvalContent };
  } catch { throw new HttpError(409, "Stored output does not match its approval and verification evidence."); }
}
export function exportSource(db: DatabaseSync, userId: string, id: string) {
  const evidence = evidenceFor(db, userId, id);
  return sourceArchive({ ...evidence.source,
    "nexyral/verification.json": evidence.verificationContent,
    "nexyral/approved-plan.json": evidence.approvalContent,
    "NEXYRAL_README.md": `# NEXYRAL frontend export\n\nRun: ${id}\nStatus: ${evidence.run.status}\nSource SHA-256: ${evidence.verification.sourceSha256}\n\nThis archive contains the exact stored source and verification evidence. Review the evidence before using it. A successful compile does not establish comprehensive application quality. Nothing was deployed.\n\nWith Node 24.19+ installed, run npm install, then npm run build or npm run dev. Dependencies were resolved from the worker installation; this archive has no generated lockfile, so a fresh install is not proven byte-for-byte reproducible.\n`,
  });
}
export function renderPreview(db: DatabaseSync, userId: string, id: string, appOrigin?: string) {
  const evidence = evidenceFor(db, userId, id);
  if (!outputsFor(db, userId, id).previewAvailable) throw new HttpError(404, "No retained preview is currently available.");
  if (evidence.run.status !== "succeeded" || !evidence.verification.passed) throw new HttpError(404, "No verified preview is available for this run.");
  const preview = evidence.content("frontend-preview.json");
  if (!preview) throw new HttpError(404, "This run has no retained preview. Older builds are not rebuilt automatically.");
  try {
    if (digest(preview) !== evidence.verification.previewSha256) throw new Error();
    return previewHtml(validatePreview(JSON.parse(preview)), appOrigin);
  } catch { throw new HttpError(409, "The preview does not match its verification evidence."); }
}
