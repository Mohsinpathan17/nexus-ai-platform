import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../server/database.ts";
import { createApp } from "../server/app.ts";
import { createWorker } from "../server/worker.ts";
import { ollamaPlanner } from "../server/planner.ts";
import { ollamaBuilder } from "../server/builder.ts";
import { approvePlan, artifactsFor, eventsFor, ownedRun } from "../server/runs.ts";
import type { Session, Project, EngineeringRun } from "../shared/contracts.ts";
const model = process.env.NEXYRAL_PLANNING_MODEL ?? "qwen2.5-coder:1.5b";
const phase = process.argv[2];
if (phase !== "plan" && phase !== "build") throw new Error("Choose plan or build.");
if (phase === "build" && !process.argv.includes("--approve-smoke-plan"))
  throw new Error("Review artifacts/local-model-plan.json, then explicitly pass --approve-smoke-plan for this synthetic test only.");
const statePath = resolve(".data/local-model-smoke.json");
interface State { dbPath: string; userId: string; runId: string; model: string }
await mkdir(".data", { recursive: true });
await mkdir("artifacts", { recursive: true });
const state = phase === "build" ? JSON.parse(await readFile(statePath, "utf8")) as State : undefined;
const dbPath = state?.dbPath ?? resolve(`.data/local-model-${randomUUID()}.sqlite`);
if (!dbPath.startsWith(resolve(".data/local-model-") )) throw new Error("Invalid isolated smoke database path.");
const db = openDatabase(dbPath);
const worker = createWorker(db, ollamaPlanner(state?.model ?? model), ollamaBuilder(state?.model ?? model));
let current: State | undefined = state;
try {
  if (phase === "plan") {
    const origins: string[] = [];
    const server = createApp({ db, origins });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    origins.push(origin);
    let cookie = "";
    let csrf = "";
    async function post<T>(path: string, body: unknown): Promise<T> {
      const response = await fetch(`${origin}/api${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie, "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
      const issued = response.headers.get("set-cookie");
      if (issued) cookie = issued.split(";")[0];
      if (!response.ok) throw new Error(`Smoke request failed: ${response.status}`);
      return response.json() as Promise<T>;
    }
    try {
      const session = await post<Session>("/auth/signup", { name: "Local model smoke", email: `smoke-${randomUUID()}@example.test`, password: randomUUID() + randomUUID() });
      csrf = session.csrfToken!;
      const { project } = await post<{ project: Project }>("/projects", { name: "Real model counter smoke" });
      const { run } = await post<{ run: EngineeringRun }>(`/projects/${project.id}/runs`, { intent: "Build a small accessible client-side React counter. Start at zero. Include labeled Increment and Reset buttons. Increment increases the count by one; Reset returns it to zero. Use only local React state, no network, backend or authentication. Use readable responsive CSS. Keep this implementation minimal." });
      current = { dbPath, userId: session.user!.id, runId: run.id, model };
      await writeFile(statePath, JSON.stringify(current, null, 2), { mode: 0o600 });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
    console.log("Real local inference started in an isolated smoke database.");
    await worker.tick();
    const run = ownedRun(db, current!.userId, current!.runId);
    const plan = artifactsFor(db, run.id).find((artifact) => artifact.name === "engineering-plan.json");
    if (!plan || run.status !== "awaiting_approval") throw new Error("Real planning failed; inspect the isolated run events.");
    await writeFile("artifacts/local-model-plan.json", plan.content);
    console.log(plan.content);
  } else {
    if (ownedRun(db, current!.userId, current!.runId).status !== "awaiting_approval")
      throw new Error("This smoke run is not awaiting approval. Start a new plan phase to run inference again.");
    worker.heartbeat();
    const artifact = artifactsFor(db, current!.runId).find((item) => item.name === "engineering-plan.json");
    if (!artifact) throw new Error("No smoke plan is available.");
    approvePlan(db, current!.userId, current!.runId, artifact.id);
    console.log("Exact reviewed smoke proposal approved. Real local code generation started.");
    await worker.tick();
    const run = ownedRun(db, current!.userId, current!.runId);
    const artifacts = artifactsFor(db, run.id);
    await writeFile("artifacts/local-model-evidence.json", JSON.stringify({ model: current!.model, run, events: eventsFor(db, run.id), artifacts }, null, 2));
    const source = artifacts.find((item) => item.name === "frontend-source.json");
    if (source) await writeFile("artifacts/local-model-source.json", source.content);
    const verification = artifacts.find((item) => item.name === "verification.json");
    if (verification) console.log(verification.content);
    if (run.status !== "succeeded") throw new Error("Real generated frontend failed. Evidence has been preserved.");
    console.log("Real local-model frontend passed type checking and production compilation. No application tests or deployment ran.");
  }
} finally { await worker.stop(); db.close(); }
