import { resolve } from "node:path";
import { openDatabase } from "./database.ts";
import { appOrigins, previewOrigin } from "./config.ts";
import { createApp } from "./app.ts";
import { accountProviderChecks } from "./account-provider-config.ts";
const accountProblems = accountProviderChecks(process.env).filter(check => !check.passed);
if (accountProblems.length) throw new Error(accountProblems.map(check => `${check.name}: ${check.message}`).join("\n"));
const apiHost = process.env.NEXYRAL_API_HOST ?? "127.0.0.1";
const trustedProxies = (process.env.NEXYRAL_TRUSTED_PROXIES ?? "").split(",").filter(Boolean);
if (trustedProxies.length && apiHost !== "127.0.0.1") throw new Error("Trusted proxy mode requires the API to listen on 127.0.0.1.");
const port = Number(process.env.NEXYRAL_API_PORT ?? 8787);
const origins = appOrigins();
const preview = previewOrigin(origins);
if (process.env.NODE_ENV === "production" && !process.env.NEXYRAL_APP_ORIGINS)
  throw new Error("Set NEXYRAL_APP_ORIGINS explicitly for production.");
if (
  process.env.NODE_ENV === "production" &&
  origins.some((origin) => !origin.startsWith("https://"))
)
  throw new Error("Production origins must use HTTPS.");
const db = openDatabase(
  resolve(process.env.NEXYRAL_DB_PATH ?? ".data/nexyral.sqlite"),
);
const github = process.env.NEXYRAL_GITHUB_CLIENT_ID && process.env.NEXYRAL_GITHUB_CLIENT_SECRET ? { clientId: process.env.NEXYRAL_GITHUB_CLIENT_ID, clientSecret: process.env.NEXYRAL_GITHUB_CLIENT_SECRET, appOrigin: process.env.NEXYRAL_AUTH_ORIGIN ?? origins[0] } : undefined;
const server = createApp({ db, origins, staticDir: resolve("dist"), previewOrigin: preview, trustedProxies, github });
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, apiHost, () =>
  console.log(
    `NEXYRAL API ready on port ${port}. Planning worker is managed separately.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
    server.closeAllConnections();
  });
