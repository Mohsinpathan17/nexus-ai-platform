import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./database.ts";
import { issueRecovery } from "./password-recovery.ts";
import { HttpError } from "./http.ts";
export interface AccountMail { origin: string; send: (to: string, subject: string, text: string) => Promise<void> }
export function configuredMail(origin: string): AccountMail | undefined {
  if (!process.env.NEXYRAL_SMTP_HOST) return undefined;
  const host = process.env.NEXYRAL_SMTP_HOST;
  const from = process.env.NEXYRAL_MAIL_FROM ?? "";
  const port = Number(process.env.NEXYRAL_SMTP_PORT ?? 587);
  const user = process.env.NEXYRAL_SMTP_USER, pass = process.env.NEXYRAL_SMTP_PASSWORD;
  if (!/^[a-z0-9.-]+$/i.test(host) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) || ![465, 587].includes(port) || !user || !pass || !origin.startsWith("https://")) throw new Error("Configure a HTTPS app origin, SMTP host/465 or587, credentials and a valid sender address.");
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: true, auth: { user, pass }, tls: { minVersion: "TLSv1.2", rejectUnauthorized: true }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000 });
  return { origin, async send(to, subject, text) { const result = await transport.sendMail({ from, to, subject, text }); if (!result.accepted?.length || result.rejected?.length) throw new Error("Delivery was not accepted"); } };
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function emailVerified(db: DatabaseSync, userId: string) { return Boolean(db.prepare("SELECT user_id FROM verified_emails WHERE user_id=?").get(userId)); }
export async function sendVerification(db: DatabaseSync, mail: AccountMail, userId: string) {
  if (emailVerified(db, userId)) return;
  const user = db.prepare("SELECT email FROM users WHERE id=?").get(userId) as { email: string };
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM email_verification_grants WHERE expires_at<=?").run(Date.now());
  db.prepare("INSERT INTO email_verification_grants VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at").run(digest(token), userId, Date.now() + 3600000);
  try { await mail.send(user.email, "Verify your NEXYRAL email", `Confirm your email within one hour:\n${mail.origin}/verify-email#token=${token}\n\nIf you did not request this, ignore this message.`); }
  catch { db.prepare("DELETE FROM email_verification_grants WHERE token_hash=?").run(digest(token)); throw new HttpError(503, "Email could not be sent. Try again later or contact support."); }
}
export function verifyEmail(db: DatabaseSync, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, "Verification link is invalid or expired.");
  return transaction(db, () => {
    const grant = db.prepare("SELECT user_id FROM email_verification_grants WHERE token_hash=? AND expires_at>?").get(digest(token), Date.now()) as { user_id: string } | undefined;
    if (!grant) throw new HttpError(400, "Verification link is invalid or expired.");
    db.prepare("INSERT OR IGNORE INTO verified_emails VALUES(?,?)").run(grant.user_id, new Date().toISOString());
    db.prepare("DELETE FROM email_verification_grants WHERE user_id=?").run(grant.user_id);
    return { ok: true };
  });
}
export async function sendRecovery(db: DatabaseSync, mail: AccountMail, email: string) {
  const user = db.prepare("SELECT id FROM users WHERE email=?").get(email) as { id: string } | undefined;
  if (!user) return;
  const grant = issueRecovery(db, email);
  try { await mail.send(email, "Reset your NEXYRAL password", `Set a new password within 15 minutes:\n${mail.origin}/recover#token=${grant.token}\n\nIf you did not request this, ignore this message.`); }
  catch { db.prepare("DELETE FROM password_resets WHERE token_hash=?").run(digest(grant.token)); }
}
