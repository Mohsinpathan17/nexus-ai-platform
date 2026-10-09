import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { superviseServices } from "./service-supervisor.ts";
async function availablePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture port unavailable");
  await new Promise<void>(resolve => server.close(() => resolve()));
  return address.port;
}
test("service group waits for actual HTTP readiness and shuts down owned services", async () => {
  const port = await availablePort();
  const source = `const server=require('node:http').createServer((q,r)=>r.end('ready'));server.listen(${port},'127.0.0.1');process.on('SIGTERM',()=>server.close(()=>process.exit(0)));`;
  const group = superviseServices([{ name: "Ready fixture", args: ["-e", source], readyUrl: `http://127.0.0.1:${port}` }], { startupMs: 5000, graceMs: 500 });
  try { await group.ready; group.stop(); assert.equal(await group.done, 0); }
  finally { group.stop(1); await group.done; }
  await assert.rejects(fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }));
});
test("early service exit rejects readiness and stops its companion instead of leaving an orphan", async () => {
  const group = superviseServices([
    { name: "Failure fixture", args: ["-e", "process.exit(2)"], readyUrl: "http://127.0.0.1:1" },
    { name: "Companion fixture", args: ["-e", "setInterval(()=>{},1000)"] },
  ], { startupMs: 3000, graceMs: 100 });
  await assert.rejects(group.ready, /did not become ready/);
  assert.equal(await group.done, 1);
});
test("readiness preserves an explicit preview Host including its port", async () => {
  const port = await availablePort();
  const host = "preview.fixture.test:9443";
  const source = `const server=require('node:http').createServer((q,r)=>{r.statusCode=q.headers.host===${JSON.stringify(host)}?200:421;r.end();});server.listen(${port},'127.0.0.1');process.on('SIGTERM',()=>server.close(()=>process.exit(0)));`;
  const group = superviseServices([{ name: "Preview Host fixture", args: ["-e", source], readyUrl: `http://127.0.0.1:${port}/_health`, readyHost: host }], { startupMs: 5000, graceMs: 500 });
  try { await group.ready; group.stop(); assert.equal(await group.done, 0); }
  finally { group.stop(1); await group.done; }
});
test("unresponsive service gets bounded forced shutdown after readiness timeout", async () => {
  const group = superviseServices([{ name: "Unready fixture", args: ["-e", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"], readyUrl: "http://127.0.0.1:1" }], { startupMs: 250, graceMs: 100 });
  await assert.rejects(group.ready, /did not become ready/);
  assert.equal(await group.done, 1);
});
