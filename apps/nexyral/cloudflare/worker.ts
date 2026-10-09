import { authenticate } from "./auth.ts";
import { generate } from "./gemini.ts";
import { addressVerified, emailCodeRequest } from './email-codes.ts';
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  DAILY_GENERATION_LIMIT: string;
  RESEND_API_KEY?: string;
  EMAIL_CODE_SECRET?: string;
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
async function readBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12000) {
        await reader.cancel();
        throw new RangeError("Request too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname === "/api/health" && request.method === "GET")
      return json({
        status: "ok",
        mode: "serverless",
        generationConfigured: Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL),
        verificationAvailable: false,
        emailCodeDeliveryConfigured: Boolean(env.RESEND_API_KEY && env.EMAIL_CODE_SECRET),
      });
    if (
      request.method !== "GET" &&
      request.headers.get("Origin") !== url.origin
    )
      return json({ error: "Origin rejected" }, 403);
    let user;
    try {
      user = await authenticate(request, env.FIREBASE_PROJECT_ID);
    } catch {
      return json({ error: "Sign in to continue" }, 401);
    }
    try {
      if (/^\/api\/cloud\/verification\/(status|send|confirm)$/.test(url.pathname)) {
        if (request.method === 'POST' && !request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'JSON required'},415);
        return await emailCodeRequest(request,env,user,request.method==='POST'?await readBody(request):'');
      }
      if (url.pathname === "/api/cloud/projects" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id,intent,status,error,created_at,updated_at FROM projects WHERE owner_id=? ORDER BY created_at DESC LIMIT 50",
        )
          .bind(user.sub)
          .all();
        return json({ projects: result.results });
      }
      if (url.pathname === "/api/cloud/projects" && request.method === "POST") {
        if (
          !request.headers.get("Content-Type")?.startsWith("application/json")
        )
          return json({ error: "JSON required" }, 415);
        let body: { intent?: unknown };
        try {
          body = JSON.parse(await readBody(request)) as { intent?: unknown };
        } catch (error) {
          return json(
            {
              error:
                error instanceof RangeError
                  ? "Request too large"
                  : "Invalid JSON",
            },
            error instanceof RangeError ? 413 : 400,
          );
        }
        if (
          !body ||
          typeof body.intent !== "string" ||
          body.intent.trim().length < 10 ||
          body.intent.length > 8000
        )
          return json(
            { error: "Describe your frontend in 10–8,000 characters" },
            400,
          );
        const id = crypto.randomUUID(),
          now = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO projects(id,owner_id,intent,status,created_at,updated_at) VALUES(?,?,?,'draft',?,?)",
        )
          .bind(id, user.sub, body.intent.trim(), now, now)
          .run();
        return json({ id }, 201);
      }
      const match = url.pathname.match(
        /^\/api\/cloud\/projects\/([a-f0-9-]{36})(\/generate)?$/,
      );
      if (!match) return json({ error: "Not found" }, 404);
      const project = await env.DB.prepare(
        "SELECT * FROM projects WHERE id=? AND owner_id=?",
      )
        .bind(match[1], user.sub)
        .first<{
          id: string;
          intent: string;
          status: string;
          source: string | null;
          updated_at: string;
        }>();
      if (!project) return json({ error: "Not found" }, 404);
      if (!match[2] && request.method === "GET")
        return json({
          ...project,
          source: project.source ? JSON.parse(project.source) : null,
          verification: "not_run",
        });
      if (match[2] && request.method === "POST") {
        if (!(await addressVerified(env,user)))
          return json(
            { error: "Verify your email before generating software" },
            403,
          );
        if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)
          return json({ error: "AI provider is not configured" }, 503);
        const limit = Number(env.DAILY_GENERATION_LIMIT);
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
          return json({ error: "Generation budget is not configured" }, 503);
        // A disconnected request can leave a lease behind; an owner can retry after two minutes.
        const leaseTime = new Date().toISOString();
        const lease = await env.DB.prepare(
          "UPDATE projects SET status='generating',error=NULL,updated_at=? WHERE id=? AND owner_id=? AND (status IN ('draft','failed') OR (status='generating' AND updated_at<?))",
        )
          .bind(
            leaseTime,
            project.id,
            user.sub,
            new Date(Date.now() - 120000).toISOString(),
          )
          .run();
        if (!lease.meta.changes)
          return json(
            { error: "Generation already started or completed" },
            409,
          );
        const day = new Date().toISOString().slice(0, 10);
        const budget = await env.DB.prepare(
          "INSERT INTO generation_usage(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
        )
          .bind(day, limit)
          .first();
        if (!budget) {
          await env.DB.prepare(
            "UPDATE projects SET status='failed',error='Daily generation budget reached',updated_at=? WHERE id=? AND owner_id=? AND status='generating' AND updated_at=?",
          )
            .bind(new Date().toISOString(), project.id, user.sub, leaseTime)
            .run();
          return json(
            { error: "Daily generation budget reached. Try tomorrow." },
            429,
          );
        }
        try {
          const source = await generate(
            project.intent,
            env.GEMINI_API_KEY,
            env.GEMINI_MODEL,
          );
          const completed = await env.DB.prepare(
            "UPDATE projects SET status='generated',source=?,updated_at=? WHERE id=? AND owner_id=? AND status='generating' AND updated_at=?",
          )
            .bind(
              JSON.stringify(source),
              new Date().toISOString(),
              project.id,
              user.sub,
              leaseTime,
            )
            .run();
          if (!completed.meta.changes) return json({ error: "A newer generation attempt replaced this request. Refresh the project." }, 409);
          return json({ source, verification: "not_run" });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Generation failed";
          await env.DB.prepare(
            "UPDATE projects SET status='failed',error=?,updated_at=? WHERE id=? AND owner_id=? AND status='generating' AND updated_at=?",
          )
            .bind(message, new Date().toISOString(), project.id, user.sub, leaseTime)
            .run();
          return json({ error: message }, 502);
        }
      }
      return json({ error: "Method not allowed" }, 405);
    } catch {
      return json({ error: "Request failed" }, 500);
    }
  },
};
