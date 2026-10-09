import type { Artifact } from "./contracts.ts";
import type { BehaviorReport } from "./behavior.ts";

export type EvidenceState = "passed" | "failed" | "incomplete" | "not_run" | "not_recorded" | "unavailable";
export interface EvidenceSummary {
  typecheck: EvidenceState;
  build: EvidenceState;
  browser: EvidenceState;
  behavior?: BehaviorReport;
  recorded: boolean;
}
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
export function summarizeEvidence(artifacts: Artifact[]): EvidenceSummary {
  const artifact = artifacts.filter(item => item.kind === "verification" && item.name === "verification.json").at(-1);
  const empty: EvidenceSummary = { typecheck: "not_recorded", build: "not_recorded", browser: "not_recorded", recorded: false };
  if (!artifact) return empty;
  const unavailable: EvidenceSummary = { typecheck: "unavailable", build: "unavailable", browser: "unavailable", recorded: true };
  let value: unknown;
  try { value = JSON.parse(artifact.content); } catch { return unavailable; }
  if (!record(value) || !Array.isArray(value.checks)) return unavailable;
  const checks = value.checks;
  function state(name: string): EvidenceState {
    const matching = checks.filter(item => record(item) && item.name === name);
    if (!matching.length) return "not_recorded";
    if (matching.length !== 1 || !record(matching[0])) return "unavailable";
    const code = matching[0].exitCode;
    return code === null ? "incomplete" : typeof code === "number" && Number.isSafeInteger(code) && code >= 0 ? code === 0 ? "passed" : "failed" : "unavailable";
  }
  const summary: EvidenceSummary = { typecheck: state("TypeScript"), build: state("Vite production build"), browser: "unavailable", recorded: true };
  const behavior = value.behavior;
  if (behavior === undefined && value.testsRun === false) { summary.browser = "not_run"; return summary; }
  if (!record(behavior) || !Array.isArray(behavior.results) || behavior.results.length > 8 ||
      (behavior.reason !== undefined && typeof behavior.reason !== "string")) return summary;
  const results: BehaviorReport["results"] = [];
  for (const item of behavior.results) {
    if (!record(item) || typeof item.name !== "string" || typeof item.passed !== "boolean" || (item.error !== undefined && typeof item.error !== "string")) return summary;
    results.push({ name: item.name, passed: item.passed, ...(typeof item.error === "string" ? { error: item.error } : {}) });
  }
  const status = behavior.status;
  if (status === "not_run" && value.testsRun === false && !results.length ||
      status === "passed" && value.testsRun === true && results.length > 0 && results.every(item => item.passed) ||
      status === "failed" && value.testsRun === true && results.length > 0 && results.some(item => !item.passed)) {
    summary.browser = status as BehaviorReport["status"];
    summary.behavior = { status: status as BehaviorReport["status"], results, ...(typeof behavior.reason === "string" ? { reason: behavior.reason } : {}) };
  }
  return summary;
}
