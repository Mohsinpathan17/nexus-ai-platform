import { deploymentPreflight } from "../server/deployment-preflight.ts";
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--public-accounts")) throw new Error("Usage: npm run preflight:backend -- [--public-accounts]");
const checks = await deploymentPreflight(process.cwd(), {
  ...process.env,
  ...(args.includes("--public-accounts") ? { NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS: "1", NODE_ENV: "production" } : {}),
});
for (const check of checks) console.log(`${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
process.exitCode = checks.every(check => check.passed) ? 0 : 1;
