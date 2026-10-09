import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { exportSource, outputsFor } from "./outputs.ts";
import { issuePreviewAccess } from "./preview-access.ts";
import { validatePreviewOrigin } from "./config.ts";
import { proxyAddresses, rateLimitAddress } from "./proxy-address.ts";
import { resetPassword } from "./password-recovery.ts";
import { createGitHubAuth, type GitHubOptions, type githubIdentity } from "./github-auth.ts";
import { configuredMail, emailVerified, sendRecovery, sendVerification, verifyEmail, type AccountMail } from "./account-mail.ts";
import { renameProject } from "./projects.ts";
import { requirementsFor, saveRequirements } from "./project-requirements.ts";
import { executorState } from "./worker.ts";
import {
  authenticate,
  clearCookie,
  createRateLimiter,
  requireCsrf,
  requireSession,
  sessionFor,
} from "./auth.ts";
import { HttpError, json, readBody, textField } from "./http.ts";
import {
  approvePlan,
  reviewPlan,
  artifactsFor,
  cancelRun,
  createProject,
  createRun,
  eventsFor,
  ownedRun,
  ownedProject,
  projectsFor,
  runsFor,
} from "./runs.ts";
interface AppOptions {
  db: DatabaseSync;
  origins: string[];
  staticDir?: string;
  previewOrigin?: string;
  trustedProxies?: string[];
  github?: GitHubOptions;
  githubExchange?: typeof githubIdentity;
  mail?: AccountMail;
}
export function createApp({ db, origins, staticDir, previewOrigin, trustedProxies = [], github, githubExchange, mail: suppliedMail }: AppOptions) {
  const mail = suppliedMail ?? configuredMail(origins[0]);
  if (github && !origins.includes(github.appOrigin)) throw new Error("GitHub origin must be an allowed app origin.");
  const githubAuth = github ? createGitHubAuth(db, github, githubExchange) : undefined;
  if (previewOrigin) validatePreviewOrigin(previewOrigin, origins);
  const proxySet = proxyAddresses(trustedProxies);
  const limit = createRateLimiter();
  const recoveryLimit = createRateLimiter({ max: 5, message: "Too many recovery attempts. Try again later." });
  const mailLimit = createRateLimiter({ max: 5, message: "Too many email requests. Try again later." });
  const recipientLimit = createRateLimiter({ max: 3, message: "Try requesting this email later." });
  const previewLimit = createRateLimiter({ max: 30, windowMs: 60000, message: "Too many preview requests. Wait a minute and retry." });
  const secure = origins.every((origin) => origin.startsWith("https://"));
  async function handle(request: IncomingMessage, response: ServerResponse) {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const method = request.method ?? "GET";
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' ${previewOrigin ?? ""}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    );
    if (path.startsWith("/api/")) {
      response.setHeader("Cache-Control", "no-store");
      if (method !== "GET" && method !== "HEAD") {
        if (!origins.includes(request.headers.origin ?? ""))
          throw new HttpError(403, "Request origin is not allowed.");
      }
      if (method === "GET" && path === "/api/health")
        return json(response, 200, {
          status: "ok",
          executor: executorState(db),
        });
      if (method === "GET" && path === "/api/auth/session") {
        const session = sessionFor(db, request);
        return json(response, 200, {
          user: session?.user ?? null,
          csrfToken: session?.csrf ?? null,
          emailVerified: session ? emailVerified(db, session.user.id) : false,
          githubConnected: session ? Boolean(db.prepare("SELECT github_id FROM github_identities WHERE user_id=?").get(session.user.id)) : false,
        });
      }
      if (method === "GET" && path === "/api/auth/providers") return json(response, 200, { github: Boolean(githubAuth), email: Boolean(mail), supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.NEXYRAL_SUPPORT_EMAIL ?? "") ? process.env.NEXYRAL_SUPPORT_EMAIL : null });
      if (method === "GET" && path === "/api/auth/github/start") {
        if (!githubAuth) throw new HttpError(503, "GitHub sign-in is not configured.");
        limit(rateLimitAddress(request.socket.remoteAddress, request.headers["x-forwarded-for"], proxySet));
        response.writeHead(303, { Location: githubAuth.begin(request, response) }); return response.end();
      }
      if (method === "GET" && path === "/api/auth/github/callback") {
        if (!githubAuth) throw new HttpError(503, "GitHub sign-in is not configured.");
        try { return await githubAuth.complete(request, response, new URL(request.url!, "http://localhost").searchParams); }
        catch (error) { response.setHeader("Referrer-Policy", "no-referrer"); response.writeHead(303, { Location: `${github!.appOrigin}/login?github=${error instanceof HttpError && error.status === 409 ? "link-required" : "failed"}` }); return response.end(); }
      }
      if (method === "POST" && path === "/api/auth/request-recovery") {
        if (!mail) throw new HttpError(503, "Recovery email delivery is not configured. Contact your instance operator.");
        mailLimit(rateLimitAddress(request.socket.remoteAddress, request.headers["x-forwarded-for"], proxySet));
        const email = textField(await readBody(request), "email", 3, 254).toLowerCase();
        try { recipientLimit(email); await sendRecovery(db, mail, email); } catch { /* Identical response for known/unknown/throttled recipients. */ }
        return json(response, 202, { ok: true, message: "If the account exists and delivery is available, a recovery email will arrive shortly." });
      }
      if (method === "POST" && path === "/api/auth/verify-email") {
        mailLimit(rateLimitAddress(request.socket.remoteAddress, request.headers["x-forwarded-for"], proxySet));
        return json(response, 200, verifyEmail(db, textField(await readBody(request), "token", 64, 64)));
      }
      if (
        method === "POST" &&
        (path === "/api/auth/signup" || path === "/api/auth/login")
      ) {
        limit(rateLimitAddress(request.socket.remoteAddress, request.headers["x-forwarded-for"], proxySet));
        const body = await readBody(request);
        const result = await authenticate(db, request, response, body, path.endsWith("signup"), secure);
        let emailDelivery: "sent" | "failed" | "not_configured" | undefined;
        if (path.endsWith("signup")) {
          emailDelivery = mail ? "sent" : "not_configured";
          if (mail) try { await sendVerification(db, mail, result.user.id); } catch { emailDelivery = "failed"; }
        }
        return json(
          response,
          path.endsWith("signup") ? 201 : 200,
          { ...result, emailVerified: emailVerified(db, result.user.id), ...(emailDelivery ? { emailDelivery } : {}) },
        );
      }
      if (method === "POST" && path === "/api/auth/recovery") {
        recoveryLimit(rateLimitAddress(request.socket.remoteAddress, request.headers["x-forwarded-for"], proxySet));
        const result = await resetPassword(db, await readBody(request));
        clearCookie(response, secure);
        return json(response, 200, result);
      }
      const session = requireSession(db, request);
      if (method !== "GET" && method !== "HEAD") requireCsrf(request, session);
      if (method === "POST" && path === "/api/auth/github/connect") {
        if (!githubAuth) throw new HttpError(503, "GitHub sign-in is not configured.");
        limit(session.user.id); return json(response, 200, { url: githubAuth.begin(request, response, true) });
      }
      if (method === "POST" && path === "/api/auth/send-verification") {
        if (!mail) throw new HttpError(503, "Verification email delivery is not configured.");
        mailLimit(session.user.id); await sendVerification(db, mail, session.user.id); return json(response, 200, { ok: true });
      }
      if (method === "POST" && path === "/api/auth/logout") {
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          session.tokenHash,
        );
        clearCookie(response, secure);
        return json(response, 200, { ok: true });
      }
      if (path === "/api/projects" && method === "GET")
        return json(response, 200, {
          projects: projectsFor(db, session.user.id),
        });
      if (mail && method !== "GET" && method !== "HEAD" && !emailVerified(db, session.user.id)) throw new HttpError(403, "Verify your email from your workspace before creating or modifying project data.");
      if (path === "/api/projects" && method === "POST")
        return json(response, 201, {
          project: createProject(
            db,
            session.user.id,
            textField(await readBody(request), "name", 2, 100),
          ),
        });
      const requirementsMatch = path.match(/^\/api\/projects\/([a-f0-9-]+)\/requirements$/);
      if (requirementsMatch && method === "GET") return json(response, 200, { requirements: requirementsFor(db, session.user.id, requirementsMatch[1]) });
      if (requirementsMatch && method === "PATCH") {
        const body = await readBody(request, 32768);
        return json(response, 200, { requirements: saveRequirements(db, session.user.id, requirementsMatch[1], textField(body, "text", 0, 6000), body.expectedRevision) });
      }
      const projectDetail = path.match(/^\/api\/projects\/([a-f0-9-]+)$/);
      if (projectDetail && method === "GET") return json(response, 200, { project: ownedProject(db, session.user.id, projectDetail[1]) });
      if (projectDetail && method === "PATCH") {
        const body = await readBody(request);
        return json(response, 200, { project: renameProject(db, session.user.id, projectDetail[1], textField(body, "name", 2, 100), textField(body, "expectedName", 2, 100)) });
      }
      const projectMatch = path.match(/^\/api\/projects\/([a-f0-9-]+)\/runs$/);
      if (projectMatch && method === "GET")
        return json(response, 200, {
          runs: runsFor(db, session.user.id, projectMatch[1]),
        });
      if (projectMatch && method === "POST")
        return json(response, 201, {
          run: createRun(
            db,
            session.user.id,
            projectMatch[1],
            textField(await readBody(request), "intent", 10, 4000),
          ),
        });
      const runMatch = path.match(
        /^\/api\/runs\/([a-f0-9-]+)(\/cancel|\/events|\/approve|\/revise|\/reject|\/retry|\/source|\/preview|\/preview-access)?$/,
      );
      if (runMatch) {
        const id = runMatch[1];
        if (method === "POST" && runMatch[2] === "/retry") {
          const source = ownedRun(db, session.user.id, id);
          const body = await readBody(request);
          const requestId = textField(body, "requestId", 36, 36);
          if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId)) throw new HttpError(400, "Provide a valid retry request ID.");
          const result = createRun(db, session.user.id, source.projectId, textField(body, "intent", 10, 4000), { sourceId: id, requestId });
          return json(response, result.created ? 201 : 200, result);
        }
        const run = ownedRun(db, session.user.id, id);
        if (method === "GET" && runMatch[2] === "/source") {
          const archive = exportSource(db, session.user.id, id);
          response.writeHead(200, { "Content-Type": "application/x-tar", "Content-Disposition": `attachment; filename="nexyral-${id}.tar"`, "Cache-Control": "no-store", "Content-Length": archive.length });
          response.end(archive); return;
        }
        if (method === "POST" && runMatch[2] === "/preview-access") {
          await readBody(request);
          previewLimit(session.user.id);
          if (!previewOrigin) throw new HttpError(503, "A separate preview origin must be configured.");
          return json(response, 201, issuePreviewAccess(db, session, id, previewOrigin, request.headers.origin!, origins));
        }
        if (["GET", "HEAD"].includes(method) && runMatch[2] === "/preview") throw new HttpError(410, "Previews are served only through separate-origin access grants.");
        if (method === "POST" && runMatch[2] === "/approve")
          return json(response, 200, { run: approvePlan(db, session.user.id, id, textField(await readBody(request), "artifactId", 1, 100)) });
        if (method === "POST" && ["/revise", "/reject"].includes(runMatch[2])) {
          const body = await readBody(request, runMatch[2] === "/revise" ? 65536 : 16384);
          if (runMatch[2] === "/revise" && body.plan === undefined) throw new HttpError(400, "A revised plan is required.");
          return json(response, 200, { run: reviewPlan(db, session.user.id, id, textField(body, "artifactId", 1, 100), textField(body, "reason", 2, 1000), runMatch[2] === "/revise" ? body.plan : undefined) });
        }
        if (method === "POST" && runMatch[2] === "/cancel")
          return json(response, 200, {
            run: cancelRun(db, session.user.id, id),
          });
        if (method === "GET" && runMatch[2] === "/events") {
          response.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
          const lastHeader = request.headers["last-event-id"];
          let last =
            typeof lastHeader === "string" && /^\d+$/.test(lastHeader)
              ? Number(lastHeader)
              : 0;
          let closed = false;
          let timer: ReturnType<typeof setInterval>;
          const send = () => {
            if (closed) return;
            if (!sessionFor(db, request)) {
              response.write("event: session.expired\ndata: {}\n\n");
              response.end();
              return;
            }
            for (const event of eventsFor(db, id, last)) {
              response.write(
                `id: ${event.id}\nevent: run.event\ndata: ${JSON.stringify(event)}\n\n`,
              );
              last = event.id;
            }
            response.write(": heartbeat\n\n");
          };
          send();
          timer = setInterval(send, 1000);
          response.on("close", () => {
            closed = true;
            clearInterval(timer);
          });
          return;
        }
        if (method === "GET" && !runMatch[2])
          return json(response, 200, {
            run,
            events: eventsFor(db, id),
            artifacts: artifactsFor(db, id).filter((artifact) => artifact.kind !== "preview"),
            outputs: outputsFor(db, session.user.id, id),
            executor: executorState(db),
          });
      }
      throw new HttpError(404, "API endpoint not found.");
    }
    if (method === "GET" && staticDir) {
      const root = resolve(staticDir);
      let file = resolve(root, `.${decodeURIComponent(path)}`);
      if (!file.startsWith(root + sep) && file !== root)
        throw new HttpError(404, "Not found.");
      try {
        if (!(await stat(file)).isFile()) throw new Error();
      } catch {
        if (extname(path)) throw new HttpError(404, "Not found.");
        file = resolve(root, "index.html");
      }
      const types: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      response.writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": file.endsWith("index.html")
          ? "no-cache"
          : "public, max-age=3600",
      });
      response.end(await readFile(file));
      return;
    }
    throw new HttpError(404, "Not found.");
  }
  return createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.headersSent) {
        response.end();
        return;
      }
      json(response, error instanceof HttpError ? error.status : 500, {
        error:
          error instanceof HttpError
            ? error.message
            : "An unexpected server error occurred.",
      });
    });
  });
}
