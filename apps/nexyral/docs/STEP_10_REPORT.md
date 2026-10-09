# Step 10: isolated previews, retention and portable browser execution

## Scope

Preserved the public website, themes, Core identity, existing workspace accounts
and stored project evidence. The Vercel public website demo remains separate
from account, API, model and execution services. No backend deployment or
existing production-project changes are part of this step.

## Implementation

- Distinct-host preview service with exact Host validation, restrictive CSP,
  cookie-free single-use grants, session revocation, and readiness/retry UI.
- Atomic preview retention admission with owner count/UTF-8 byte quotas and
  scheduled expiry. Existing legacy outputs are preserved. Source/approval/
  verification evidence survive preview expiry.
- Additive SQLite v4 grant/retention tables. A migration test exercises an
  actual on-disk v3 database, reopen, expiry, owner and session preservation.
- Pinned-base execution image bundles Chromium, libraries and fonts. Build
  helper handles proxy DNS and trusted public certificates without disabling
  TLS or package signatures. Browser preflight occurs before claiming work.
- Public-demo build and Vercel deployment helper isolate static website output
  and clearly disable account forms. The public demo was published separately
  at https://nexyral-demo-d22728c3.vercel.app and passed public HTTP checks.

## Files created

`server/config.ts`, `server/retention.ts`, `server/preview-access.ts`,
`server/preview-server.ts`, `server/preview-entry.ts`,
`server/execution-image.ts`, `server/retention.test.ts`,
`docker/executor/Dockerfile`, `scripts/build-executor.ts`,
`scripts/deploy-demo.ts`, `scripts/mark-demo.ts`, `vercel.json`,
`docs/LIVE_DEMO.md`, `docs/STEP_10_REPORT.md`.

## Files modified

`server/database.ts`, `server/worker.ts`, `server/outputs.ts`,
`server/preview.ts`, `server/app.ts`, `server/auth.ts`, `server/index.ts`,
`server/dev.ts`, `server/build.ts`, `server/worker-entry.ts`,
`server/app.test.ts`, `shared/contracts.ts`, `shared/preview.ts`,
`src/pages/workspace/RunOutput.tsx`, `src/pages/AuthPage.tsx`,
`src/app/AuthProvider.tsx`, `playwright.config.ts`,
`tests/workspace.spec.ts`, `package.json`, `docs/WORKER.md`,
`docs/API_CONTRACT.md`.

No new npm dependencies. Image-only Debian browser/font packages were added.
Root prototype applications and root configuration were preserved.

## Validation

- `npm run lint`: passed without application warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing lazy-loaded 3D chunk size advisory remains.
- `node --test server/retention.test.ts`: 4 passed, including v3 migration.
- `npm run test:e2e -- tests/workspace.spec.ts`: 5 passed, no skipped tests.
- Portable image build and full API tests: final results recorded below.

The first image attempts exposed proxy hostname resolution and unreadable CA
permissions for APT's unprivileged downloader. Corrections supplied build-only
proxy host resolution and made the public CA bundle readable inside the image.
No certificate verification or repository signatures were bypassed.

## Limits and next stage

This is not a certified multi-tenant sandbox. Docker is still required, compiler
and Playwright dependencies remain a read-only mount, and image distribution/
provenance and regular security updates are outstanding. Debian package versions
are not snapshot-pinned, so rebuilding can change the immutable local image ID.
Retention bounds preview payloads, not the whole database. Legacy previews stay
unscheduled; a separately reviewed migration is needed to change that policy.
Source exports do not include a generated lockfile. No production-quality claim
is made for arbitrary local-model output.

Next: backup/restore and lifecycle controls, service orchestration, account
recovery and HTTPS backend hosting preparation before offering real public
workspaces. The Vercel website demo continues to identify service limitations.

Final container validation: `npm run build:executor` passed twice (second run
cached), with Chromium 154.0.8037.92 and immutable image
`sha256:c5b65c08249c64dc22d3dd84b06b47b9c9e89259eca6b7c5258350e59b66fba8`.
Image size is 909 MB. The full server suite was rerun against this image; results
are recorded after restart in the final validation report. Browser binary
preflight and compile/behavior tests use the bundled image without host browser
mounts. Docker containers retain network-none, read-only root and resource limits.

Final results after restart: full `npm run test:api` ran 31 tests, all passed,
zero skipped. `npm run test:e2e -- tests/workspace.spec.ts` ran five tests, all
passed (43.3 seconds) against the bundled execution image. Lint, TypeScript and
production build passed. Saved cloud startup instructions now describe this
image and separate preview process; the updated configuration is a review draft.
