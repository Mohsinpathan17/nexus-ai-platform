import { deploymentPreflight } from "../server/deployment-preflight.ts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { openDatabase } from "../server/database.ts";
import { superviseServices, type ServiceCommand } from "../server/service-supervisor.ts";
import { appOrigins, previewOrigin } from "../server/config.ts";
const compiled = process.argv[2] === "serve";
const apiPort = Number(process.env.NEXYRAL_API_PORT ?? 8787);
const origin = previewOrigin(appOrigins());
const viteArgs = process.argv.slice(3);
const portIndex = viteArgs.indexOf("--port");
const vitePort = portIndex >= 0 ? Number(viteArgs[portIndex + 1]) : 5173;
const previewHost = process.env.NEXYRAL_PREVIEW_HOST;
const previewListener = !previewHost || previewHost === "0.0.0.0" ? "127.0.0.2" : previewHost;
const previewReady = `http://${previewListener}:${process.env.NEXYRAL_PREVIEW_PORT ?? (new URL(origin).port || 8788)}/_health`;
const commands: ServiceCommand[] = compiled ? [
  { name: "Workspace API", args: ["server-dist/server/index.js"], readyUrl: `http://127.0.0.1:${apiPort}/api/health` },
  { name: "Preview service", args: ["server-dist/server/preview-entry.js"], readyUrl: previewReady, readyHost: new URL(origin).host },
] : [
  { name: "Workspace API", args: ["--watch", "server/index.ts"], readyUrl: `http://127.0.0.1:${apiPort}/api/health` },
  { name: "Preview service", args: ["--watch", "server/preview-entry.ts"], readyUrl: previewReady, readyHost: new URL(origin).host },
  { name: "Vite", args: ["node_modules/vite/bin/vite.js", "--strictPort", ...viteArgs], readyUrl: `http://127.0.0.1:${vitePort}` },
];
if (compiled && !existsSync("server-dist/server/index.js")) throw new Error("Run npm run build before starting compiled services.");
if (process.env.NEXYRAL_START_WORKER === "1") {
  if (!process.env.NEXYRAL_PLANNING_MODEL) throw new Error("An explicitly enabled worker requires NEXYRAL_PLANNING_MODEL.");
  commands.push({ name: "Engineering worker", args: [compiled ? "server-dist/server/worker-entry.js" : "server/worker-entry.ts"] });
}
if (compiled) {
  const failures = (await deploymentPreflight()).filter(check => !check.passed);
  if (failures.length) throw new Error(failures.map(check => `${check.name}: ${check.message}`).join("; "));
  // Initialize/migrate once before the API and preview processes open SQLite.
  const db = openDatabase(resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"));
  db.close();
}
const services = superviseServices(commands);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => services.stop(0));
try { await services.ready; console.log("NEXYRAL services ready. Worker startup remains explicitly controlled."); }
catch (error) { console.error(error instanceof Error ? error.message : "Service startup failed."); }
process.exitCode = await services.done;
