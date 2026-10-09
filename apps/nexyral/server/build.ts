import { executionImage } from "./execution-image.ts";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { BehaviorCheck, BehaviorReport } from "../shared/behavior.ts";
import { validateBehavior } from "../shared/behavior.ts";
import { capturePreview } from "./preview.ts";
import type { FrontendPreview } from "../shared/preview.ts";
import type { EngineeringPlan } from "../shared/plans.ts";
const execution = executionImage();
export const buildImage = execution.image;
export interface GeneratedSource { app: string; css: string }
export interface BuildEvidence {
  source: Record<string, string>;
  preview?: FrontendPreview;
  verification: { passed: boolean; checks: { name: string; exitCode: number | null }[]; output: string; image: string; testsRun: boolean; behavior?: BehaviorReport; deployed: false; attempts?: { number: number; passed: boolean; checks: { name: string; exitCode: number | null }[]; output: string; sourceSha256: string }[] };
}
export type Builder = (intent: string, plan: EngineeringPlan, signal: AbortSignal) => Promise<BuildEvidence>;
export function validateSource(value: unknown): GeneratedSource {
  if (!value || typeof value !== "object") throw new Error("Invalid source");
  const item = value as Record<string, unknown>;
  if (typeof item.app !== "string" || item.app.length < 20 || item.app.length > 60000 ||
    typeof item.css !== "string" || item.css.length > 30000) throw new Error("Invalid source size");
  return { app: item.app, css: item.css };
}
function scaffold(source: GeneratedSource): Record<string, string> {
  return {
    "src/App.tsx": source.app,
    "src/styles.css": source.css,
    "src/vite-env.d.ts": '/// <reference types="vite/client" />',
    "src/main.tsx": 'import React from "react"; import { createRoot } from "react-dom/client"; import App from "./App"; import "./styles.css"; createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);',
    "index.html": '<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Generated frontend</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    "package.json": JSON.stringify({ private: true, type: "module", scripts: { dev: "vite", build: "tsc --noEmit && vite build" }, dependencies: { react: "19.3.0", "react-dom": "19.3.0" }, devDependencies: { vite: "8.3.3", typescript: "6.0.2", "@types/react": "^19.2.18", "@types/react-dom": "^19.2.7" } }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2023", lib: ["ES2023", "DOM"], module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, skipLibCheck: true, noEmit: true, types: ["react", "react-dom"] }, include: ["src"] }),
  };
}
async function runContainer(work: string, dependencies: string, tool: string[], signal: AbortSignal, mounts: string[] = []) {
  signal.throwIfAborted();
  const name = `nexyral-${randomUUID()}`;
  let output = "";
  try {
    return await new Promise<{ code: number | null; output: string }>((resolveResult, reject) => {
      const child = spawn("docker", ["run", "--pull", "never", "--rm", "--name", name, "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128", "--memory", "512m", "--cpus", "1", "--user", `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`, "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount", `type=bind,src=${work},dst=/work`, "--mount", `type=bind,src=${dependencies},dst=/work/node_modules,readonly`, ...mounts.flatMap((path) => ["--mount", `type=bind,src=${path},dst=${path},readonly`]), "--workdir", "/work", buildImage, "node", ...tool], { signal, env: { PATH: process.env.PATH, DOCKER_HOST: process.env.DOCKER_HOST }, stdio: ["ignore", "pipe", "pipe"] });
      const collect = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-64000); };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      child.on("error", reject);
      child.on("close", (code) => resolveResult({ code, output }));
    });
  } finally {
    await new Promise<void>((done) => {
      const cleanup = spawn("docker", ["rm", "--force", name], { stdio: "ignore", timeout: 5000 });
      cleanup.on("error", () => done());
      cleanup.on("close", () => done());
    });
  }
}
export async function verifyFrontend(value: GeneratedSource, signal: AbortSignal, dependencies = resolve("node_modules"), behaviorChecks: BehaviorCheck[] = []): Promise<BuildEvidence> {
  const selected = validateBehavior(behaviorChecks);
  const source = scaffold(validateSource(value));
  const root = resolve(".data/build-workspaces");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const work = await mkdtemp(join(root, "run-"));
  const checks: BuildEvidence["verification"]["checks"] = [];
  let output = "";
  try {
    for (const [path, content] of Object.entries(source)) {
      await mkdir(resolve(work, path, ".."), { recursive: true });
      await writeFile(resolve(work, path), content);
    }
    for (const [name, args] of [
      ["TypeScript", ["node_modules/typescript/bin/tsc", "--project", "tsconfig.json"]],
      ["Vite production build", ["node_modules/vite/bin/vite.js", "build"]],
    ] as const) {
      const result = await runContainer(work, dependencies, [...args], signal);
      checks.push({ name, exitCode: result.code });
      output = (output + `\n${name}\n${result.output}`).slice(-64000);
      if (result.code !== 0) break;
    }
    const compiled = checks.length === 2 && checks.every((c) => c.exitCode === 0);
    let behavior: BehaviorReport = { status: "not_run", reason: compiled ? "No behavior checks were approved." : "Compilation failed before browser execution.", results: [] };
    let testsRun = false;
    if (compiled && selected.length) {
      try {
        const binary = "/usr/lib/chromium/chromium";
        const libraries = execution.bundledBrowser ? [] : execFileSync("ldd", [binary], { encoding: "utf8", timeout: 5000 }).match(/\/(?:usr\/)?lib[^\s()]*/g) ?? [];
        const mounts = execution.bundledBrowser ? [] : [...new Set(["/usr/lib/chromium", "/etc/fonts", "/usr/share/fonts", "/usr/share/fontconfig", ...libraries])];
        await writeFile(join(work, "behavior-checks.json"), JSON.stringify(selected));
        const { readFile } = await import("node:fs/promises");
        await writeFile(join(work, "behavior-harness.mjs"), await readFile(new URL("./behavior-harness.mjs", import.meta.url)));
        const result = await runContainer(work, dependencies, ["behavior-harness.mjs"], AbortSignal.any([signal, AbortSignal.timeout(60000)]), mounts);
        output = (output + `\nBrowser runner exit: ${result.code}\n${result.output}`).slice(-64000);
        const line = result.output.split("\n").find((line) => line.startsWith("NEXYRAL_RESULT:"));
        if (!line) throw new Error("Browser runner did not return evidence.");
        const report = JSON.parse(line.slice("NEXYRAL_RESULT:".length)) as BehaviorReport;
        if (!Array.isArray(report.results) || report.results.length !== selected.length || report.results.some((item, i) => item.name !== selected[i].name || typeof item.passed !== "boolean")) throw new Error("Invalid browser evidence.");
        behavior = { status: result.code === 0 && report.results.every((item) => item.passed) ? "passed" : "failed", results: report.results };
        testsRun = true;
      } catch {
        signal.throwIfAborted();
        behavior = { status: "not_run", reason: "Isolated browser execution did not complete. Required checks remain unverified.", results: [] };
      }
      checks.push({ name: "Approved browser behavior", exitCode: behavior.status === "passed" ? 0 : 1 });
      output += `\nApproved browser behavior\n${JSON.stringify(behavior)}`;
    }
    const passed = compiled && (!selected.length || behavior.status === "passed");
    let preview: FrontendPreview | undefined;
    if (passed) {
      try { preview = await capturePreview(work); }
      catch { output += "\nA durable preview could not be captured. Verification evidence remains available."; }
    }
    return { source, ...(preview ? { preview } : {}), verification: { passed, checks, output, image: buildImage, testsRun, behavior, deployed: false } };
  } finally { await rm(work, { recursive: true, force: true }); }
}
