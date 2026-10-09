import { validatePreviewOrigin } from "./config.ts";

export interface HttpsSmokeResult { name: string; passed: boolean; message: string }
const maxBodyBytes = 256 * 1024;

export function validateSmokeOrigins(appOrigin: string, previewOrigin: string) {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("TLS verification must remain enabled.");
  try {
    const app = new URL(appOrigin);
    if (app.origin !== appOrigin || app.protocol !== "https:" || app.username || app.password)
      throw new Error();
    validatePreviewOrigin(previewOrigin, [appOrigin], true);
  } catch { throw new Error("Provide canonical HTTPS app and preview origins with different hostnames, without credentials or paths."); }
}

async function probe(origin: string, path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(new URL(path, origin), {
      ...init, redirect: "manual", signal: AbortSignal.timeout(8000),
    });
  } catch { throw new Error("HTTPS request failed; check DNS, certificates and network access."); }
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBodyBytes) throw new Error("Response exceeds the smoke-check size limit.");
      chunks.push(chunk.value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    throw new Error("Response could not be read within the time/size limits.");
  } finally { reader.releaseLock(); }
  return { response, body: Buffer.concat(chunks).toString("utf8") };
}

function expect(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function json(response: Response, body: string): Record<string, unknown> {
  expect(response.headers.get("content-type")?.includes("application/json") === true, "Expected a JSON response.");
  let data: unknown;
  try { data = JSON.parse(body); } catch { throw new Error("Invalid JSON response."); }
  expect(typeof data === "object" && data !== null && !Array.isArray(data), "Expected a JSON object.");
  return data as Record<string, unknown>;
}
function privateResponse(response: Response) {
  expect(response.headers.get("cache-control")?.split(/\s*,\s*/).includes("no-store") === true, "Private response must use no-store.");
  expect(response.headers.get("x-content-type-options") === "nosniff", "Missing nosniff protection.");
  expect(!response.headers.has("set-cookie"), "Anonymous probe unexpectedly received a cookie.");
}
function hsts(response: Response) {
  const maxAge = response.headers.get("strict-transport-security")?.match(/(?:^|;)\s*max-age=(\d+)(?:;|$)/i);
  expect(maxAge !== undefined && maxAge !== null && Number(maxAge[1]) >= 86400, "Missing or insufficient HTTPS HSTS policy.");
}

/** Anonymous probes only: no accounts, credentials, grants or worker runs. */
export async function runHttpsSmoke(appOrigin: string, previewOrigin: string): Promise<HttpsSmokeResult[]> {
  validateSmokeOrigins(appOrigin, previewOrigin);
  const checks: { name: string; run: () => Promise<void> }[] = [
    { name: "Application and security headers", run: async () => {
      const { response, body } = await probe(appOrigin, "/");
      expect(response.status === 200 && response.headers.get("content-type")?.includes("text/html") === true && /NEXYRAL/i.test(body), "Expected the NEXYRAL application document.");
      hsts(response);
      expect(response.headers.get("x-content-type-options") === "nosniff", "Missing nosniff protection.");
      const policy = response.headers.get("content-security-policy") ?? "";
      expect(policy.includes("object-src 'none'") && policy.includes("frame-ancestors 'none'") && policy.includes(previewOrigin), "Missing application CSP or configured preview origin.");
    } },
    { name: "Workspace API health", run: async () => {
      const { response, body } = await probe(appOrigin, "/api/health");
      expect(response.status === 200 && json(response, body).status === "ok", "Workspace API is not healthy.");
      privateResponse(response); hsts(response);
    } },
    { name: "Anonymous session", run: async () => {
      const { response, body } = await probe(appOrigin, "/api/auth/session");
      expect(response.status === 200, "Session endpoint unavailable.");
      const data = json(response, body);
      expect(data.user === null && data.csrfToken === null, "Expected an anonymous session.");
      privateResponse(response);
    } },
    { name: "Private project protection", run: async () => {
      const { response, body } = await probe(appOrigin, "/api/projects");
      expect(response.status === 401 && typeof json(response, body).error === "string", "Anonymous project access must be denied.");
      privateResponse(response);
    } },
    { name: "Foreign Origin rejection", run: async () => {
      const { response, body } = await probe(appOrigin, "/api/auth/login", {
        method: "POST", headers: { Origin: "https://untrusted-origin.invalid", "Content-Type": "application/json" }, body: "{}",
      });
      expect(response.status === 403 && typeof json(response, body).error === "string", "Foreign Origin login must be rejected.");
      privateResponse(response);
    } },
    { name: "Separate preview service", run: async () => {
      const { response, body } = await probe(previewOrigin, "/_health");
      expect(response.status === 200, "Preview health endpoint unavailable.");
      const data = json(response, body);
      expect(data.status === "ok" && data.service === "isolated-preview", "Wrong service on preview origin.");
      privateResponse(response); hsts(response);
    } },
    { name: "Preview denies account routes", run: async () => {
      const { response, body } = await probe(previewOrigin, "/api/auth/session");
      expect(response.status === 404 && typeof json(response, body).error === "string", "Preview origin must not serve accounts.");
      privateResponse(response);
    } },
    { name: "Invalid preview grant protection", run: async () => {
      const { response, body } = await probe(previewOrigin, `/view/${"0".repeat(64)}`);
      expect(response.status === 404 && typeof json(response, body).error === "string", "Invalid preview grant must be denied.");
      privateResponse(response);
      expect(response.headers.get("referrer-policy") === "no-referrer", "Preview must suppress referrers.");
      const policy = response.headers.get("content-security-policy") ?? "";
      expect(policy.includes("sandbox") && !policy.includes("allow-same-origin") && policy.includes("default-src 'none'"), "Missing restrictive preview error policy.");
    } },
  ];
  return Promise.all(checks.map(async check => {
    try { await check.run(); return { name: check.name, passed: true, message: "Passed" }; }
    catch (error) { return { name: check.name, passed: false, message: error instanceof Error ? error.message : "Check failed" }; }
  }));
}
