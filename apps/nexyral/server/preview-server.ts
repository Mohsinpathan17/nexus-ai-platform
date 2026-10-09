import { createServer } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { consumePreviewAccess } from "./preview-access.ts";
import { previewPolicy } from "./preview.ts";
import { HttpError, json } from "./http.ts";
import { validatePreviewOrigin } from "./config.ts";
export function createPreviewServer(options: { db: DatabaseSync; origins: string[]; previewOrigin: string }) {
  return createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");
    try {
      validatePreviewOrigin(options.previewOrigin, options.origins);
      if (request.headers.host !== new URL(options.previewOrigin).host) throw new HttpError(404, "Not found.");
      if (request.method === "GET" && request.url === "/_health") return json(response, 200, { status: "ok", service: "isolated-preview" });
      const match = request.url?.match(/^\/view\/([a-f0-9]{64})$/);
      if (request.method !== "GET" || !match) throw new HttpError(404, "Not found.");
      const html = consumePreviewAccess(options.db, match[1]);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": previewPolicy.replace("frame-ancestors 'self'", `frame-ancestors ${options.origins.join(" ")}`), "Cross-Origin-Resource-Policy": "cross-origin", "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" });
      response.end(html);
    } catch (error) {
      json(response, error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : "Preview could not be loaded." });
    }
  });
}
