import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { passwordHash } from "./auth.ts";
import { transaction } from "./database.ts";
import { HttpError, textField } from "./http.ts";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const lifetime = 15 * 60_000;
// Trusted operator entrypoint only: no unauthenticated token-issuance endpoint.
export function issueRecovery(db: DatabaseSync, email: string, now = Date.now()) {
  const user = db.prepare("SELECT id FROM users WHERE email=?").get(email.trim().toLowerCase()) as { id: string } | undefined;
  if (!user) throw new Error("No matching account on this instance.");
  const token = randomBytes(32).toString("hex");
  transaction(db, () => {
    db.prepare("DELETE FROM password_resets WHERE user_id=? OR expires_at<=?").run(user.id, now);
    db.prepare("INSERT INTO password_resets VALUES(?,?,?)").run(digest(token), user.id, now + lifetime);
  });
  return { token, expiresAt: new Date(now + lifetime).toISOString() };
}
export async function resetPassword(db: DatabaseSync, body: Record<string, unknown>) {
  const token = textField(body, "token", 64, 64);
  const password = textField(body, "password", 12, 128, false);
  const invalid = () => new HttpError(400, "This recovery code is invalid or expired. Request a new link from the instance operator.");
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const find = () => db.prepare("SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>?").get(digest(token), Date.now()) as { user_id: string } | undefined;
  if (!find()) throw invalid();
  const salt = randomBytes(16).toString("hex");
  const hash = await passwordHash(password, salt);
  return transaction(db, () => {
    // Check again after asynchronous hashing, so racing requests cannot reuse it.
    const grant = find();
    if (!grant) throw invalid();
    db.prepare("UPDATE users SET password_hash=?,salt=? WHERE id=?").run(hash.toString("hex"), salt, grant.user_id);
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(grant.user_id);
    db.prepare("DELETE FROM password_resets WHERE user_id=?").run(grant.user_id);
    return { ok: true, signInRequired: true };
  });
}
