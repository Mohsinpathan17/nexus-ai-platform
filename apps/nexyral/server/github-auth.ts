import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { establish, passwordHash, sessionFor } from "./auth.ts";
import { transaction } from "./database.ts";
import { HttpError } from "./http.ts";
import type { User } from "../shared/contracts.ts";
export interface GitHubOptions { clientId: string; clientSecret: string; appOrigin: string }
export interface GitHubIdentity { id: string; name: string; email: string }
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const cookie = "nexyral_oauth";
export async function githubIdentity(options: GitHubOptions, code: string, verifier: string): Promise<GitHubIdentity> {
  async function read(url: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Provider request failed");
    const reader = response.body?.getReader(); if (!reader) throw new Error("Missing provider response");
    const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 256000) throw new Error("Provider response too large"); chunks.push(next.value); } }
    finally { await reader.cancel(); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  const token = await read("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: options.clientId, client_secret: options.clientSecret, code, code_verifier: verifier, redirect_uri: `${options.appOrigin}/api/auth/github/callback` }) });
  if (!token || typeof token !== "object" || !("access_token" in token) || typeof token.access_token !== "string") throw new Error("No provider token");
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "NEXYRAL", "X-GitHub-Api-Version": "2022-11-28" };
  const user = await read("https://api.github.com/user", { headers });
  const emails = await read("https://api.github.com/user/emails", { headers });
  if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0 || !Array.isArray(emails)) throw new Error("Invalid provider identity");
  const email = (emails as unknown[]).find((item): item is { email: string; primary: true; verified: true } => !!item && typeof item === "object" && "primary" in item && item.primary === true && "verified" in item && item.verified === true && "email" in item && typeof item.email === "string");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.email) || email.email.length > 254) throw new Error("Verified primary email required");
  const name = "name" in user && typeof user.name === "string" && user.name.trim() ? user.name : "login" in user && typeof user.login === "string" ? user.login : "GitHub user";
  return { id: String(user.id), name: name.slice(0, 80), email: email.email.toLowerCase() };
}
export function createGitHubAuth(db: DatabaseSync, options: GitHubOptions, exchange = githubIdentity) {
  const origin = new URL(options.appOrigin);
  if (origin.origin !== options.appOrigin || (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("GitHub app origin must be canonical HTTPS (or local development).");
  const secure = origin.protocol === "https:";
  const pending = new Map<string, { nonce: string; verifier: string; expires: number; owner?: string; sessionHash?: string }>();
  function begin(request: IncomingMessage, response: ServerResponse, connect = false) {
    for (const [id, value] of pending) if (value.expires < Date.now()) pending.delete(id);
    if (pending.size >= 1000) throw new HttpError(429, "Try GitHub again later.");
    const session = sessionFor(db, request);
    if (connect && !session) throw new HttpError(401, "Sign in before connecting GitHub.");
    const state = randomBytes(32).toString("hex"), nonce = randomBytes(32).toString("hex"), verifier = randomBytes(32).toString("base64url");
    pending.set(hash(state), { nonce: hash(nonce), verifier, expires: Date.now() + 600000, ...(connect && session ? { owner: session.user.id, sessionHash: session.tokenHash } : {}) });
    response.setHeader("Set-Cookie", `${cookie}=${nonce}; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=600${secure ? "; Secure" : ""}`);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({ client_id: options.clientId, redirect_uri: `${options.appOrigin}/api/auth/github/callback`, scope: "read:user user:email", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    return url.href;
  }
  async function complete(request: IncomingMessage, response: ServerResponse, params: URLSearchParams) {
    response.setHeader("Referrer-Policy", "no-referrer");
    const state = params.get("state") ?? "", code = params.get("code") ?? "";
    const key = hash(state), grant = pending.get(key);
    pending.delete(key);
    const nonce = request.headers.cookie?.split(";").map(item => item.trim()).find(item => item.startsWith(`${cookie}=`))?.slice(cookie.length + 1) ?? "";
    const previous = sessionFor(db, request);
    const clear = `${cookie}=; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=0${secure ? "; Secure" : ""}`;
    response.setHeader("Set-Cookie", clear);
    if (!grant || grant.expires < Date.now() || hash(nonce) !== grant.nonce || !code || code.length > 512 || (grant.owner && (!previous || previous.tokenHash !== grant.sessionHash))) throw new HttpError(400, "GitHub sign-in expired or failed. Start again.");
    let identity: GitHubIdentity;
    try { identity = await exchange(options, code, grant.verifier); } catch { throw new HttpError(502, "GitHub could not verify your account. A verified primary email is required; try again."); }
    const salt = randomBytes(16).toString("hex");
    const password = await passwordHash(randomBytes(64).toString("hex"), salt);
    const user = transaction(db, () => {
      const linked = db.prepare("SELECT u.id,u.name,u.email FROM github_identities g JOIN users u ON u.id=g.user_id WHERE g.github_id=?").get(identity.id) as unknown as User | undefined;
      if (grant.owner) {
        const current = sessionFor(db, request);
        if (!current || current.tokenHash !== grant.sessionHash) throw new HttpError(401, "Your session changed. Sign in and connect GitHub again.");
        if (previous!.user.email !== identity.email || (linked && linked.id !== grant.owner)) throw new HttpError(409, "GitHub must use the same verified email as your signed-in account.");
        const other = db.prepare("SELECT github_id FROM github_identities WHERE user_id=?").get(grant.owner) as { github_id: string } | undefined;
        if (other && other.github_id !== identity.id) throw new HttpError(409, "A different GitHub identity is already connected.");
        db.prepare("INSERT OR IGNORE INTO github_identities VALUES(?,?)").run(identity.id, grant.owner);
        db.prepare("INSERT OR IGNORE INTO verified_emails VALUES(?,?)").run(grant.owner, new Date().toISOString());
        db.prepare("DELETE FROM email_verification_grants WHERE user_id=?").run(grant.owner);
        return previous!.user;
      }
      if (linked) return linked;
      if (db.prepare("SELECT id FROM users WHERE email=?").get(identity.email)) throw new HttpError(409, "Sign in with your password first, then connect GitHub from your workspace.");
      const user = { id: randomUUID(), name: identity.name, email: identity.email };
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(user.id, user.name, user.email, password.toString("hex"), salt, new Date().toISOString());
      db.prepare("INSERT INTO github_identities VALUES(?,?)").run(identity.id, user.id);
      db.prepare("INSERT INTO verified_emails VALUES(?,?)").run(user.id, new Date().toISOString());
      return user;
    });
    establish(db, response, user, secure, previous);
    const sessionCookie = response.getHeader("Set-Cookie");
    response.setHeader("Set-Cookie", [String(sessionCookie), clear]);
    response.writeHead(303, { Location: `${options.appOrigin}/workspace` }); response.end();
  }
  return { begin, complete };
}
