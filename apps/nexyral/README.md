# NEXYRAL website

## Public serverless application

Live at **https://nexyral.online**. The Cloudflare Worker serves the React website and a D1-backed workspace with Firebase email/password and Google authentication, Gemini frontend source generation, ZIP export, and six-digit email verification through Resend (requires a verified sending domain). GitHub sign-in is optional and requires separate provider configuration. Generated source is explicitly unverified; this serverless version does not build, test or deploy generated projects.

Start with [serverless configuration](docs/FREE_SERVERLESS.md) and [email-code setup](docs/EMAIL_CODE_SETUP.md). Supply your own public Firebase web configuration using `.env.example`; keep Gemini and Resend keys and the email-code hashing secret in encrypted Worker secrets. The checked-in Cloudflare configuration identifies the existing NEXYRAL deployment; use your own account/database/domain settings for an independent deployment. Never commit credentials or local databases.

From this directory, run:

```sh
npm ci
npm run lint
npm run build:cloud
npm run test:cloud
npm run test:cloud:ui
```

The cloud browser tests use `/usr/bin/chromium` and controlled account/provider fixtures. Live Google consent, inbox delivery and spam placement require real owner testing. The included captioned 30-second walkthrough uses an explicitly labelled example account and generated output. See [the account UI report](docs/ACCOUNT_AND_WALKTHROUGH_REPORT.md).

## Alternative Node/SQLite workspace

React + TypeScript website and authenticated engineering workspace in `apps/nexyral`, backed by a Node/SQLite API. The previous NEXUS prototype remains untouched. Accounts, personal projects, intent, events, and cancellation are real persisted functionality. A separately started local Ollama worker can produce a stored planning proposal for human review. An opt-in Docker executor can generate and compile an owner-approved small React frontend. Payments and deployment are not implemented. The public website’s execution, repair, workspace, and verification demonstrations remain explicitly simulated. Pricing and entitlements are provisional.

## Development

Node 24.19+ and npm (validated with Node 24.19.0; pinned in `.node-version`).

```sh
cd /workspace/nexus-ai-platform/apps/nexyral
npm ci --cache /tmp/nexyral-npm
npm run dev -- --host 0.0.0.0
```

## Checks

```sh
npm run lint
npm run typecheck
npm run test:api
npm run build
npm run test:e2e
```

Playwright starts an isolated API on port 8790 using `.data/e2e.sqlite`, and a production frontend preview on port 4174. It uses `/usr/bin/chromium` when present; set `NEXYRAL_CHROMIUM_PATH` to another installed Chromium executable, or install Playwright Chromium with `npx playwright install chromium` on a machine where downloads are permitted. Test reports go to `playwright-report`; failure traces go to `test-results`. Screenshots go to `artifacts`. These generated outputs are ignored by Git.

The suite checks every Home section in both themes at 1440, 768, 375, 390, and 430 pixels; interactive workflows and keyboard controls; desktop/mobile navigation; dedicated routes; theme persistence and OS changes; reduced motion; unavailable WebGL; and real WebGL rendering. Console errors and page errors fail the relevant checks. This does not replace a manual accessibility audit or performance testing on real devices.

## Architecture

- `src/app`: application routing and the existing theme provider.
- `src/components`: shared navigation, UI primitives, illustrative SupportOS interface, and the lazy-loaded 3D Core.
- `src/sections`: isolated storytelling sections, each with its own interaction and responsibility.
- `src/lib/product-content.ts`: shared product, workflow, audience, and plan content.
- `src/pages`: complete Home, initial content routes, functional account pages, protected workspace routes, and legal placeholders.
- `server`: HTTP, authentication, SQLite persistence, events, and dev orchestration.
- `shared/contracts.ts`: typed API payloads.
- `src/styles`: existing global design tokens and additive responsive storytelling styles.
- `tests/site.spec.ts`: repeatable browser checks.

The development command starts the API on port 8787 and Vite on port 5173. Authentication requires the API; the default data directory is `.data`. Do not delete it as a routine startup step. `npm run dev:api` starts just the API, and `npm start` runs the compiled server after a build. In production, configure `NEXYRAL_APP_ORIGINS` explicitly with HTTPS origins. See [the API contract](docs/API_CONTRACT.md) and [Step 3 report](docs/STEP_3_REPORT.md).

Theme choice persists locally; System follows OS changes. The Core uses bounded DPR, low-complexity geometry, and a reduced-motion demand frame loop. A geometric fallback handles unavailable WebGL2. New section reveals do not animate in reduced-motion mode, and the execution demonstration presents its completed state immediately. Mobile diagrams and pipelines become vertical compositions; the workspace presents files, code, and preview in sequence.

## 3D bundle investigation

Milestone 1 baseline: **934.66 KB / 248.39 KB gzip**. Step 2: approximately **914.85 KB / 242.62 KB gzip** (see the build for exact current values). Replacing the simple Drei connection lines with native Three line segments removes the runtime dependency on Drei and three-stdlib without changing the scene's identity. Source-map inspection confirms Three and Fiber are absent from the main chunk, and the Core contains a single Three installation. The installed Drei dependency retains an unused nested Three version through stats-gl, but neither stats-gl nor that version is in the runtime bundle. Drei remains available for future scene work.

The 500 KB build advisory remains intentionally visible. No warning threshold was raised. Real-device performance and GPU profiling remain Step 3 work; the browser suite validates rendering and interactions, not frame-rate budgets.

## Next implementation

Expand the approved frontend executor with plan revisions, generated-app tests and stronger workload isolation; add email verification, account recovery, and secure contact flows; expand verification and accessibility audits; measure Core loading and rendering on physical mobile devices; and specify deployment approval and failure handling. Keep simulated website demonstrations distinct from live platform results. Do not introduce commercial prices or entitlements until they are decided.

## Local planning worker (free inference)

See [worker setup and boundaries](docs/WORKER.md). Run `NEXYRAL_PLANNING_MODEL=<installed-model-name> npm run worker` alongside the API, after Ollama is installed and serving locally. No paid API key is required. This worker processes pending runs into planning proposals and stops at human review; optional isolated frontend builds require explicit owner approval and `NEXYRAL_ENABLE_BUILDS=1`. Read the scope and resource boundaries before enabling them.

A real local-model counter has passed plan review, source generation, Docker compilation and a separate targeted browser smoke check. Reproduce using `scripts/local-model-smoke.ts` and `scripts/check-generated-counter.ts`; see [Step6 evidence](docs/STEP_6_REPORT.md). The standard test suite uses controlled fixtures and does not spend local inference time.
