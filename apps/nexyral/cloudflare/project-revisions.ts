import { authenticate } from './auth.ts';
import { addressVerified } from './email-codes.ts';
import { generate, validateSource, type GeneratedSource } from './gemini.ts';
import type { Env } from './worker.ts';
export interface StoredProject { id: string; intent: string; status: string; source: string | null; updated_at: string }
type Account = Awaited<ReturnType<typeof authenticate>>;
const json = (body: unknown, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const nextTime = (previous: string) => new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();

/** Snapshot and update share a D1 transaction and the same owner/version predicate. */
export async function commitSource(env: Env, owner: string, project: StoredProject, source: GeneratedSource, expected: string, status: string, label: string) {
  const updatedAt = nextTime(expected);
  const results = await env.DB.batch([
    env.DB.prepare('INSERT INTO project_versions(id,project_id,owner_id,source,label,created_at) SELECT ?,id,owner_id,source,?,? FROM projects WHERE id=? AND owner_id=? AND status=? AND updated_at=? AND source IS NOT NULL')
      .bind(crypto.randomUUID(),label.slice(0,160),updatedAt,project.id,owner,status,expected),
    env.DB.prepare("UPDATE projects SET source=?,status='generated',error=NULL,updated_at=? WHERE id=? AND owner_id=? AND status=? AND updated_at=?")
      .bind(JSON.stringify(source),updatedAt,project.id,owner,status,expected),
    env.DB.prepare('DELETE FROM project_versions WHERE project_id=? AND owner_id=? AND id NOT IN (SELECT id FROM project_versions WHERE project_id=? AND owner_id=? ORDER BY created_at DESC,id DESC LIMIT 10)')
      .bind(project.id,owner,project.id,owner),
  ]);
  if (!results[1].meta.changes) return null;
  return {source,updated_at:updatedAt,verification:'not_run'};
}
export async function revisionRequest(request: Request, env: Env, user: Account, project: StoredProject, raw: string) {
  const operation = new URL(request.url).pathname.split('/').at(-1);
  if (operation === 'history' && request.method === 'GET') {
    const versions = await env.DB.prepare('SELECT id,label,created_at FROM project_versions WHERE project_id=? AND owner_id=? ORDER BY created_at DESC,id DESC LIMIT 10').bind(project.id,user.sub).all();
    return json({versions:versions.results});
  }
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'JSON required'},415);
  let body: { instruction?: unknown; updatedAt?: unknown; versionId?: unknown };
  try { body=JSON.parse(raw); if (!body || typeof body !== 'object') throw new Error(); }
  catch { return json({error:'Invalid JSON'},400); }
  if (!project.source) return json({error:'Generate your app before requesting changes'},409);
  if (body.updatedAt !== project.updated_at) return json({error:'A newer version exists. Reopen your saved project before requesting a change.'},409);
  if (operation === 'restore') {
    if (project.status !== 'generated') return json({error:'Wait for the current AI request before restoring a version'},409);
    if (typeof body.versionId !== 'string') return json({error:'Select a saved version'},400);
    const version=await env.DB.prepare('SELECT source FROM project_versions WHERE id=? AND project_id=? AND owner_id=?').bind(body.versionId,project.id,user.sub).first<{source:string}>();
    if (!version) return json({error:'Version not found'},404);
    const saved=await commitSource(env,user.sub,project,validateSource(JSON.parse(version.source)),project.updated_at,'generated','Before restoring a saved version');
    return saved ? json(saved) : json({error:'A newer change replaced this request. Reopen the project.'},409);
  }
  if (operation !== 'refine') return json({error:'Not found'},404);
  if (typeof body.instruction !== 'string' || body.instruction.trim().length < 5 || body.instruction.length > 4000) return json({error:'Describe your change in 5–4,000 characters'},400);
  if (!(await addressVerified(env,user))) return json({error:'Verify your email before requesting AI changes'},403);
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) return json({error:'AI provider is not configured'},503);
  const limit=Number(env.DAILY_GENERATION_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return json({error:'Generation budget is not configured'},503);
  const previous=validateSource(JSON.parse(project.source));
  const leaseTime=nextTime(project.updated_at);
  const lease=await env.DB.prepare("UPDATE projects SET status='generating',error=NULL,updated_at=? WHERE id=? AND owner_id=? AND updated_at=? AND (status='generated' OR (status='generating' AND updated_at<?))")
    .bind(leaseTime,project.id,user.sub,project.updated_at,new Date(Date.now()-120000).toISOString()).run();
  if (!lease.meta.changes) return json({error:'An AI change is already in progress. Wait or reopen the project.'},409);
  async function failed(message: string, status: number) {
    await env.DB.prepare("UPDATE projects SET status='generated',error=?,updated_at=? WHERE id=? AND owner_id=? AND status='generating' AND updated_at=?")
      .bind(message,nextTime(leaseTime),project.id,user.sub,leaseTime).run();
    return json({error:message},status);
  }
  const budget=await env.DB.prepare('INSERT INTO generation_usage(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(new Date().toISOString().slice(0,10),limit).first();
  if (!budget) return failed('Daily generation budget reached. Your previous app is safe; try tomorrow.',429);
  try {
    const source=await generate(`Original app requirements:\n${project.intent}\n\nRequested change:\n${body.instruction.trim()}`,env.GEMINI_API_KEY,env.GEMINI_MODEL,fetch,previous);
    const saved=await commitSource(env,user.sub,project,source,leaseTime,'generating',`Before AI change: ${body.instruction.trim()}`);
    return saved ? json(saved) : json({error:'A newer change replaced this request. Reopen the project.'},409);
  } catch(error) { return failed(error instanceof Error ? error.message : 'AI change failed. Your previous app is safe.',502); }
}
