import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";

// Deploy only an explicitly built public website. Never upload the repository,
// SQLite data, server output, environment files, or model artifacts.
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error("Add VERCEL_TOKEN securely in environment settings before deploying.");
const index = await readFile("dist/index.html", "utf8");
if (!index.includes("/assets/")) throw new Error("Build the public demo first with npm run build:demo.");
const marker = JSON.parse(await readFile("dist/demo-build.json", "utf8")) as { publicDemo: boolean; indexSha256: string };
if (marker.publicDemo !== true || marker.indexSha256 !== createHash("sha256").update(index).digest("hex")) throw new Error("Run npm run build:demo; ordinary builds cannot be deployed by this helper.");
const files: { file: string; data: string; encoding: "base64" }[] = [];
async function collect(directory: string, prefix = "") {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + item.name;
    if (item.isDirectory()) await collect(join(directory, item.name), name + "/");
    else if (item.isFile()) files.push({ file: name, data: (await readFile(join(directory, item.name))).toString("base64"), encoding: "base64" });
    else throw new Error("Unexpected symlink in deployment output.");
  }
}
await collect("dist");
files.push({ file: "vercel.json", data: Buffer.from(JSON.stringify({ rewrites: [{ source: "/((?!api/).*)", destination: "/index.html" }] })).toString("base64"), encoding: "base64" });
let previous: { name?: string; projectId?: string } = {};
try { previous = JSON.parse(await readFile(".data/vercel-demo.json", "utf8")); }
catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
if (previous.projectId && (!/^nexyral-demo-[a-f0-9]{8}$/.test(previous.name ?? "") || !/^prj_[a-zA-Z0-9]+$/.test(previous.projectId))) throw new Error("Unexpected existing demo project metadata.");
const name = previous.projectId ? previous.name! : `nexyral-demo-${randomBytes(4).toString("hex")}`;
const response = await fetch("https://api.vercel.com/v13/deployments", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name, project: previous.projectId, target: "production", files, projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null } }),
  signal: AbortSignal.timeout(60_000),
});
if (!response.ok) throw new Error(`Vercel rejected deployment (HTTP ${response.status}). No credentials were logged.`);
const deployment = await response.json() as { id: string; url: string; projectId: string; name: string };
if (!deployment.id || !/^[a-z0-9.-]+\.vercel\.app$/.test(deployment.url)) throw new Error("Unexpected deployment response.");
await mkdir(".data", { recursive: true });
await writeFile(".data/vercel-demo.json", JSON.stringify({ id: deployment.id, url: deployment.url, projectId: deployment.projectId, name: deployment.name }, null, 2), { mode: 0o600 });
console.log(`Deployment submitted: https://${deployment.url}. Verify READY status and public HTTP access before sharing as a working demo.`);
