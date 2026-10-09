import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { chromium, expect, type Browser } from "@playwright/test";
import { buildImage } from "../server/build.ts";
const exec = promisify(execFile);
const sourceText = await readFile("artifacts/local-model-source.json", "utf8");
const source = JSON.parse(sourceText) as Record<string, string>;
const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");
const runEvidence = JSON.parse(await readFile("artifacts/local-model-evidence.json", "utf8")) as { artifacts: { name: string; content: string }[] };
const recorded = runEvidence.artifacts.find((artifact) => artifact.name === "verification.json");
assert.ok(recorded);
assert.equal(sourceSha256, (JSON.parse(recorded.content) as { sourceSha256: string }).sourceSha256);
const allowed = ["src/App.tsx", "src/styles.css", "src/vite-env.d.ts", "src/main.tsx", "index.html", "package.json", "tsconfig.json"];
assert.deepEqual(Object.keys(source).sort(), [...allowed].sort());
await mkdir(".data/counter-checks", { recursive: true });
const work = await mkdtemp(resolve(".data/counter-checks/check-"));
const name = `nexyral-countercheck-${randomUUID()}`;
try {
  for (const [path, content] of Object.entries(source)) {
    assert.equal(typeof content, "string");
    await mkdir(dirname(join(work, path)), { recursive: true });
    await writeFile(join(work, path), content);
  }
  await exec("docker", ["run", "--pull", "never", "--rm", "--name", name, "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128", "--memory", "512m", "--cpus", "1", "--user", `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`, "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount", `type=bind,src=${work},dst=/work`, "--mount", `type=bind,src=${resolve("node_modules")},dst=/work/node_modules,readonly`, "--workdir", "/work", buildImage, "node", "node_modules/vite/bin/vite.js", "build"], { timeout: 45000, maxBuffer: 64000, env: { PATH: process.env.PATH, DOCKER_HOST: process.env.DOCKER_HOST } });
  const files = new Map<string, Buffer>();
  async function collect(path = "") {
    for (const entry of await readdir(join(work, "dist", path), { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await collect(relative);
      else {
        const bytes = await readFile(join(work, "dist", relative));
        assert.ok(bytes.length <= 4000000);
        files.set(`/${relative}`, bytes);
      }
    }
  }
  await collect();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    const bytes = files.get(path === "/" ? "/index.html" : path);
    response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.writeHead(bytes ? 200 : 404, { "Content-Type": path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : "text/html" });
    response.end(bytes ?? "Not found");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ executablePath: process.env.NEXYRAL_CHROMIUM_PATH ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined), args: ["--no-sandbox"] });
    const context = await browser.newContext({ serviceWorkers: "block" });
    const blockedRequests: string[] = [];
    await context.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin) await route.continue();
      else { blockedRequests.push(new URL(route.request().url()).origin); await route.abort(); }
    });
    const page = await context.newPage();
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByRole("heading", { name: "Counter" })).toBeVisible();
    await expect(page.locator("p")).toHaveText("0");
    await page.getByRole("button", { name: "Increment", exact: true }).click();
    await expect(page.locator("p")).toHaveText("1");
    await page.getByRole("button", { name: "Increment", exact: true }).click();
    await expect(page.locator("p")).toHaveText("2");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator("p")).toHaveText("0");
    await page.getByRole("button", { name: "Increment", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("p")).toHaveText("1");
    await page.getByRole("button", { name: "Reset", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("p")).toHaveText("0");
    const widths = [375, 768, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []); assert.deepEqual(blockedRequests, []);
    const evidence = { scope: "Targeted smoke check of the exact real-model counter source; not a general generated-application test runner", sourceSha256, initialZero: true, increment: true, reset: true, keyboardEnterAndSpace: true, noOverflowWidths: widths, pageErrors: errors, blockedExternalRequests: blockedRequests, deployed: false };
    await writeFile("artifacts/local-model-counter-check.json", JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser?.close(); server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
} finally {
  await exec("docker", ["rm", "--force", name], { timeout: 5000 }).catch(() => undefined);
  await rm(work, { recursive: true, force: true });
}
