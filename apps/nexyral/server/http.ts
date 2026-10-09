import type { IncomingMessage, ServerResponse } from "node:http";
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function json(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}
export async function readBody(
  request: IncomingMessage,
  maxBytes = 16384,
): Promise<Record<string, unknown>> {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new HttpError(415, "Use application/json.");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBytes) throw new HttpError(413, "Request is too large.");
    chunks.push(bytes);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export function textField(
  body: Record<string, unknown>,
  name: string,
  min: number,
  max: number,
  trim = true,
) {
  const raw = body[name];
  if (typeof raw !== "string") throw new HttpError(400, `${name} is required.`);
  const value = trim ? raw.trim() : raw;
  if (value.length < min || value.length > max)
    throw new HttpError(400, `${name} must contain ${min}–${max} characters.`);
  return value;
}
