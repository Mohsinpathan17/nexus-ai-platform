# Root-domain launch — 9 October 2026

**Primary public website: https://nexyral.online**

The root domain is now connected to the serverless `nexyral` Worker. `www.nexyral.online` redirects permanently to the root while preserving the path and query. No `app` or `preview` DNS records exist in the current Cloudflare zone. The temporary Workers demo hostname is disabled with `workers_dev: false`; the production address is the root domain.

## Completed DNS work

Cloudflare nameservers: `ace.ns.cloudflare.com` and `raina.ns.cloudflare.com`. The zone is active. After the owner updated DNS permissions, DNS listing succeeded. The conflicting root records were two proxied GoDaddy parking A records, pointing to `15.197.148.33` and `3.33.130.190`.

All four original records were backed up privately under `.data/domain-backups/` before mutation. Only the two parking A records were deleted for the root attachment. The existing DMARC TXT record was preserved exactly and remains DNS only. The existing `www` CNAME was backed up and replaced by a Cloudflare-managed Worker record for the canonical redirect.

The resulting proxied AAAA records, including `100::`, are managed by Cloudflare for Worker Custom Domains. **Keep them; do not follow earlier troubleshooting instructions to delete the apex record.** No MX record was present in the inspected zone. Domain routing does not create a professional mailbox or configure outgoing email.

## Repeatable deployment

`wrangler.jsonc` now declares the root Custom Domain. `wrangler.redirect.jsonc` declares `www.nexyral.online` for the minimal `cloudflare/www-redirect.ts` Worker, which has no credentials, assets, storage or application bindings. Both temporary workers.dev addresses are disabled in configuration.

```sh
npm run build:cloud
npx wrangler deploy
npx wrangler deploy --config wrangler.redirect.jsonc
```

The root deployment preserves D1 and the encrypted Gemini key. The redirect sends only GET/HEAD to the fixed HTTPS root; non-read requests return 421. It preserves paths and query strings without allowing a destination hostname from user input.

Initial redirect deployment briefly hit Cloudflare's new-Worker metadata lookup error 10007. Subsequent upload reached the actual existing-DNS conflict. The backed-up `www` CNAME was replaced, the domain was attached, and the final redirect deployment succeeded. No failed attempt was reported as success.

## Live verification

Verified with Node's certificate-checked HTTPS transport:

- Root homepage, `/login`, `/get-started`, `/workspace`: HTTP 200.
- `/api/health`: HTTP 200, `mode: serverless`, `generationConfigured: true`, `verificationAvailable: false`.
- Anonymous projects: HTTP 401; cross-origin project write: HTTP 403.
- `www` login path with a query: HTTP 308 to the same path/query on `https://nexyral.online`.
- A double-slash path remains on the root hostname; it cannot redirect to another domain.
- Non-read requests to `www`: HTTP 421.

The deployed homepage and login screen were rendered at 375px in Chromium with reduced motion and dark theme, using actual deployed bytes carried by Node's verified TLS/proxy transport. No horizontal overflow, page errors or failed resources were observed. This bridge does not represent a native-browser TLS test. Screenshots: `artifacts/root-login-mobile-dark.png` and `artifacts/root-home-mobile-dark.png`.

Lint, Cloudflare TypeScript and configuration preflight passed for this change. The existing application production build and 13 focused tests passed in the preceding workspace pass; a subsequent signup-navigation fix aligns the form with its React Router URL and browser history. The final production cloud build and all six cloud browser tests passed after this fix. The known lazy 3D bundle advisory remains.

## Remaining provider work

Firebase Authentication and email/password handling are activated, and `nexyral.online` is authorized. Live owner signup, received verification/recovery email and signed-in generation still need an end-to-end owner check. No customer account was created by these checks.

GitHub sign-in needs an OAuth App configured in Firebase:

1. GitHub Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage: `https://nexyral.online`.
3. Callback: `https://nexyral.firebaseapp.com/__/auth/handler`.
4. Firebase Authentication → Sign-in method → GitHub → Enable. Enter the client ID and secret there, never in chat or frontend code.
5. Once configured, build with `VITE_FIREBASE_GITHUB=1` and redeploy, then test real sign-in.

GitHub identity does not grant repository access; repository import/export needs a separate scoped integration.

The configured Gemini model is `gemini-3.5-flash`; a previous real Worker inference returned structured frontend source. Generation remains source generation, with no sandboxed build/tests, secure preview or automatic deployment of the generated application. Quotas and the daily generation budget remain. No billing upgrade, AWS resize or deletion occurred. Legacy AWS/SQLite data was not migrated or removed, and existing AWS resources can still consume credits.

HTTPS on the root was verified. Zone-wide Always Use HTTPS settings could not be read with this token (HTTP 403), and plain HTTP could not be probed through the execution proxy. The owner can enable **SSL/TLS → Edge Certificates → Always Use HTTPS** in the Cloudflare dashboard; its state has not been certified here.

## Files and deployment receipts

Created: `cloudflare/www-redirect.ts`, `wrangler.redirect.jsonc`.
Modified: `wrangler.jsonc`, `src/pages/CloudStudio.tsx`, `tests/cloud/studio.spec.ts`, `docs/ROOT_DOMAIN_LAUNCH.md`, `docs/FREE_SERVERLESS.md`.
No dependencies were added.

Redirect version: `62451530-5904-4d99-b667-255fffda205f`. The root version that disabled the temporary address was `fde45836-30e5-405c-a268-2cb7df9fb8e1`; its health returned 200, `www` returned 308, and the temporary demo health returned 404. The final signup-navigation deployment receipt follows after verification.

Final root version: `85a7183e-f584-4646-a39d-e9e4a4725ff5`. After deployment, the real public signup navigation was checked in Chromium using the verified transport bridge: clicking Get Started from login displayed Create your account at `/get-started`, with no page errors. Root health remained HTTP 200. All six controlled browser tests passed, and the production cloud build passed. The known 3D chunk advisory remains 917.51 KB / 243.26 KB gzip.
