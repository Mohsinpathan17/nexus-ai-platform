import { test } from "node:test";
import assert from "node:assert/strict";
import type { Artifact } from "../shared/contracts.ts";
import { summarizeEvidence } from "../shared/run-evidence.ts";
const artifact = (value: unknown): Artifact => ({ id: "evidence", runId: "run", name: "verification.json", kind: "verification", createdAt: "", content: JSON.stringify(value) });
const checks = [{ name: "TypeScript", exitCode: 0 }, { name: "Vite production build", exitCode: 0 }];
test("missing, malformed and interrupted verification never imply a pass", () => {
  assert.equal(summarizeEvidence([]).typecheck, "not_recorded");
  assert.equal(summarizeEvidence([{ ...artifact({}), content: "{" }]).build, "unavailable");
  assert.equal(summarizeEvidence([artifact({ checks: "passed" })]).typecheck, "unavailable");
  const failed = summarizeEvidence([artifact({ checks: [{ name: "TypeScript", exitCode: 2 }], testsRun: false, behavior: { status: "not_run", results: [] } })]);
  assert.equal(failed.typecheck, "failed"); assert.equal(failed.build, "not_recorded"); assert.equal(failed.browser, "not_run");
  assert.equal(summarizeEvidence([artifact({ checks: [{ name: "TypeScript", exitCode: null }] })]).typecheck, "incomplete");
  for (const code of ["0", -1, 0.5]) assert.equal(summarizeEvidence([artifact({ checks: [{ name: "TypeScript", exitCode: code }] })]).typecheck, "unavailable");
  assert.equal(summarizeEvidence([artifact({ checks: [...checks, checks[0]] })]).typecheck, "unavailable");
});
test("compiler and browser evidence remain independent; contradictory browser reports are unreadable", () => {
  const failed = summarizeEvidence([artifact({ checks, testsRun: true, behavior: { status: "failed", results: [{ name: "Counter", passed: false, error: "Expected Count 1" }] } })]);
  assert.equal(failed.typecheck, "passed"); assert.equal(failed.build, "passed"); assert.equal(failed.browser, "failed");
  assert.equal(failed.behavior?.results[0].error, "Expected Count 1");
  for (const behavior of [{ status: "passed", results: [] }, { status: "passed", results: [{ name: "Counter", passed: false }] }, { status: "passed", results: "not an array" }, { status: "failed", results: [{ name: "Counter", passed: true }] }]) {
    assert.equal(summarizeEvidence([artifact({ checks, testsRun: true, behavior })]).browser, "unavailable");
  }
  const passed = artifact({ checks, testsRun: true, behavior: { status: "passed", results: [{ name: "Counter", passed: true }] } });
  assert.equal(summarizeEvidence([passed]).browser, "passed");
  assert.equal(summarizeEvidence([passed, artifact({ checks, testsRun: false })]).browser, "not_run");
  assert.equal(summarizeEvidence([{ ...passed, runId: "prior", name: "prior-verification.json" }]).recorded, false);
});
