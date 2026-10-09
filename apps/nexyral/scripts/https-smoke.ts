import { runHttpsSmoke } from "../server/https-smoke.ts";

const [appOrigin, previewOrigin, extra] = process.argv.slice(2);
try {
  if (!appOrigin || !previewOrigin || extra) throw new Error("Usage: npm run smoke:https -- <https-app-origin> <https-preview-origin>");
  const results = await runHttpsSmoke(appOrigin, previewOrigin);
  for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}: ${result.message}`);
  console.log("Anonymous HTTPS checks only. Account persistence, recovery, generated previews, SSE and backups require separate validation.");
  process.exitCode = results.every(result => result.passed) ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "HTTPS smoke check failed.");
  process.exitCode = 1;
}
