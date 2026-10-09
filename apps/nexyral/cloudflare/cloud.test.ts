import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { authenticate } from "./auth.ts";
import { generate } from "./gemini.ts";
import worker, { type Env } from "./worker.ts";
const pair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const jwk = {
  ...(await crypto.subtle.exportKey("jwk", pair.publicKey)),
  kid: "test-key",
};
function base64(value: string | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}
async function token(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const parts = [
    base64(JSON.stringify({ alg: "RS256", kid: "test-key" })),
    base64(
      JSON.stringify({
        sub: "owner-a",
        aud: "test-project",
        iss: "https://securetoken.google.com/test-project",
        iat: now,
        exp: now + 3600,
        email_verified: true,
        ...overrides,
      }),
    ),
  ];
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(parts.join(".")),
  );
  return `${parts.join(".")}.${base64(new Uint8Array(signature))}`;
}
const jwksFetch: typeof fetch = async () => Response.json({ keys: [jwk] });
function request(path: string, jwt: string, body?: unknown) {
  return new Request(`https://nexyral.example${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Origin: "https://nexyral.example",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("./migrations/0001_projects.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(readFileSync(new URL('./migrations/0002_email_codes.sql',import.meta.url),'utf8'));
  const adapter = {
    async batch(statements: {run:()=>Promise<unknown>}[]) {
      db.exec('BEGIN');
      try { const results=[]; for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results; }
      catch(error){db.exec('ROLLBACK');throw error;}
    },
    prepare(sql: string) {
      let args: (string | number)[] = [];
      return {
        bind(...values: (string | number)[]) {
          args = values;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...args) };
        },
        async run() {
          return {
            meta: { changes: Number(db.prepare(sql).run(...args).changes) },
          };
        },
      };
    },
  };
  return { db, binding: adapter as unknown as Env["DB"] };
}
test("Firebase signatures, audience and expiry are validated", async () => {
  assert.equal(
    (
      await authenticate(
        request("/api/cloud/projects", await token()),
        "test-project",
        jwksFetch,
      )
    ).sub,
    "owner-a",
  );
  await assert.rejects(
    authenticate(
      request("/", await token({ aud: "wrong" })),
      "test-project",
      jwksFetch,
    ),
  );
  await assert.rejects(
    authenticate(
      request("/", await token({ exp: 1 })),
      "test-project",
      jwksFetch,
    ),
  );
  const jwt = await token();
  await assert.rejects(
    authenticate(
      request("/", jwt.slice(0, -20) + "AAAAAAAAAAAAAAAAAAAA"),
      "test-project",
      jwksFetch,
    ),
  );
});
test("Gemini structured generation succeeds without claiming verification", async () => {
  let endpoint = "";
  const output = await generate(
    "Build a support interface",
    "test-secret",
    "test-model",
    async (url, init) => {
      endpoint = String(url);
      assert.equal(
        new Headers(init?.headers).get("x-goog-api-key"),
        "test-secret",
      );
      assert.ok(!endpoint.includes("test-secret"));
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    app: "export default function App() { return <main>Support</main>; }",
                    css: "main { padding: 24px; }",
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  );
  assert.match(endpoint, /test-model:generateContent$/);
  assert.match(output.app, /export default/);
});
test("Gemini quota, blocked/truncated output and invalid source fail clearly", async () => {
  await assert.rejects(
    generate(
      "test",
      "key",
      "model",
      async () => new Response("", { status: 429 }),
    ),
    /quota/,
  );
  await assert.rejects(
    generate("test", "key", "model", async () =>
      Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
    ),
    /incomplete/,
  );
  await assert.rejects(
    generate("test", "key", "model", async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"app":"invalid","css":""}' }] },
          },
        ],
      }),
    ),
    /Invalid/,
  );
});
test("projects persist, are owner scoped, require verification, and enforce a daily generation budget", async () => {
  const { db, binding } = database();
  const env: Env = {
    DB: binding,
    ASSETS: {
      fetch: async () => new Response("asset"),
    } as unknown as Env["ASSETS"],
    FIREBASE_PROJECT_ID: "test-project",
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: "test-model",
    DAILY_GENERATION_LIMIT: "1",
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  app: "export default function App() { return <main>Support</main>; }",
                  css: "",
                }),
              },
            ],
          },
        },
      ],
    });
  try {
    const jwt = await token();
    // Prime the real signature verifier's fixed Google-key cache with the test public key.
    await authenticate(request("/", jwt), "test-project", jwksFetch);
    const created = await worker.fetch(
      request("/api/cloud/projects", jwt, {
        intent: "Build a support interface",
      }),
      env,
    );
    assert.equal(created.status, 201);
    const { id } = (await created.json()) as { id: string };
    const other = await token({ sub: "owner-b" });
    assert.equal(
      (await worker.fetch(request(`/api/cloud/projects/${id}`, other), env))
        .status,
      404,
    );
    assert.equal(
      (
        await worker.fetch(
          request(
            `/api/cloud/projects/${id}/generate`,
            await token({ email_verified: false }),
            {},
          ),
          env,
        )
      ).status,
      403,
    );
    const generated = await worker.fetch(
      request(`/api/cloud/projects/${id}/generate`, jwt, {}),
      env,
    );
    assert.equal(generated.status, 200);
    assert.equal(
      ((await generated.json()) as { verification: string }).verification,
      "not_run",
    );
    assert.equal(
      (
        await worker.fetch(
          request(`/api/cloud/projects/${id}/generate`, jwt, {}),
          env,
        )
      ).status,
      409,
    );
    const second = await worker.fetch(
      request("/api/cloud/projects", jwt, {
        intent: "Build a second interface",
      }),
      env,
    );
    const secondId = ((await second.json()) as { id: string }).id;
    assert.equal(
      (
        await worker.fetch(
          request(`/api/cloud/projects/${secondId}/generate`, jwt, {}),
          env,
        )
      ).status,
      429,
    );
    assert.equal(db.prepare("SELECT count(*) AS n FROM projects").get()?.n, 2);
    assert.equal(
      db.prepare("SELECT count FROM generation_usage").get()?.count,
      1,
    );
  } finally {
    globalThis.fetch = original;
    db.close();
  }
});
test("missing identity and cross-origin writes cannot reach project storage", async () => {
  const env = { FIREBASE_PROJECT_ID: "test-project" } as Env;
  assert.equal(
    (
      await worker.fetch(
        new Request("https://nexyral.example/api/cloud/projects"),
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://nexyral.example/api/cloud/projects", {
          method: "POST",
          headers: { Origin: "https://other.example" },
        }),
        env,
      )
    ).status,
    403,
  );
});
test('an obsolete generation lease cannot overwrite a newer result', async () => {
  const { db, binding } = database();
  const env: Env = { DB: binding, ASSETS: { fetch: async () => new Response('asset') } as unknown as Env['ASSETS'], FIREBASE_PROJECT_ID: 'test-project', GEMINI_API_KEY: 'fixture-key', GEMINI_MODEL: 'test-model', DAILY_GENERATION_LIMIT: '10' };
  const jwt = await token();
  await authenticate(request('/', jwt), 'test-project', jwksFetch);
  const created = await worker.fetch(request('/api/cloud/projects', jwt, { intent: 'Build a counter interface' }), env);
  const { id } = await created.json() as { id: string };
  const newer = JSON.stringify({ app: 'export default function App() { return <main>Newer</main>; }', css: '' });
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    // A second request has already acquired a new lease and persisted its result.
    db.prepare("UPDATE projects SET status='generated',source=?,updated_at=? WHERE id=?").run(newer, '2099-01-01T00:00:00.000Z', id);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ app: 'export default function App() { return <main>Obsolete</main>; }', css: '' }) }] } }] });
  };
  try {
    const response = await worker.fetch(request(`/api/cloud/projects/${id}/generate`, jwt, {}), env);
    assert.equal(response.status, 409);
    assert.equal(db.prepare('SELECT source FROM projects WHERE id=?').get(id)?.source, newer);
  } finally { globalThis.fetch = original; db.close(); }
});

test('signed unverified account becomes eligible only after its email code is confirmed',async()=>{
  const {db,binding}=database();const jwt=await token({email:'owner@example.invalid',email_verified:false});
  const env={DB:binding,ASSETS:{fetch:async()=>new Response('asset')} as unknown as Env['ASSETS'],FIREBASE_PROJECT_ID:'test-project',GEMINI_API_KEY:'fixture-ai',GEMINI_MODEL:'fixture-model',DAILY_GENERATION_LIMIT:'1',RESEND_API_KEY:'fixture-mail',EMAIL_CODE_SECRET:'fixture-pepper'};
  const original=globalThis.fetch;let code='';
  globalThis.fetch=async(input,init)=>{
    if(String(input).includes('api.resend.com')){const body=JSON.parse(String(init?.body)) as {text:string};code=body.text.match(/code is (\d{6})/)![1];return Response.json({id:'fixture'});}
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({app:'export default function App() { return <main>Verified owner</main>; }',css:''})}]}}]});
  };
  try{
    assert.equal((await worker.fetch(request('/api/cloud/verification/send','invalid-token',{}),env)).status,401);
    const created=await worker.fetch(request('/api/cloud/projects',jwt,{intent:'Build a support inbox interface'}),env);const {id}=await created.json() as {id:string};
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/generate`,jwt,{}),env)).status,403);
    assert.equal((await worker.fetch(request('/api/cloud/verification/send',jwt,{}),env)).status,200);
    assert.equal((await worker.fetch(request('/api/cloud/verification/confirm',jwt,{code}),env)).status,200);
    assert.deepEqual(await (await worker.fetch(request('/api/cloud/verification/status',jwt),env)).json(),{verified:true,deliveryConfigured:true});
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/generate`,jwt,{}),env)).status,200);
    const changed=await token({email:'changed@example.invalid',email_verified:false});
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/generate`,changed,{}),env)).status,403);
  }finally{globalThis.fetch=original;db.close();}
});
