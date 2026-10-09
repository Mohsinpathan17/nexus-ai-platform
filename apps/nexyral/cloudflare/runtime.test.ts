import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Miniflare } from 'miniflare';

function moduleSource(name: string) {
  return { type: 'esm' as const, contents: ts.transpileModule(readFileSync(new URL(name, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText };
}
test('actual Worker runtime supports provider/JWKS requests, verifies signatures and rejects redirects', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'runtime-test-key' };
  const now = Math.floor(Date.now() / 1000);
  const encode = (text: string) => Buffer.from(text).toString('base64url');
  const unsigned = `${encode(JSON.stringify({ alg: 'RS256', kid: jwk.kid }))}.${encode(JSON.stringify({ sub: 'runtime-owner', aud: 'runtime-project', iss: 'https://securetoken.google.com/runtime-project', iat: now, exp: now + 3600 }))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(unsigned));
  const token = `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
  const contents = `
    import { authenticate } from './auth.ts';
    import { generate } from './gemini.ts';
    let simulateRedirect = false;
    let constructions = 0;
    globalThis.fetch = async (input, init) => {
      // Construct in workerd, not Node: workerd rejects redirect='error'.
      const request = new Request(input, init);
      if (request.redirect !== 'manual') throw new Error('Credentials must not follow redirects');
      constructions++;
      if (simulateRedirect) return new Response('', {status:302, headers:{Location:'https://untrusted.example'}});
      if (request.url.startsWith('https://www.googleapis.com/')) return Response.json({keys:[${JSON.stringify(jwk)}]});
      if (request.headers.get('x-goog-api-key') !== 'fixture-key') throw new Error('Missing provider authentication');
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({app:'export default function App() { return <main>Runtime fixture</main>; }',css:''})}]}}]});
    };
    export default { async fetch(request) {
      simulateRedirect = new URL(request.url).pathname === '/redirect';
      try {
        if (simulateRedirect) {await generate('fixture', 'fixture-key', 'test-model');return Response.json({rejected:false});}
        const user = await authenticate(request, 'runtime-project');
        const source = await generate('fixture', 'fixture-key', 'test-model');
        return Response.json({owner:user.sub,sourceValid:source.app.includes('export default'),constructions});
      } catch {return Response.json({rejected:true},{status:502});}
    }};
  `;
  const runtime = new Miniflare({ workers: [{ config: {
    name: 'provider-runtime-regression', compatibilityDate: '2026-10-09',
    manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents }, 'auth.ts': moduleSource('./auth.ts'), 'gemini.ts': moduleSource('./gemini.ts') } },
  } }] });
  try {
    const response = await runtime.dispatchFetch('https://runtime.example/check', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { owner: 'runtime-owner', sourceValid: true, constructions: 2 });
    const redirect = await runtime.dispatchFetch('https://runtime.example/redirect');
    assert.equal(redirect.status, 502);
    assert.deepEqual(await redirect.json(), { rejected: true });
  } finally { await runtime.dispose(); }
});
