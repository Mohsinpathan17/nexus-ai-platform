import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { verifyFrontend, validateSource, buildImage } from "./build.ts";
import { ollamaBuilder } from "./builder.ts";
let dockerReady = false;
try { execFileSync("docker", ["image", "inspect", buildImage], { stdio: "ignore" }); dockerReady = true; } catch { /* Optional worker capability, not a website prerequisite. */ }
const source = { app: 'import React from "react"; export default function App() { const [count, setCount] = React.useState(0); return <main><h1>Counter</h1><button onClick={() => setCount(count+1)}>Count {count}</button></main>; }', css: 'body { font-family: system-ui; }' };
test("real isolated frontend verification runs TypeScript and Vite, preserving measured evidence", { skip: !dockerReady }, async () => {
  const result = await verifyFrontend(source, AbortSignal.timeout(45000));
  assert.equal(result.verification.passed, true, result.verification.output);
  assert.deepEqual(result.verification.checks.map((c) => c.exitCode), [0, 0]);
  assert.equal(result.verification.testsRun, false);
  assert.equal(result.verification.deployed, false);
  assert.equal(result.source["src/App.tsx"], source.app);
  assert.match(result.verification.output, /built in/);
});
test("real type error stops verification before Vite and records nonzero exit", { skip: !dockerReady }, async () => {
  const result = await verifyFrontend({ ...source, app: 'import React from "react"; const count: number = "invalid"; export default function App(){return <h1>{count}</h1>;}' }, AbortSignal.timeout(45000), undefined, [{ name: 'Must not run', steps: [{ action: 'expectText', text: 'Done' }] }]);
  assert.equal(result.verification.passed, false);
  assert.equal(result.verification.checks.length, 1);
  assert.notEqual(result.verification.checks[0].exitCode, 0);
  assert.match(result.verification.output, /TS2322/);
  assert.equal(result.verification.testsRun, false);
  assert.equal(result.verification.behavior?.status, "not_run");
});
test("bounded source only contributes the two allowed generated files", () => {
  assert.throws(() => validateSource({ app: "x".repeat(60001), css: "" }));
  assert.throws(() => validateSource({ app: "invalid", css: 4 }));
  assert.deepEqual(validateSource({ ...source, "../../private": "attack" }), source);
});
test("pre-cancelled builds do not launch a container", { skip: !dockerReady }, async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(verifyFrontend(source, controller.signal), { name: "AbortError" });
});
for (const repaired of [true, false]) {
  test(`one bounded repair preserves actual failed compiler evidence; repaired=${repaired}`, { skip: !dockerReady }, async () => {
    const requests: { input: string; format: { required: string[] } }[] = [];
    const provider = createServer(async (request, response) => {
      let raw = ""; for await (const chunk of request) raw += chunk;
      const body = JSON.parse(raw) as { messages: { content: string }[]; format: { required: string[] } };
      requests.push({ input: body.messages[1].content, format: body.format });
      const generated = requests.length === 2 && repaired ? source : { app: "<div id='counter'></div>", css: "" };
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ done: true, message: { content: JSON.stringify(generated) } }));
    });
    await new Promise<void>((done) => provider.listen(0, "127.0.0.1", done));
    try {
      const builder = ollamaBuilder("fixture", `http://127.0.0.1:${(provider.address() as AddressInfo).port}`);
      const result = await builder("Build a counter", { summary: "Counter", requirements: ["Increment"], architecture: ["React"], acceptanceCriteria: ["Counter updates"], risks: ["No backend"] }, AbortSignal.timeout(60000));
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[0].format.required, ["app", "css"]);
      assert.match(requests[1].input, /TS1192/);
      assert.equal(result.verification.passed, repaired);
      assert.equal(result.verification.attempts?.length, 2);
      assert.equal(result.verification.attempts![0].passed, false);
      assert.notEqual(result.verification.attempts![0].checks[0].exitCode, 0);
      assert.equal(result.verification.attempts![1].passed, repaired);
      if (repaired) assert.notEqual(result.verification.attempts![0].sourceSha256, result.verification.attempts![1].sourceSha256);
    } finally {
      provider.closeAllConnections(); await new Promise<void>((done) => provider.close(() => done()));
    }
  });
}

test("approved browser checks execute in Docker and failures gate verification", { skip: !dockerReady }, async () => {
  for (const succeeds of [true, false]) {
    const interactive = { ...source, app: source.app.replace('const [count, setCount]', 'const [name, setName] = React.useState(""); const [count, setCount]').replace('<h1>Counter</h1>', '<h1>Counter</h1><label>Name<input value={name} onChange={event => setName(event.target.value)} /></label><p>{name}</p>') };
    const result = await verifyFrontend(interactive, AbortSignal.timeout(60000), undefined, [
      { name: "Counter increments", steps: [{ action: "click", text: "Count 0" }, { action: "expectText", text: succeeds ? "Count 1" : "Count 99" }] },
      { name: "Fresh context and input", steps: [{ action: "expectText", text: "Count 0" }, { action: "fill", text: "Name", value: "Ada" }, { action: "expectText", text: "Ada" }] },
    ]);
    assert.equal(result.verification.testsRun, true, result.verification.output);
    assert.equal(result.verification.passed, succeeds, result.verification.output);
    assert.equal(result.verification.behavior?.status, succeeds ? "passed" : "failed");
    assert.equal(result.verification.behavior?.results[0].passed, succeeds);
    assert.equal(result.verification.behavior?.results[1].passed, true, result.verification.output);
    assert.deepEqual(result.verification.checks.map((check) => check.exitCode), [0, 0, succeeds ? 0 : 1]);
  }
});
