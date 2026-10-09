import { resolve } from "node:path";
import { openDatabase } from "./database.ts";
import { ollamaPlanner } from "./planner.ts";
import { createWorker } from "./worker.ts";
import { ollamaBuilder } from "./builder.ts";
import { executionImage } from "./execution-image.ts";
import { buildImage } from "./build.ts";
import { execFileSync } from "node:child_process";
const model = process.env.NEXYRAL_PLANNING_MODEL;
if (!model) throw new Error("Configure NEXYRAL_PLANNING_MODEL for an installed local Ollama model.");
const planner = ollamaPlanner(model, process.env.NEXYRAL_OLLAMA_ORIGIN);
const service = new URL(process.env.NEXYRAL_OLLAMA_ORIGIN ?? "http://127.0.0.1:11434");
const tags = await fetch(new URL("/api/tags", service), { signal: AbortSignal.timeout(5000) });
if (!tags.ok) throw new Error("The local model service is unavailable.");
const installed = await tags.json() as { models?: { name: string }[] };
if (!installed.models?.some((item) => item.name === model || item.name === `${model}:latest`))
  throw new Error("The configured model is not installed. Pending runs have not been claimed.");
const enableBuilds = process.env.NEXYRAL_ENABLE_BUILDS === "1";
if (enableBuilds) {
  execFileSync("docker", ["image", "inspect", buildImage], { stdio: "ignore", timeout: 15000 });
  if (executionImage().bundledBrowser)
    execFileSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--memory", "128m", buildImage, "/usr/lib/chromium/chromium", "--version"], { stdio: "ignore", timeout: 15000 });
}
const db = openDatabase(resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"));
const worker = createWorker(db, planner, enableBuilds ? ollamaBuilder(model, process.env.NEXYRAL_OLLAMA_ORIGIN) : undefined);
const timer = setInterval(() => void worker.tick(), 1000);
void worker.tick();
console.log(enableBuilds ? "Local worker started with approved frontend builds. Deployment disabled." : "Planning worker started. No code execution or deployment enabled.");
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await worker.stop();
  db.close();
});
