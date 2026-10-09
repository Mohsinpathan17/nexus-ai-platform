import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../server/database.ts";
import { issueRecovery } from "../server/password-recovery.ts";
import { appOrigins } from "../server/config.ts";
const [email, ...extra] = process.argv.slice(2);
if (!email || extra.length) throw new Error("Usage: npm run account:recovery -- <verified-account-email>");
const origin = process.env.NEXYRAL_RECOVERY_APP_ORIGIN ?? appOrigins()[0];
if (!appOrigins().includes(origin)) throw new Error("Recovery origin must be a configured application origin.");
if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) throw new Error("Production recovery requires HTTPS.");
const db = openDatabase(resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"));
try {
  const grant = issueRecovery(db, email);
  const root = resolve(".data/recovery-links"); await mkdir(root, { recursive: true, mode: 0o700 });
  const path = join(root, `${randomUUID()}.json`);
  await writeFile(path, JSON.stringify({ url: `${origin}/recover#token=${grant.token}`, expiresAt: grant.expiresAt }, null, 2), { flag: "wx", mode: 0o600 });
  console.log(`Recovery link written privately to ${path}. Expires in 15 minutes. No email was sent.`);
} finally { db.close(); }
