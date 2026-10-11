import { publicExamples, type ExampleSource } from '../shared/public-examples.ts';
import type { Env } from './worker.ts';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function validateExample(value: unknown): ExampleSource {
  if (!value || typeof value !== 'object') throw new Error('Invalid AI output');
  const source = value as Record<string, unknown>;
  for (const key of ['html','css','js']) {
    if (typeof source[key] !== 'string' || (source[key] as string).length > 40000) throw new Error('Invalid AI output');
  }
  if ((source.html as string).length < 40 || /<(script|iframe|object|embed|base|meta|link)\b|\son\w+\s*=/i.test(source.html as string)) throw new Error('Unsupported markup');
  if (/\b(fetch|XMLHttpRequest|WebSocket|eval|import|localStorage|sessionStorage)\b|\b(window\.)?(parent|top)\s*[.[]|document\.cookie|window\.open/i.test(source.js as string)) throw new Error('Unsupported script');
  return { html: source.html as string, css: source.css as string, js: source.js as string };
}
export async function generateExample(brief: string, env: Env): Promise<ExampleSource> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(90000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Generate a working frontend artifact for an isolated iframe. Return JSON html (body markup only), css, js (plain JavaScript, no TypeScript). No imports, dependencies, external assets, network requests, storage APIs, navigation, inline event attributes, scripts in html, iframe, or access to parent/top. Attach events in js using document.querySelector. All described controls must work. Use warm off-white surfaces, graphite text, blue accent, readable 16px body and 24px headings, responsive CSS, no fixed minimum widths. Do not claim tests ran or backend functionality. Use only in-memory state. Return complete code, never markdown.' }] },
      contents: [{ role: 'user', parts: [{ text: brief }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 16000, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', required: ['html','css','js'], properties: { html: { type: 'STRING' }, css: { type: 'STRING' }, js: { type: 'STRING' } } } },
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const text = await response.text();
  if (text.length > 200000) throw new Error('AI output too large');
  const data = JSON.parse(text) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') throw new Error(`AI output incomplete (${candidate?.finishReason ?? 'no-candidate'})`);
  return validateExample(JSON.parse(candidate.content?.parts?.map(part => part.text ?? '').join('') ?? ''));
}
interface Row { status: string; source: string | null; model: string | null; generated_at: string | null }
export async function publicExampleRequest(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).pathname.split('/').pop();
  const example = publicExamples.find(item => item.id === id);
  if (!example) return reply({ error: 'Example not found' },404);
  if (!['GET','POST'].includes(request.method)) return reply({ error: 'Method not allowed' },405);
  const read = () => env.DB.prepare('SELECT status,source,model,generated_at FROM public_examples WHERE id=?').bind(id).first<Row>();
  const result = (row: Row) => reply({ id, source: JSON.parse(row.source!), model: row.model, generatedAt: row.generated_at, cached: true });
  const existing = await read();
  if (existing?.source) return result(existing);
  if (request.method === 'GET') return reply({ status: existing?.status ?? 'not-built' });
  if (!env.GEMINI_API_KEY || !/^[a-z0-9.-]{1,100}$/.test(env.GEMINI_MODEL)) return reply({ error: 'AI generation is not configured.' },503);
  const limit = Number(env.DAILY_GENERATION_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return reply({ error: 'Generation budget is not configured.' },503);
  const now = Date.now();
  const lease = await env.DB.prepare("INSERT INTO public_examples(id,status,updated_at) VALUES(?,'generating',?) ON CONFLICT(id) DO UPDATE SET status='generating',updated_at=excluded.updated_at,attempts=attempts+1 WHERE source IS NULL AND attempts<3 AND (status='failed' OR updated_at<?) RETURNING id").bind(id,now,now-120000).first();
  if (!lease) {
    const row = await read();
    if (row?.source) return result(row);
    return reply({ error: row?.status === 'generating' ? 'Another visitor is building this example. Try again shortly.' : 'This example needs attention before it can be rebuilt.' },409);
  }
  try {
    const usage = await env.DB.prepare('INSERT INTO generation_usage(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(new Date().toISOString().slice(0,10),limit).first();
    if (!usage) {
      await env.DB.prepare("UPDATE public_examples SET status='failed',attempts=attempts-1 WHERE id=? AND updated_at=?").bind(id,now).run();
      return reply({ error: 'Today’s shared AI budget is used. Saved examples remain available; new builds resume tomorrow.' },429);
    }
    const source = await generateExample(example.brief,env);
    const generatedAt = new Date().toISOString();
    const saved = await env.DB.prepare("UPDATE public_examples SET status='generated',source=?,model=?,generated_at=? WHERE id=? AND updated_at=? RETURNING id").bind(JSON.stringify(source),env.GEMINI_MODEL,generatedAt,id,now).first();
    if (!saved) return reply({ error: 'The build lease expired. Reload this example.' },409);
    return reply({ id, source, model: env.GEMINI_MODEL, generatedAt, cached: false });
  } catch (error) {
    await env.DB.prepare("UPDATE public_examples SET status='failed' WHERE id=? AND updated_at=?").bind(id,now).run();
    const message = error instanceof Error && /^(AI provider returned \d{3}|AI output incomplete \([A-Z_-]+\)|Unsupported markup|Unsupported script|Invalid AI output)$/.test(error.message) ? error.message : 'AI could not produce a complete preview.';
    return reply({ error: `${message} No example was substituted.` },502);
  }
}
