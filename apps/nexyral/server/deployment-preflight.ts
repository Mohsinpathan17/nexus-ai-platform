import { access, lstat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { validatePreviewOrigin } from "./config.ts";
import { proxyAddresses } from "./proxy-address.ts";
import { executionImage } from "./execution-image.ts";
import { accountProviderChecks } from "./account-provider-config.ts";
export interface PreflightCheck { name: string; passed: boolean; message: string }
export async function deploymentPreflight(root = process.cwd(), env: NodeJS.ProcessEnv = process.env) {
  const checks: PreflightCheck[] = [];
  async function check(name: string, action: () => void | Promise<void>) {
    try { await action(); checks.push({ name, passed: true, message: "Passed" }); }
    catch (error) { checks.push({ name, passed: false, message: error instanceof Error ? error.message : "Check failed" }); }
  }
  await check("Node runtime", () => {
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 24 || (major === 24 && minor < 19)) throw new Error("Node24.19+ is required.");
  });
  await check("Workspace build", async () => {
    for (const file of ["dist/index.html", "server-dist/server/index.js", "server-dist/server/preview-entry.js", "server-dist/server/behavior-harness.mjs", "node_modules/react/package.json", "node_modules/typescript/package.json"])
      await access(join(root, file));
    try { await lstat(join(root, "dist/demo-build.json")); }
    catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return; throw error; }
    throw new Error("Public-demo output cannot serve real accounts. Run npm run build.");
  });
  await check("Origins and proxy", () => {
    const proxies = proxyAddresses((env.NEXYRAL_TRUSTED_PROXIES ?? "").split(",").filter(Boolean));
    if (proxies.size && (env.NEXYRAL_API_HOST ?? "127.0.0.1") !== "127.0.0.1") throw new Error("Trusted proxy mode requires a loopback API listener.");
    if (env.NODE_ENV !== "production") return;
    if (!env.NEXYRAL_APP_ORIGINS || !env.NEXYRAL_PREVIEW_ORIGIN) throw new Error("Explicit production app and preview origins are required.");
    const origins = env.NEXYRAL_APP_ORIGINS.split(",");
    for (const value of origins) {
      const url = new URL(value);
      if (url.origin !== value || url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Production app origins must be canonical HTTPS origins.");
    }
    validatePreviewOrigin(env.NEXYRAL_PREVIEW_ORIGIN, origins, true);
    if (env.NEXYRAL_RECOVERY_APP_ORIGIN && !origins.includes(env.NEXYRAL_RECOVERY_APP_ORIGIN)) throw new Error("Recovery origin must match an application origin.");
  });
  await check("Database storage", async () => {
    const path = resolve(root, env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite");
    const parent = await lstat(dirname(path));
    if (!parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o077)) throw new Error("Database directory must be private (mode700).");
    await access(dirname(path), constants.W_OK);
    let file;
    try { file = await lstat(path); } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
    if (!file.isFile() || file.isSymbolicLink() || (file.mode & 0o077)) throw new Error("Database must be a private regular file (mode600).");
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      const schema = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
      const empty = schema === 0 && !db.prepare("SELECT 1 FROM sqlite_master LIMIT 1").get();
      if (!empty && ![4, 5, 6, 7].includes(schema)) throw new Error("Unsupported database schema; no migration was attempted.");
      const result = db.prepare("PRAGMA quick_check").get() as { quick_check: string };
      if (result.quick_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Database integrity check failed.");
    } finally { db.close(); }
  });
  if (env.NEXYRAL_START_WORKER === "1") await check("Worker dependencies", async () => {
    const url = new URL(env.NEXYRAL_OLLAMA_ORIGIN ?? "http://127.0.0.1:11434");
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Worker requires a loopback model service.");
    if (!env.NEXYRAL_PLANNING_MODEL) throw new Error("Explicit worker model is required.");
    const response = await fetch(new URL("/api/tags", url), { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Model service unavailable.");
    const data = await response.json() as { models?: { name: string }[] };
    if (!data.models?.some(model => model.name === env.NEXYRAL_PLANNING_MODEL || model.name === `${env.NEXYRAL_PLANNING_MODEL}:latest`)) throw new Error("Requested model is not installed.");
    if (env.NEXYRAL_ENABLE_BUILDS === "1") execFileSync("docker", ["image", "inspect", executionImage().image], { stdio: "ignore", timeout: 5000 });
  });
  return [...checks, ...accountProviderChecks(env)];
}
