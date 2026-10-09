import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBehavior } from "../shared/behavior.ts";
import { validatePlan } from "../shared/plans.ts";
test("behavior contracts reject executable actions, excessive scope and assertion-free checks", () => {
  assert.throws(() => validateBehavior([{ name: "Unsafe", steps: [{ action: "evaluate", text: "process.exit()" }] }]));
  assert.throws(() => validateBehavior([{ name: "No assertion", steps: [{ action: "click", text: "Save" }] }]));
  assert.throws(() => validateBehavior(Array(9).fill({ name: "Check", steps: [{ action: "expectText", text: "Done" }] })));
  assert.throws(() => validateBehavior([{ name: "Oversized", steps: [{ action: "expectText", text: "a".repeat(201) }] }]));
  assert.throws(() => validatePlan({ summary: "Plan", requirements: ["One"], architecture: ["React"], acceptanceCriteria: ["Done"], risks: ["Scope"], behaviorChecks: "shell code" }));
  assert.deepEqual(validateBehavior([{ name: "Safe", steps: [{ action: "fill", text: "Name", value: "Ada", script: "ignored" }, { action: "expectText", text: "Ada" }] }]), [{ name: "Safe", steps: [{ action: "fill", text: "Name", value: "Ada" }, { action: "expectText", text: "Ada" }] }]);
});
