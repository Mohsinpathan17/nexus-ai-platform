# Product usability upgrade — 12 October 2026

The goal was to improve practical usefulness and first-use clarity. No executive score, valuation, or universal satisfaction claim is made.

## Shipped behavior

- Cloud projects now have an opt-in, interactive React preview rather than source inspection alone. Desktop/phone views, restart, compilation errors, runtime errors, and an explicit update action are included.
- App.tsx and styles.css are editable. Download exports the editor's current contents. Authenticated cloud saving uses the project owner and an atomic updated-at comparison; stale saves return 409 and preserve the editor contents.
- Unsaved source edits can recover in the same tab using session storage, scoped by account/project. Discard restores the saved source. Project switching, replacing a selection, and signing out warn about unsaved edits.
- `/playground` offers the same preview/editor using an explicitly prepared React task-app starter. No account or model request is required. It is separate from the three recorded Gemini-generated public examples.
- Home explains browser preview/edit/export and includes a direct invitation to the open workspace. Existing Core, both themes, video, and genuine generated examples are preserved.
- Product, How It Works, Features, and Documentation reflect the current serverless product. Status fetches the actual health/configuration response without presenting it as an inference or uptime test.
- Privacy and early-access expectations pages describe current data flows and product limits. Contact links to the real repository issue tracker for non-sensitive feedback; no private support inbox is invented.

## Implementation

The trusted page lazily loads Sucrase to transpile TypeScript/JSX into CommonJS without executing the generated source. A Vite virtual-module plugin produces an inline, production React/ReactDOM runtime. Generated source executes only in an opaque-origin iframe, with no same-origin, popup, or top-navigation permission. CSP restricts resources, fetch, forms, nested frames, objects, and workers. Status messages are accepted only from the current frame and randomized channel. Only React and the supplied stylesheet imports are supported.

The compiler/runtime chunk is 422.53 KB, 115.19 KB gzipped, and loads only after Run preview. An initial runtime test caught an un-replaced `process.env.NODE_ENV`; the build was corrected, which also removed the development React runtime and reduced the chunk from 850.89 KB.

Source save is a new authenticated POST `/api/cloud/projects/:id/source`. It validates file limits/default export and uses existing project storage. No migration, new inference, or additional provider credentials are needed for editing and preview.

## Validation

- `npm run lint`: passed, no lint warnings.
- `npm run build:cloud`: production build, frontend/server TypeScript, and Cloudflare TypeScript passed.
- `npm run preflight:cloud`: passed.
- `npm run test:cloud`: 17 passed, none skipped. Includes source ownership, validation, oversized requests, stale-write rejection, and persisted reads without model usage.
- `npm run test:cloud:ui`: 36 passed, none skipped. Includes six preview/theme/viewport combinations, error recovery, blocked account/storage/fetch access, edited preview, export, tab recovery, source save success/conflict, account workflows, reduced motion, and responsive checks.
- `npm run test:export`: validates ZIP contents/CRC and builds trusted fixture exports; the prepared starter has a separate production-build check.
- `npm run test:preview:live`: actual deployed public playground interactions, editing, updated preview, download, phone view, both themes, and no overflow at 390/1440px. Also checks live status and rejects an unauthenticated edit request. The downloaded uncompressed ZIP is checked for the edited headline and source filename.
- `npm run test:showcase:live`: actual saved Gemini outputs still work at 390/1440px; guided signup draft persists. No inference or email is requested by these live checks.
- Public HTTPS is fetched through Node's trusted environment CA and fulfilled into Chromium with the real responses. TLS verification is retained; responses are not simulated.
- Screenshots inspected: public phone/light hero, desktop/dark workspace invitation, and desktop/dark open workspace.

Local browser testing uses Firebase/API fixtures for authenticated cases. Actual public preview tests use real deployed assets. No new real account, email delivery, or private-account cloud-save session was tested against production.

## Publication

Cloudflare Worker `nexyral`, root custom domain https://nexyral.online.
Deployment version: `a6894383-c1ca-44aa-b1d1-9e984785b936`.
Open workspace: https://nexyral.online/playground.

## Remaining limits

- Vite retains the size advisory for the lazy 918.47 KB Core bundle (243.60 KB gzipped). Homepage bundle is 462.09 KB (146.11 KB gzipped).
- Some Vite-only local page tests report a refused legacy API proxy connection because no localhost:8787 backend is started. Public API behavior is checked separately against the deployed Worker; this is not a production connection failure.
- Browser preview is not a production build, type check, audit, or CPU/process isolation boundary. Arbitrary loops can still consume browser resources. Restarting or replacing a frame resets its in-memory app data. External APIs, libraries, images, and persistent app storage are not provided by the isolated preview.
- AI quality and free-tier capacity remain variable. Automatic builds/tests, generated business backends, generated-app deployment, natural-language iterative editing, usage analytics, and self-service deletion remain future product work.
- Tab recovery depends on session storage and the saved source baseline. It is not a cross-device backup or version history. Save to cloud or download before leaving; a changed server baseline requires preserving your local copy before reopening.
- Public policy text explains implementation; it does not establish legal compliance or replace a commercial legal review.

## Files

Created: preview runtime/ReactPreview components; react-preview and starter-project libraries; virtual-module TypeScript declaration; Playground and PolicyPage; WorkspaceInvite; CloudStatus; preview.css; preview browser tests; live preview check script; this report.

Modified: Cloudflare worker and backend tests; package manifest/lockfile (Sucrase); Vite config; SourceOutput; CloudStudio; application routes; Home; Hero; GettingStarted; Questions; ContentPage; GettingStartedGuide; Footer; main stylesheet imports; cloud studio/export tests.

The generated timestamp-only Focus ZIP change was restored to avoid an unrelated tracked binary change. No secret values are stored in source or this report.

### Exact file inventory

**Modified**

- `cloudflare/cloud.test.ts`
- `cloudflare/worker.ts`
- `package-lock.json`
- `package.json`
- `src/app/App.tsx`
- `src/components/navigation/Footer.tsx`
- `src/components/workspace/SourceOutput.tsx`
- `src/main.tsx`
- `src/pages/CloudStudio.tsx`
- `src/pages/ContentPage.tsx`
- `src/pages/GettingStartedGuide.tsx`
- `src/pages/Home.tsx`
- `src/sections/GettingStarted/GettingStarted.tsx`
- `src/sections/Hero/Hero.tsx`
- `src/sections/Questions/Questions.tsx`
- `tests/cloud/export.test.ts`
- `tests/cloud/studio.spec.ts`
- `vite.config.ts`

**Created**

- `docs/PRODUCT_USABILITY_UPGRADE.md`
- `scripts/check-preview-live.mjs`
- `src/components/preview/ReactPreview.tsx`
- `src/components/preview/runtime.tsx`
- `src/components/ui/CloudStatus.tsx`
- `src/lib/react-preview.ts`
- `src/lib/starter-project.ts`
- `src/pages/Playground.tsx`
- `src/pages/PolicyPage.tsx`
- `src/preview-runtime.d.ts`
- `src/sections/WorkspaceInvite/WorkspaceInvite.tsx`
- `src/styles/preview.css`
- `tests/cloud/preview.spec.ts`

