# Public Cloudflare staging — 9 October 2026

**Update:** Gemini 3.5 Flash is now configured and a real generation request passed. See [GEMINI_ACTIVATION.md](GEMINI_ACTIVATION.md). Firebase Authentication is now activated; see [ROOT_DOMAIN_LAUNCH.md](ROOT_DOMAIN_LAUNCH.md) for current domain/account setup. The details below record the initial staging deployment.

Public URL: https://nexyral.nexyral-studio-31d0ee7a.workers.dev

Cloudflare deployed Worker version `f30b6b32-2dc1-4293-96ef-5dad9219c2a3`. The user provided Cloudflare and Firebase settings through the published environment. Cloudflare API token verification succeeded, and access to the selected account's Workers and D1 endpoints was verified without logging credentials.

Created an account Workers staging subdomain and the `nexyral` D1 database. Applied the existing schema migration remotely and deployed the production React assets plus Worker. No GoDaddy DNS changes, AWS resize, EC2 stop/delete, identity migration, source publication or paid-plan upgrade was performed.

## Activation still required

Firebase currently returns `CONFIGURATION_NOT_FOUND`. Open Firebase Console > project NEXYRAL > Authentication > Get started, enable Email/Password, then add `nexyral.nexyral-studio-31d0ee7a.workers.dev` under Authentication > Settings > Authorized domains. Use the hostname without HTTPS or a path. Verification/recovery delivery and actual account flows have not passed live testing yet. GitHub OAuth is also not configured.

The Gemini key is missing and `GEMINI_MODEL` is intentionally empty. The public health endpoint correctly reports `generationConfigured: false` and `verificationAvailable: false`. No real AI generation, tests, build, secure preview or software deployment has occurred. Add the Gemini key as a secret in the Cloudflare Worker's settings (never as VITE configuration, Git or chat) and select an available free-tier model before enabling inference.

Existing EC2 identities/projects remain on their original storage. Firebase/D1 migration requires ownership-safe mapping and backups before domain cutover. Free-tier usage quotas still apply.

## Validation

- Lint, app/server TypeScript, edge TypeScript, five synthetic signed-identity/SQL/mock-Gemini tests and production cloud build passed.
- Explicit staging preflight `npm run preflight:cloud -- --allow-disabled-generation` passed. Ordinary cloud deployment still requires a valid configured model. The staging override permits only an empty model and does not bypass Firebase/D1 validation or enable generation.
- Remote D1 migration applied successfully; actual Worker/assets deployment succeeded.
- Ten anonymous public HTTPS checks passed: homepage, signup, login, workspace and documentation HTML; entry JS/CSS; health; anonymous project rejection (401); cross-origin mutation rejection (403).
- Actual deployed bytes rendered at 375 and 1440px with the signup form visible, no page errors, no horizontal overflow and screenshots captured. The sandbox Chromium client does not trust the environment's egress-proxy CA; deployed assets were obtained through Node's correctly configured, verified HTTPS transport and fulfilled to the renderer. TLS verification was never disabled. This is renderer verification using real deployed content, not native-browser TLS verification from an end user's network.
- Newly allocated hostname initially failed the environment proxy's upstream TLS handshake; later verified HTTPS probes succeeded. No production build/type errors remain. The existing lazy 3D bundle still triggers Vite's size advisory.

Receipts/screenshots are ignored local artifacts: `artifacts/cloud-staging.json`, `cloud-staging-checks.json`, `cloud-live-375.png` and `cloud-live-1440.png`. They contain no account credentials or user project content.

## Changes in this activation pass

- `wrangler.jsonc`: real D1 binding ID and matching Firebase project ID.
- `scripts/cloud-preflight.ts`: explicit disabled-generation staging option.
- `package.json`: `deploy:cloud:staging` command.
- `src/pages/CloudStudio.tsx`: clear unavailable-authentication error messages.
- This report and links in `FREE_SERVERLESS.md` / `SERVERLESS_IMPLEMENTATION_REPORT.md`.

To redeploy the same staging site after review, use Node 24.19+, the existing checkout `apps/nexyral`, injected Cloudflare settings, and `XDG_CONFIG_HOME=/tmp/nexyral-cloud-config WRANGLER_LOG_PATH=/tmp/nexyral-wrangler-deploy.log npm run deploy:cloud:staging`. This publishes to the existing staging Worker; do not run it casually or change account/domain targets. Full AI activation uses the normal deployment preflight and needs provider configuration and real staging checks.
