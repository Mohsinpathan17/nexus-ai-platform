import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import type { User } from "../shared/contracts.ts";
import { transaction } from "./database.ts";
import { HttpError, textField } from "./http.ts";
export interface AuthSession {
  user: User;
  csrf: string;
  tokenHash: string;
}
const cookieName = "nexyral_session";
const lifetime = 7 * 24 * 60 * 60 * 1000;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const passwordHash = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export function sessionFor(
  db: DatabaseSync,
  request: IncomingMessage,
): AuthSession | null {
  const token = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db
    .prepare(
      "SELECT u.id,u.name,u.email,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .get(digest(token), Date.now()) as
    | {
        id: string;
        name: string;
        email: string;
        csrf: string;
        token_hash: string;
      }
    | undefined;
  return row
    ? {
        user: { id: row.id, name: row.name, email: row.email },
        csrf: row.csrf,
        tokenHash: row.token_hash,
      }
    : null;
}
export function requireSession(db: DatabaseSync, request: IncomingMessage) {
  const session = sessionFor(db, request);
  if (!session) throw new HttpError(401, "Sign in to continue.");
  return session;
}
export function requireCsrf(request: IncomingMessage, session: AuthSession) {
  const token = request.headers["x-csrf-token"];
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    token.length !== session.csrf.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf))
  )
    throw new HttpError(
      403,
      "Session protection failed. Refresh and try again.",
    );
}
export function clearCookie(response: ServerResponse, secure: boolean) {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`,
  );
}
export function establish(
  db: DatabaseSync,
  response: ServerResponse,
  user: User,
  secure: boolean,
  previous: AuthSession | null,
) {
  if (previous)
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      previous.tokenHash,
    );
  db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(
    digest(token),
    user.id,
    csrf,
    Date.now() + lifetime,
  );
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${lifetime / 1000}${secure ? "; Secure" : ""}`,
  );
  return { user, csrfToken: csrf };
}
export async function authenticate(
  db: DatabaseSync,
  request: IncomingMessage,
  response: ServerResponse,
  body: Record<string, unknown>,
  signup: boolean,
  secure: boolean,
) {
  const email = textField(body, "email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Enter a valid email address.");
  const password = textField(body, "password", signup ? 12 : 1, 128, false);
  const previous = sessionFor(db, request);
  if (signup) {
    const name = textField(body, "name", 2, 80);
    const salt = randomBytes(16).toString("hex");
    const hash = await passwordHash(password, salt);
    const user = { id: randomUUID(), name, email };
    return transaction(db, () => {
      try {
        db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)").run(
          user.id,
          name,
          email,
          hash.toString("hex"),
          salt,
          new Date().toISOString(),
        );
      } catch (error) {
        if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
          throw new HttpError(409, "An account already exists for this email.");
        throw error;
      }
      return establish(db, response, user, secure, previous);
    });
  }
  const row = db.prepare("SELECT * FROM users WHERE email=?").get(email) as
    | {
        id: string;
        name: string;
        email: string;
        password_hash: string;
        salt: string;
      }
    | undefined;
  const hash = await passwordHash(
    password,
    row?.salt ?? "nexyral-unknown-user",
  );
  const expected = row
    ? Buffer.from(row.password_hash, "hex")
    : Buffer.alloc(64);
  if (!timingSafeEqual(hash, expected) || !row)
    throw new HttpError(401, "Email or password is incorrect.");
  return transaction(db, () =>
    establish(
      db,
      response,
      { id: row.id, name: row.name, email: row.email },
      secure,
      previous,
    ),
  );
}
export function createRateLimiter(options: { max?: number; windowMs?: number; message?: string } = {}) {
  const attempts = new Map<string, { count: number; expires: number }>();
  return (address: string) => {
    const now = Date.now();
    for (const [key, value] of attempts)
      if (value.expires < now) attempts.delete(key);
    if (attempts.size >= 10000 && !attempts.has(address))
      throw new HttpError(429, "Too many requests. Try again later.");
    const value = attempts.get(address) ?? {
      count: 0,
      expires: now + (options.windowMs ?? 15 * 60 * 1000),
    };
    value.count++;
    attempts.set(address, value);
    if (value.count > (options.max ?? 20))
      throw new HttpError(429, options.message ?? "Too many sign-in attempts. Try again later.");
  };
}
