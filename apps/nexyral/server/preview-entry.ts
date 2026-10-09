import { resolve } from "node:path";
import { openDatabase } from "./database.ts";
import { appOrigins, previewOrigin } from "./config.ts";
import { createPreviewServer } from "./preview-server.ts";
import { expirePreviews } from "./retention.ts";
const origins = appOrigins();
const origin = previewOrigin(origins);
const db = openDatabase(resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"));
const server = createPreviewServer({ db, origins, previewOrigin: origin });
server.requestTimeout = 10000;
server.headersTimeout = 5000;
const timer = setInterval(() => {
  try { expirePreviews(db); } catch { console.error("Preview retention sweep did not complete; it will retry."); }
}, 60000);
server.listen(Number(process.env.NEXYRAL_PREVIEW_PORT ?? (new URL(origin).port || 8788)), process.env.NEXYRAL_PREVIEW_HOST ?? "127.0.0.2", () => console.log("Isolated preview service ready. Grant values are never logged."));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  clearInterval(timer);
  server.close(() => { db.close(); process.exit(0); });
  server.closeAllConnections();
});
