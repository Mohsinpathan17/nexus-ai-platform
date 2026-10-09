# Free serverless implementation report

**Update:** public Cloudflare staging was subsequently deployed and checked. See [CLOUDFLARE_STAGING.md](CLOUDFLARE_STAGING.md) for the current URL, activation blockers and validation. The report below records the earlier implementation pass.

Implemented in `apps/nexyral` on 2026-10-09. No public serverless deployment, DNS change, EC2 upgrade, repository publication or infrastructure deletion was performed.

## Built

An opt-in Cloudflare Workers Static Assets/D1 deployment, a Firebase-authenticated cloud workspace, and a server-only Google Gemini frontend-generation integration. Email/password signup, verification, recovery and optional GitHub authentication use Firebase. Projects are scoped to a verified JWT subject; generation requires email verification, an atomic lease and a configured daily request budget. Generated React source can be inspected and downloaded. Output is explicitly `verification: not_run`; it is not executed, tested or deployed by the serverless worker.

Hero supporting copy, navigation, control labels and mobile readability were improved through reusable typography tokens. Reduced-motion Hero entrance now starts visible. Existing themes and 3D identity were preserved. Documentation now distinguishes serverless source generation from the existing local engineering-worker workflow and includes an accessible link to verification concepts.

## Created

- `cloudflare/auth.ts`: fixed Google JWKS endpoint, signed Firebase token/issuer/audience/expiry validation.
- `cloudflare/gemini.ts`: bounded structured-output request, incomplete-output/quota/error handling, source shape validation.
- `cloudflare/worker.ts`: assets/API routing, streaming request-size bound, origin protection, owner-scoped SQL, generation leases and budget.
- `cloudflare/migrations/0001_projects.sql`: project and generation-usage tables.
- `cloudflare/cloud.test.ts`: five tests using actual RSA signatures and SQLite statements with controlled provider responses.
- `wrangler.jsonc`, `tsconfig.cloudflare.json`: deployment/bindings and edge TypeScript configuration.
- `src/lib/cloud-auth.ts`, `src/pages/CloudStudio.tsx`: lazy-loaded account/project/source workspace.
- `src/styles/typography.css`, `src/styles/cloud-studio.css`: typography and responsive, theme-token-based workspace styling.
- `.env.example`: public Firebase configuration names only.
- `scripts/cloud-preflight.ts`: blocks incomplete deployment configuration without logging values.
- `docs/FREE_SERVERLESS.md`: account creation, secret storage, deployment, validation, custom domain and migration instructions.
- This report.

## Modified

- `package.json`, `package-lock.json`: Firebase runtime dependency; Wrangler and Cloudflare Workers types development dependencies; cloud build/test/dev/preflight/deploy commands.
- `.gitignore`: local Wrangler state and environment/secret files excluded.
- `src/main.tsx`: new styles.
- `src/app/App.tsx`: opt-in lazy cloud routes; existing account/workspace behavior remains the default build.
- `src/app/AuthProvider.tsx`, `src/hooks/useProviders.ts`: avoid requesting legacy cookie/provider APIs in cloud mode.
- `src/sections/Hero/Hero.tsx`: reduced-motion entrance correction.
- `src/pages/GettingStartedGuide.tsx`: truthful cloud workflow and verification concept navigation.

All application files were already untracked in the existing checkout; this report distinguishes the files changed in this pass rather than implying commits were made.

## Checks executed

- `npm ci --cache /tmp/nexyral-npm-cache`: passed, 243 packages installed.
- `npm run lint`: passed.
- `npm run typecheck` and `npm run typecheck:cloud`: passed.
- `npm run test:cloud`: five passed, no skipped tests. These use synthetic identities/mocked Gemini and do not prove live provider credentials.
- `node --test server/deployment-preflight.test.ts server/database-startup.test.ts`: seven passed, including the existing empty-schema and SQLite-lock regressions.
- `npm run build:cloud`: production frontend/server TypeScript/Vite build and edge typecheck passed.
- `npm run build`: existing EC2 build passed; default build restored after cloud validation.
- Local `wrangler d1 migrations apply nexyral --local`: schema applied, repeat application reported no pending migrations.
- Local `wrangler dev`: served real Worker/assets runtime. HTTP checks passed for serverless health, anonymous access rejection and cross-origin rejection.
- Browser inspection against that runtime: light/dark at 375, 390, 430, 768 and 1440px, section overflow, larger Hero copy, unconfigured account state and page-error checks passed. Four stable screenshots were produced and inspected at desktop/mobile sizes; reduced-motion Hero opacity was checked.
- `npx playwright test tests/site.spec.ts tests/workspace.spec.ts`: initially 20 passed and one failed because the documentation verification link was missing. The link was added; targeted `tests/site.spec.ts --grep 'all dedicated routes'` rerun passed. Other tests included actual isolated frontend check evidence on the legacy workspace. This was not a fresh all-21 suite rerun after the documentation change.
- Wrangler `deploy --dry-run`: bundled Worker and assets successfully; no public deployment performed.
- `npm run preflight:cloud`: correctly failed with missing public Firebase values, D1 ID, Worker project ID and model configuration. This is a deployment blocker, not a passing activation check.

The cloud development sandbox needs `XDG_CONFIG_HOME=/tmp/nexyral-cloud-config` and `WRANGLER_LOG_PATH=/tmp/nexyral-wrangler.log`; initial attempts to use the unavailable default home-config directory failed and were corrected. Initial npm cache and TypeScript errors were corrected before the successful checks above.

## Remaining limits

Cloudflare/Firebase accounts and Gemini key are not connected here. Live email verification/recovery, GitHub OAuth, real Gemini inference and public HTTPS staging are untested. Free-tier quotas and model availability must be checked in the user's accounts. The Worker has no background engineering queue, sandboxed execution, tests, secure preview or production shipping. Existing SQLite identities/data are not migrated to Firebase/D1. Immediate Firebase token revocation checking and production abuse/CPU profiling remain future work. The existing lazy 3D chunk remains approximately 917.51KB minified / 243.25KB gzip and triggers Vite's size advisory. Browser runners emit environment NO_COLOR/FORCE_COLOR warnings; Wrangler detects the configured proxy.

The reusable cloud environment startup instructions were saved as a draft. The user must review/save them in environment settings and publish the cloud environment for future-task restoration; this is separate from public website deployment.

## Activation and next work

Follow `FREE_SERVERLESS.md`: create a free Cloudflare account, configure Firebase Spark and Gemini's eligible free tier, deploy to the real Workers staging URL, and validate accounts/inference before touching the GoDaddy domain. Do not execute the pending AWS capacity upgrade. Preserve the old disk and private backup until ownership-safe migration and replacement verification pass. Next engineering work is durable approved jobs with genuine isolated build/test evidence, migration and repository access distinct from GitHub sign-in.
