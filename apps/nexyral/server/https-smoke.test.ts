import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createServer as createTlsServer } from "node:https";
import { request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { openDatabase } from "./database.ts";
import { createApp } from "./app.ts";
import { createPreviewServer } from "./preview-server.ts";
import { validateSmokeOrigins } from "./https-smoke.ts";

test("HTTPS smoke requires canonical TLS origins and different hostnames", () => {
  validateSmokeOrigins("https://app.fixture.test", "https://preview.fixture.test");
  for (const [app, preview] of [
    ["http://app.fixture.test", "https://preview.fixture.test"],
    ["https://app.fixture.test", "https://app.fixture.test:9443"],
    ["https://user:password@app.fixture.test", "https://preview.fixture.test"],
    ["https://app.fixture.test/path", "https://preview.fixture.test"],
    ["https://app.fixture.test", "https://preview.fixture.test/?token=secret"],
  ]) assert.throws(() => validateSmokeOrigins(app, preview), /canonical HTTPS/);
});

test("HTTPS command validates actual API/preview routes with trusted TLS and rejects redirects, oversized bodies and untrusted certificates", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexyral-https-smoke-"));
  const db = openDatabase(":memory:");
  const servers: Server[] = [];
  let mode: "normal" | "redirect" | "oversized" | "misrouted" = "normal";
  let requests = 0;
  async function listen(server: Server, host: string) {
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, host, resolve));
    return (server.address() as AddressInfo).port;
  }
  async function command(app: string, preview: string, trustCertificate = true) {
    const env = { ...process.env, NO_PROXY: "127.0.0.1,127.0.0.2", no_proxy: "127.0.0.1,127.0.0.2" };
    delete env.NODE_TLS_REJECT_UNAUTHORIZED;
    delete env.NODE_EXTRA_CA_CERTS;
    if (trustCertificate) env.NODE_EXTRA_CA_CERTS = join(root, "certificate.pem");
    return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ["--use-env-proxy", "scripts/https-smoke.ts", app, preview], { env, stdio: ["ignore", "pipe", "pipe"] });
      let output = "";
      child.stdout.on("data", chunk => output += chunk);
      child.stderr.on("data", chunk => output += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, output }));
    });
  }
  try {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-noenc", "-days", "1", "-keyout", join(root, "key.pem"), "-out", join(root, "certificate.pem"), "-subj", "/CN=NEXYRAL local TLS fixture", "-addext", "subjectAltName=IP:127.0.0.1,IP:127.0.0.2"], { stdio: "ignore" });
    const tls = { key: await readFile(join(root, "key.pem")), cert: await readFile(join(root, "certificate.pem")) };
    let appPort = 0; let previewPort = 0;
    function proxy(target: () => number, host: string) {
      return createTlsServer(tls, (incoming, outgoing) => {
        requests++;
        outgoing.setHeader("Strict-Transport-Security", "max-age=31536000");
        if (host === "127.0.0.1" && incoming.url === "/" && mode === "redirect") {
          outgoing.writeHead(302, { Location: "/must-not-follow" }); outgoing.end(); return;
        }
        if (host === "127.0.0.1" && incoming.url === "/" && mode === "oversized") {
          outgoing.end("x".repeat(300 * 1024)); return;
        }
        const misrouted = host === "127.0.0.2" && mode === "misrouted";
        const upstream = request({ hostname: misrouted ? "127.0.0.1" : host, port: misrouted ? appPort : target(), path: incoming.url, method: incoming.method, headers: incoming.headers }, response => {
          outgoing.writeHead(response.statusCode ?? 502, response.headers); response.pipe(outgoing);
        });
        upstream.on("error", () => { outgoing.statusCode = 502; outgoing.end(); });
        incoming.pipe(upstream);
      });
    }
    const appTlsPort = await listen(proxy(() => appPort, "127.0.0.1"), "127.0.0.1");
    const previewTlsPort = await listen(proxy(() => previewPort, "127.0.0.2"), "127.0.0.2");
    const appOrigin = `https://127.0.0.1:${appTlsPort}`;
    const previewOrigin = `https://127.0.0.2:${previewTlsPort}`;
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist/index.html"), "<!doctype html><title>NEXYRAL TLS routing fixture</title>");
    appPort = await listen(createApp({ db, origins: [appOrigin], previewOrigin, staticDir: resolve(root, "dist") }), "127.0.0.1");
    previewPort = await listen(createPreviewServer({ db, origins: [appOrigin], previewOrigin }), "127.0.0.2");

    const passing = await command(appOrigin, previewOrigin);
    assert.equal(passing.code, 0, passing.output);
    assert.equal(passing.output.match(/^PASS /gm)?.length, 8);
    assert.equal((db.prepare("SELECT count(*) AS count FROM users").get() as { count: number }).count, 0);
    assert.equal((db.prepare("SELECT count(*) AS count FROM runs").get() as { count: number }).count, 0);

    requests = 0; mode = "redirect";
    const redirected = await command(appOrigin, previewOrigin);
    assert.equal(redirected.code, 1); assert.match(redirected.output, /FAIL Application/);
    assert.equal(requests, 8, "Redirect must not be followed");
    mode = "oversized";
    const oversized = await command(appOrigin, previewOrigin);
    assert.equal(oversized.code, 1); assert.match(oversized.output, /time\/size limits/);
    mode = "misrouted";
    const misrouted = await command(appOrigin, previewOrigin);
    assert.equal(misrouted.code, 1); assert.match(misrouted.output, /FAIL Separate preview service/);
    assert.match(misrouted.output, /FAIL Preview denies account routes/);
    mode = "normal";
    const untrusted = await command(appOrigin, previewOrigin, false);
    assert.equal(untrusted.code, 1); assert.match(untrusted.output, /check DNS, certificates/);
    assert.doesNotMatch(untrusted.output, /BEGIN PRIVATE KEY/);
  } finally {
    for (const server of servers) server.closeAllConnections();
    await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve()))));
    db.close(); await rm(root, { recursive: true, force: true });
  }
});
