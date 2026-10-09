import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { AuthSession } from "./auth.ts";
import { transaction } from "./database.ts";
import { renderPreview } from "./outputs.ts";
import { HttpError } from "./http.ts";
import { validatePreviewOrigin } from "./config.ts";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export function issuePreviewAccess(db: DatabaseSync, session: AuthSession, id: string, origin: string, appOrigin: string, origins: string[]) {
  validatePreviewOrigin(origin, origins, process.env.NODE_ENV === "production");
  return transaction(db, () => {
    renderPreview(db, session.user.id, id);
    const now = Date.now();
    db.prepare("DELETE FROM preview_grants WHERE expires_at<=? OR (session_hash=? AND run_id=?)").run(now, session.tokenHash, id);
    const count = db.prepare("SELECT COUNT(*) AS count FROM preview_grants WHERE session_hash=?").get(session.tokenHash) as { count: number };
    if (count.count >= 10) throw new HttpError(429, "Too many pending previews. Wait a minute and retry.");
    const token = randomBytes(32).toString("hex");
    const expiresAt = now + 60000;
    db.prepare("INSERT INTO preview_grants VALUES(?,?,?,?,?,?)").run(hash(token), id, session.tokenHash, session.user.id, appOrigin, expiresAt);
    return { url: `${origin}/view/${token}`, expiresAt: new Date(expiresAt).toISOString() };
  });
}
export function consumePreviewAccess(db: DatabaseSync, token: string) {
  return transaction(db, () => {
    const grant = db.prepare("SELECT g.run_id,g.user_id,g.app_origin FROM preview_grants g JOIN sessions s ON s.token_hash=g.session_hash WHERE g.token_hash=? AND g.expires_at>? AND s.expires_at>? AND s.user_id=g.user_id").get(hash(token), Date.now(), Date.now()) as { run_id: string; user_id: string; app_origin: string } | undefined;
    if (!grant) throw new HttpError(404, "Preview access expired or was already used. Open a new preview from your workspace.");
    const html = renderPreview(db, grant.user_id, grant.run_id, grant.app_origin);
    db.prepare("DELETE FROM preview_grants WHERE token_hash=?").run(hash(token));
    return html;
  });
}
