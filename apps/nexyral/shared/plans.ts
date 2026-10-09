import { validateBehavior, type BehaviorCheck } from "./behavior.ts";
export interface EngineeringPlan {
  behaviorChecks?: BehaviorCheck[];
  summary: string;
  requirements: string[];
  architecture: string[];
  acceptanceCriteria: string[];
  risks: string[];
}
export const planSchema = {
  type: "object", additionalProperties: false,
  required: ["summary", "requirements", "architecture", "acceptanceCriteria", "risks"],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 4000 },
    ...Object.fromEntries(["requirements", "architecture", "acceptanceCriteria", "risks"].map((key) => [key, {
      type: "array", minItems: 1, maxItems: 30, items: { type: "string", minLength: 1, maxLength: 2000 },
    }])),
  },
};
export function validatePlan(value: unknown): EngineeringPlan {
  if (!value || typeof value !== "object") throw new Error("Invalid plan");
  const item = value as Record<string, unknown>;
  const keys = ["requirements", "architecture", "acceptanceCriteria", "risks"] as const;
  if (typeof item.summary !== "string" || !item.summary.trim() || item.summary.length > 4000)
    throw new Error("Invalid summary");
  for (const key of keys) {
    const list = item[key];
    if (!Array.isArray(list) || list.length < 1 || list.length > 30 ||
      list.some((text) => typeof text !== "string" || !text.trim() || text.length > 2000))
      throw new Error("Invalid plan section");
  }
  return { ...(item.behaviorChecks !== undefined ? { behaviorChecks: validateBehavior(item.behaviorChecks) } : {}), summary: item.summary, ...Object.fromEntries(keys.map((key) => [key, item[key]])) } as unknown as EngineeringPlan;
}
