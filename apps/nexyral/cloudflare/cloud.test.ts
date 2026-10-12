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
  db.exec(readFileSync(new URL("./migrations/0003_public_examples.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL('./migrations/0004_project_versions.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('./migrations/0005_guide_usage.sql',import.meta.url),'utf8'));
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


test('public examples use real provider output once, cache it, and reject arbitrary briefs and origins', async () => {
  const {db,binding}=database();
  const env={DB:binding,GEMINI_API_KEY:'test-only',GEMINI_MODEL:'gemini-test',DAILY_GENERATION_LIMIT:'10'} as Env;
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({html:'<main><h1>Generated runway calculator</h1></main>',css:'main{padding:20px}',js:'document.querySelector("h1").textContent="Runway";'})}]}}]});};
  const build=()=>new Request('https://nexyral.example/api/examples/runway',{method:'POST',headers:{Origin:'https://nexyral.example'}});
  try {
    const initial=await worker.fetch(new Request('https://nexyral.example/api/examples/runway'),env); assert.equal((await initial.json() as {status:string}).status,'not-built');
    assert.equal((await worker.fetch(build(),env)).status,200);
    const cached=await worker.fetch(build(),env);assert.equal((await cached.json() as {cached:boolean}).cached,true);assert.equal(calls,1);
    assert.equal((await worker.fetch(new Request('https://nexyral.example/api/examples/arbitrary'),env)).status,404);
    assert.equal((await worker.fetch(new Request('https://nexyral.example/api/examples/runway',{method:'POST',headers:{Origin:'https://attacker.example'}}),env)).status,403);
    assert.equal(db.prepare('SELECT count FROM generation_usage').get()?.count,1);
  } finally {globalThis.fetch=original;db.close();}
});
test('public example failures are bounded and shared daily budget is enforced',async()=>{
  const {db,binding}=database();const original=globalThis.fetch;let calls=0;
  const env={DB:binding,GEMINI_API_KEY:'test-only',GEMINI_MODEL:'gemini-test',DAILY_GENERATION_LIMIT:'1'} as Env;
  globalThis.fetch=async()=>{calls++;return new Response('',{status:429});};
  const build=()=>new Request('https://nexyral.example/api/examples/runway',{method:'POST',headers:{Origin:'https://nexyral.example'}});
  try {assert.equal((await worker.fetch(build(),env)).status,502);assert.equal((await worker.fetch(build(),env)).status,429);assert.equal(calls,1);}
  finally{globalThis.fetch=original;db.close();}
});

test('an in-flight public example cannot start a duplicate provider request',async()=>{
 const {db,binding}=database();db.prepare("INSERT INTO public_examples(id,status,updated_at) VALUES('support','generating',?)").run(Date.now());
 const response=await worker.fetch(new Request('https://nexyral.example/api/examples/support',{method:'POST',headers:{Origin:'https://nexyral.example'}}),{DB:binding,GEMINI_API_KEY:'test',GEMINI_MODEL:'gemini-test',DAILY_GENERATION_LIMIT:'10'} as Env);
 assert.equal(response.status,409);assert.equal(db.prepare('SELECT count(*) as count FROM generation_usage').get()?.count,0);db.close();
});
test('three failed public builds exhaust the per-example retry cap',async()=>{
 const {db,binding}=database();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('',{status:503});};
 const env={DB:binding,GEMINI_API_KEY:'test',GEMINI_MODEL:'gemini-test',DAILY_GENERATION_LIMIT:'10'} as Env;
 const request=()=>new Request('https://nexyral.example/api/examples/launch',{method:'POST',headers:{Origin:'https://nexyral.example'}});
 try{for(let attempt=0;attempt<3;attempt++)assert.equal((await worker.fetch(request(),env)).status,502);assert.equal((await worker.fetch(request(),env)).status,409);assert.equal(calls,3);}
 finally{globalThis.fetch=original;db.close();}
});

test('source edits persist with ownership, size validation and optimistic conflict protection, without inference', async () => {
  const {db,binding}=database();
  const env={DB:binding,FIREBASE_PROJECT_ID:'test-project'} as Env;
  const jwt=await token();await authenticate(request('/',jwt),'test-project',jwksFetch);
  const id='44444444-4444-4444-8444-444444444444';
  const original={app:'export default function App(){return <main>Original</main>}',css:''};
  db.prepare("INSERT INTO projects(id,owner_id,intent,status,source,created_at,updated_at) VALUES(?,?,?,'generated',?,?,?)").run(id,'owner-a','Edit my existing frontend',JSON.stringify(original),'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
  const source={app:'export default function App(){return <main>Edited</main>}',css:'main{color:navy}'};
  const payload={source,updatedAt:'2026-01-01T00:00:00.000Z'};
  try {
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/source`,await token({sub:'other-owner'}),payload),env)).status,404);
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/source`,jwt,{...payload,source:{app:'invalid',css:''}}),env)).status,400);
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/source`,jwt,{...payload,source:{app:'x'.repeat(130000),css:''}}),env)).status,413);
    const saved=await worker.fetch(request(`/api/cloud/projects/${id}/source`,jwt,payload),env);assert.equal(saved.status,200);
    const result=await saved.json() as {source:typeof source;updated_at:string};assert.deepEqual(result.source,source);
    assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/source`,jwt,payload),env)).status,409);
    const read=await worker.fetch(request(`/api/cloud/projects/${id}`,jwt),env);assert.deepEqual((await read.json() as {source:typeof source}).source,source);
    assert.equal(db.prepare('SELECT count(*) as count FROM generation_usage').get()?.count,0);
  } finally {db.close();}
});

test('AI revisions use existing source, save recoverable versions, and restore without another inference',async()=>{
 const {db,binding}=database();const jwt=await token();await authenticate(request('/',jwt),'test-project',jwksFetch);
 const env={DB:binding,FIREBASE_PROJECT_ID:'test-project',GEMINI_API_KEY:'fixture-key',GEMINI_MODEL:'fixture-model',DAILY_GENERATION_LIMIT:'10'} as Env;
 const id='55555555-5555-4555-8555-555555555555';const before={app:'export default function App(){return <main>Before revision</main>}',css:'main{color:blue}'};
 db.prepare("INSERT INTO projects(id,owner_id,intent,status,source,created_at,updated_at) VALUES(?,?,?,'generated',?,?,?)").run(id,'owner-a','Build a support interface',JSON.stringify(before),'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.match(body.contents[0].parts[0].text,/Before revision/);assert.match(body.contents[0].parts[0].text,/Use a green palette/);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...before,css:'main{color:green}'})}]}}]});};
 try {
  const payload={instruction:'Use a green palette',updatedAt:'2026-01-01T00:00:00.000Z'};
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,await token({sub:'other'}),payload),env)).status,404);
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,await token({email_verified:false}),payload),env)).status,403);
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,jwt,{...payload,instruction:'x'}),env)).status,400);
  const response=await worker.fetch(request(`/api/cloud/projects/${id}/refine`,jwt,payload),env);assert.equal(response.status,200);const saved=await response.json() as {source:typeof before;updated_at:string};assert.equal(saved.source.css,'main{color:green}');
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,jwt,payload),env)).status,409);
  const history=await (await worker.fetch(request(`/api/cloud/projects/${id}/history`,jwt),env)).json() as {versions:{id:string;label:string}[]};assert.equal(history.versions.length,1);assert.match(history.versions[0].label,/Use a green palette/);
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/restore`,await token({sub:'other'}),{versionId:history.versions[0].id,updatedAt:saved.updated_at}),env)).status,404);
  const restored=await worker.fetch(request(`/api/cloud/projects/${id}/restore`,jwt,{versionId:history.versions[0].id,updatedAt:saved.updated_at}),env);assert.equal(restored.status,200);assert.deepEqual((await restored.json() as {source:typeof before}).source,before);assert.equal(calls,1);assert.equal(db.prepare('SELECT count FROM generation_usage').get()?.count,1);
  assert.equal(db.prepare('SELECT count(*) as count FROM project_versions').get()?.count,2);
 }finally{globalThis.fetch=original;db.close();}
});
test('failed AI changes keep the last app intact and release the lease; history is bounded',async()=>{
 const {db,binding}=database();const jwt=await token();await authenticate(request('/',jwt),'test-project',jwksFetch);
 const env={DB:binding,FIREBASE_PROJECT_ID:'test-project',GEMINI_API_KEY:'fixture-key',GEMINI_MODEL:'fixture-model',DAILY_GENERATION_LIMIT:'1'} as Env;
 const id='66666666-6666-4666-8666-666666666666';const source={app:'export default function App(){return <main>Keep this app</main>}',css:''};
 db.prepare("INSERT INTO projects(id,owner_id,intent,status,source,created_at,updated_at) VALUES(?,?,?,'generated',?,?,?)").run(id,'owner-a','Keep my saved app safe',JSON.stringify(source),'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:429});};
 try{
  const change=()=>request(`/api/cloud/projects/${id}/refine`,jwt,{instruction:'Improve mobile layout',updatedAt:db.prepare('SELECT updated_at FROM projects WHERE id=?').get(id)!.updated_at});
  assert.equal((await worker.fetch(change(),env)).status,502);let row=db.prepare('SELECT * FROM projects WHERE id=?').get(id)!;assert.equal(row.status,'generated');assert.deepEqual(JSON.parse(String(row.source)),source);
  assert.equal((await worker.fetch(change(),env)).status,429);row=db.prepare('SELECT * FROM projects WHERE id=?').get(id)!;assert.equal(row.status,'generated');assert.deepEqual(JSON.parse(String(row.source)),source);assert.equal(calls,1);
  for(let i=0;i<12;i++){const latest=String(db.prepare('SELECT updated_at FROM projects WHERE id=?').get(id)!.updated_at);const edited={...source,css:`main{padding:${i}px}`};assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/source`,jwt,{source:edited,updatedAt:latest}),env)).status,200);}
  assert.equal(db.prepare('SELECT count(*) as count FROM project_versions').get()?.count,10);
 }finally{globalThis.fetch=original;db.close();}
});
test('an in-flight AI revision cannot duplicate inference or overwrite a newer lease',async()=>{
 const {db,binding}=database();const jwt=await token();await authenticate(request('/',jwt),'test-project',jwksFetch);
 const env={DB:binding,FIREBASE_PROJECT_ID:'test-project',GEMINI_API_KEY:'fixture-key',GEMINI_MODEL:'fixture-model',DAILY_GENERATION_LIMIT:'10'} as Env;
 const id='77777777-7777-4777-8777-777777777777';const source={app:'export default function App(){return <main>Saved app</main>}',css:''};const now=new Date().toISOString();
 db.prepare("INSERT INTO projects(id,owner_id,intent,status,source,created_at,updated_at) VALUES(?,?,?,'generating',?,?,?)").run(id,'owner-a','Build a saved app',JSON.stringify(source),now,now);
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run('2099-01-01T00:00:00.000Z',id);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...source,css:'main{color:red}'})}]}}]});};
 try{
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,jwt,{instruction:'Change color',updatedAt:now}),env)).status,409);assert.equal(calls,0);
  const stale='2026-01-01T00:00:00.000Z';db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(stale,id);
  assert.equal((await worker.fetch(request(`/api/cloud/projects/${id}/refine`,jwt,{instruction:'Change color',updatedAt:stale}),env)).status,409);assert.equal(calls,1);assert.deepEqual(JSON.parse(String(db.prepare('SELECT source FROM projects WHERE id=?').get(id)!.source)),source);assert.equal(db.prepare('SELECT count(*) as count FROM project_versions').get()?.count,0);
 }finally{globalThis.fetch=original;db.close();}
});

 test('Guide validates conversation, isolates quota, grounds AI and handles failure', async()=>{
 const {guideRequest}=await import('./guide.ts');const {db,binding}=database();
 const env={DB:binding,GEMINI_API_KEY:'fixture',GEMINI_MODEL:'fixture-model',DAILY_GUIDE_LIMIT:'2'} as Env;
 let calls=0;const fetcher:typeof fetch=async(_url,init)=>{calls++;const payload=JSON.parse(String(init?.body));assert.match(payload.systemInstruction.parts[0].text,/production deployment are not available/);assert.match(payload.contents[0].parts[0].text,/booking/);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'Start with a booking calendar.',draft:'Build a responsive booking calendar with local state.'})}]}}]});};
 const raw=JSON.stringify({messages:[{role:'user',text:'Help me plan a booking app'}]});
 try{
 assert.equal((await guideRequest(env,'a','{}',fetcher)).status,400);
 assert.equal((await guideRequest(env,'a',JSON.stringify({messages:[{role:'model',text:'bad'}]}),fetcher)).status,400);
 const answer=await guideRequest(env,'a',raw,fetcher);assert.equal(answer.status,200);assert.match((await answer.json() as {draft:string}).draft,/booking calendar/);
 assert.equal((await guideRequest(env,'b',raw,async()=>new Response('',{status:429}))).status,502);
 assert.equal((await guideRequest(env,'a',raw,fetcher)).status,429);assert.equal(calls,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM projects').get()!.n,0);
 assert.equal((await guideRequest({...env,DAILY_GUIDE_LIMIT:undefined},'a',raw,fetcher)).status,503);
 const expanded={...env,DAILY_GUIDE_LIMIT:'50'};
 for(let i=0;i<8;i++)assert.equal((await guideRequest(expanded,'a',raw,fetcher)).status,200);
 assert.equal((await guideRequest(expanded,'a',raw,fetcher)).status,429);assert.equal(calls,9);
 assert.equal((await guideRequest(expanded,'c',raw,async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS'}]}))).status,502);
 }finally{db.close();}
 });
