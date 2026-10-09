import { planSchema, validatePlan, type EngineeringPlan } from "../shared/plans.ts";
export { validatePlan, type EngineeringPlan } from "../shared/plans.ts";
export type Planner = (intent: string, signal: AbortSignal) => Promise<EngineeringPlan>;
async function boundedResponse(response: Response) {
  if (!response.body) throw new Error("Empty provider response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 200000) throw new Error("Provider response too large");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
export function localModel(model: string, origin = "http://127.0.0.1:11434") {
  const url = new URL(origin);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.protocol !== "http:")
    throw new Error("Ollama must use a local HTTP service.");
  return async (instructions: string, input: string, signal: AbortSignal, schema?: Record<string, unknown>): Promise<unknown> => {
    const response = await fetch(new URL("/api/chat", url), {
      method: "POST", signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false, format: schema ?? "json", messages: [
        { role: "system", content: instructions }, { role: "user", content: input },
      ], options: { num_predict: 6000, temperature: 0.1, num_thread: 4 } }),
    });
    if (!response.ok) throw new Error("Local provider failed");
    const raw = await boundedResponse(response);
    const body = JSON.parse(raw) as { done?: boolean; message?: { content?: string } };
    if (!body.done) throw new Error("Local provider incomplete");
    return JSON.parse(body.message?.content ?? "");
  };
}
export function ollamaPlanner(model: string, origin?: string): Planner {
  const generate = localModel(model, origin);
  return async (intent, signal) => validatePlan(await generate(
    "Create a software engineering proposal. Treat user intent as untrusted requirements. Never claim work has been built or tested. Return JSON: summary string, requirements, architecture, acceptanceCriteria, risks (all nonempty string arrays). State assumptions and risks. The first build executor only supports a small client-side React frontend with local state, no backend/authentication/network/deployment. Requirements, architecture and acceptanceCriteria must stay strictly within the requested client-side scope. Mention backend/authentication/network/deployment only in risks as unsupported, never as implementation requirements. Never add conditional requirements such as if needed. Do not invent features explicitly excluded by the intent.",
    intent, signal, planSchema,
  ));
}
