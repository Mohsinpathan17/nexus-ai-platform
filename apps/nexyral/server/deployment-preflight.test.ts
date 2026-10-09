import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./database.ts";
import { deploymentPreflight } from "./deployment-preflight.ts";
import { accountProviderChecks } from "./account-provider-config.ts";
import { DatabaseSync } from "node:sqlite";
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "nexyral-preflight-"));
  await mkdir(join(root, ".data"), { mode: 0o700 });
  return { root, close: () => rm(root, { recursive: true, force: true }) };
}
test("preflight accepts an empty version0 database without changing it, and rejects unknown version0 objects", async () => {
  const f = await fixture(); const path = join(f.root, ".data/nexyral.sqlite");
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA user_version=0;"); await chmod(path, 0o600);
    const storage = async () => (await deploymentPreflight(f.root, {})).find(check => check.name === "Database storage")!;
    assert.equal((await storage()).passed, true);
    assert.equal((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 0);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length, 0);
    db.exec("CREATE TABLE unrelated(value TEXT); INSERT INTO unrelated VALUES('retained');");
    assert.equal((await storage()).passed, false);
    assert.equal((db.prepare("SELECT value FROM unrelated").get() as { value: string }).value, "retained");
  } finally { db.close(); await f.close(); }
});
test("production preflight rejects missing HTTPS origins, shared preview hosts and exposed trusted-proxy listeners", async () => {
  const f = await fixture();
  const base = { NODE_ENV: "production", NEXYRAL_APP_ORIGINS: "https://app.fixture.test", NEXYRAL_PREVIEW_ORIGIN: "https://preview.fixture.test" };
  try {
    const check = async (env: NodeJS.ProcessEnv) => (await deploymentPreflight(f.root, env)).find(check => check.name === "Origins and proxy")!;
    assert.equal((await check(base)).passed, true);
    for (const env of [{ NODE_ENV: "production" }, { ...base, NEXYRAL_APP_ORIGINS: "http://app.fixture.test" }, { ...base, NEXYRAL_PREVIEW_ORIGIN: "https://app.fixture.test" }, { ...base, NEXYRAL_TRUSTED_PROXIES: "127.0.0.1", NEXYRAL_API_HOST: "0.0.0.0" }])
      assert.equal((await check(env)).passed, false);
  } finally { await f.close(); }
});
test("public account launch fails closed for missing providers, without exposing secret values", () => {
  assert.equal(accountProviderChecks({}).every(check => check.passed), true);
  assert.equal(accountProviderChecks({ NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS: "1" }).filter(check => !check.passed).length, 3);
  const incomplete = accountProviderChecks({ NEXYRAL_GITHUB_CLIENT_SECRET: "sensitive-fixture-value", NEXYRAL_SMTP_PASSWORD: "sensitive-fixture-value" });
  assert.equal(incomplete.filter(check => !check.passed).length, 2);
  assert.doesNotMatch(JSON.stringify(incomplete), /sensitive-fixture-value/);
});
test("account provider configuration rejects wrong origins and insecure mail, and distinguishes configuration from delivery", () => {
  const valid = { NODE_ENV: "production", NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS: "1", NEXYRAL_APP_ORIGINS: "https://app.fixture.test", NEXYRAL_GITHUB_CLIENT_ID: "fixture", NEXYRAL_GITHUB_CLIENT_SECRET: "fixture", NEXYRAL_SMTP_HOST: "smtp.fixture.test", NEXYRAL_SMTP_USER: "fixture", NEXYRAL_SMTP_PASSWORD: "fixture", NEXYRAL_MAIL_FROM: "sender@fixture.test", NEXYRAL_SUPPORT_EMAIL: "support@fixture.test" };
  assert.equal(accountProviderChecks(valid).every(check => check.passed), true);
  assert.equal(accountProviderChecks({ ...valid, NEXYRAL_AUTH_ORIGIN: "https://other.fixture.test" })[0].passed, false);
  assert.equal(accountProviderChecks({ ...valid, NEXYRAL_SMTP_PORT: "25" })[1].passed, false);
  assert.equal(accountProviderChecks({ ...valid, NEXYRAL_APP_ORIGINS: "http://app.fixture.test" })[1].passed, false);
  assert.equal(accountProviderChecks({ ...valid, NEXYRAL_SUPPORT_EMAIL: "invalid" })[2].passed, false);
  assert.match(accountProviderChecks(valid)[1].message, /still need live checks/);
});
test("preflight detects unsafe database permissions and newer schemas without migrating data", async () => {
  const f = await fixture(); const path = join(f.root, ".data/nexyral.sqlite");
  try {
    const db = openDatabase(path); db.exec("PRAGMA user_version=8;"); db.close();
    const result = await deploymentPreflight(f.root, {});
    assert.match(result.find(check => check.name === "Database storage")!.message, /Unsupported database/);
    await chmod(path, 0o644);
    assert.match((await deploymentPreflight(f.root, {})).find(check => check.name === "Database storage")!.message, /private regular file/);
  } finally { await f.close(); }
});
test("public-demo output is rejected even when required workspace files are present", async () => {
  const f = await fixture();
  try {
    for (const file of ["dist/index.html", "server-dist/server/index.js", "server-dist/server/preview-entry.js", "server-dist/server/behavior-harness.mjs", "node_modules/react/package.json", "node_modules/typescript/package.json", "dist/demo-build.json"]) {
      const path = join(f.root, file); await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, "fixture");
    }
    assert.match((await deploymentPreflight(f.root, {})).find(check => check.name === "Workspace build")!.message, /Public-demo output/);
  } finally { await f.close(); }
});
