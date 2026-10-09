export type BehaviorStep =
  | { action: "click"; text: string }
  | { action: "fill"; text: string; value: string }
  | { action: "expectText"; text: string };
export interface BehaviorCheck { name: string; steps: BehaviorStep[] }
export interface BehaviorReport {
  status: "not_run" | "passed" | "failed";
  reason?: string;
  results: { name: string; passed: boolean; error?: string }[];
}
export function validateBehavior(value: unknown): BehaviorCheck[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error("Invalid behavior checks");
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid check");
    const check = raw as Record<string, unknown>;
    if (typeof check.name !== "string" || !check.name.trim() || check.name.length > 100 || !Array.isArray(check.steps) || check.steps.length < 1 || check.steps.length > 12) throw new Error("Invalid check");
    const steps = check.steps.map((raw: unknown): BehaviorStep => {
      if (!raw || typeof raw !== "object") throw new Error("Invalid step");
      const step = raw as Record<string, unknown>;
      if (typeof step.text !== "string" || !step.text.trim() || step.text.length > 200) throw new Error("Invalid target");
      if (step.action === "fill") {
        if (typeof step.value !== "string" || step.value.length > 500) throw new Error("Invalid input");
        return { action: "fill", text: step.text, value: step.value };
      }
      if (step.action !== "click" && step.action !== "expectText") throw new Error("Unsupported action");
      return { action: step.action, text: step.text };
    });
    if (!steps.some((step) => step.action === "expectText")) throw new Error("A check must include an assertion");
    return { name: check.name, steps };
  });
}
