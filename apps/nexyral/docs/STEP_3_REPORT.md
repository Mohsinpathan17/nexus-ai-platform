# Step 3 foundation: authenticated workspace and run persistence

Implemented within `apps/nexyral`; the previous NEXUS prototype and public Hero/Core identity remain intact. No publication or deployment occurred.

## Working capabilities

- Real account creation, login, cookie sessions, protected routes, and logout.
- Persistent personal projects, run counts, and run history.
- Real intent submission to an atomic SQLite transaction.
- Actual stored events and a user-intent artifact; cookie-authenticated event streaming and replay.
- Owner authorization across project, run, artifact, and stream access.
- Idempotent cancellation, with its event preserved after reload and database reopen.
- Shared TypeScript API models and explicit unavailable executor state.
- A separate responsive engineering workspace using the existing Light/Dark/System theme tokens.
- A single development command for the API and Vite, and a compiled server that can serve the built SPA and API together.

The engineering executor is not connected. Creating a run does not generate software, run tests on an application, or prepare deployment. Reserved worker states and artifact types are contracts for later implementation, not live capabilities.

## Files

New backend: `server/app.ts`, `server/auth.ts`, `server/database.ts`, `server/http.ts`, `server/runs.ts`, `server/index.ts`, `server/dev.ts`, and `server/app.test.ts`.

New shared contract: `shared/contracts.ts`.

New frontend: `src/app/AuthProvider.tsx`, `src/app/auth-context.ts`, `src/lib/api.ts`, `src/hooks/useResource.ts`, `src/components/ui/ThemeControl.tsx`, `src/pages/AuthPage.tsx`, and `src/pages/workspace/{WorkspaceLayout,ProjectsPage,ProjectPage,RunPage}.tsx`, plus `run-labels.ts` and `src/styles/workspace.css`.

New validation/configuration: `tests/workspace.spec.ts`, `tsconfig.server.json`, `.node-version`, `docs/API_CONTRACT.md`, and this report.

Updated: `src/app/App.tsx`, `src/main.tsx`, `src/components/navigation/Navbar.tsx`, `src/pages/ContentPage.tsx`, `vite.config.ts`, `playwright.config.ts`, `package.json`, `package-lock.json`, `.gitignore`, and `README.md`.

No new runtime or development dependency was added in this step. SQLite, hashing, HTTP, and development orchestration use Node built-ins. The Node runtime requirement is now 24.19+.

## Verification

- Lint and frontend/server TypeScript checks passed.
- Production build passed, including compiled server output.
- Six API tests passed: validation/hash/session behavior; CSRF/origin checks; ownership and cancellation; SSE/replay; persistence across reopen; and rate/body limits/secure cookies.
- Full browser suite: 18 passed, including all 15 prior public-site tests and three new workspace/authentication flows.
- Affected workspace tests passed again after final hardening and responsive checks at 375, 390, 430, and 768 pixels.
- Compiled-server browser smoke: account creation and protected workspace passed with no page errors.
- Combined dev startup: API health and anonymous session endpoints returned HTTP 200 through Vite.
- Desktop and mobile workspace screenshots were inspected in both themes.

Screenshots: `artifacts/workspace-desktop-{dark,light}.png`, `artifacts/workspace-mobile-{dark,light}.png`, `artifacts/auth-desktop-dark.png`, and `artifacts/auth-mobile-light.png`.

The existing lazy 3D bundle remains approximately 914.85 KB / 242.62 KB gzipped, with the existing Vite size advisory. No new browser errors or lint warnings were observed in passing positive flows. A rejected login intentionally returns HTTP 401 and displays a useful error.

## Remaining work

Connect a safely scoped worker and durable job queue; implement verified artifacts and repair transitions; define human release approvals; add email verification and password recovery; design team authorization and account lifecycle; and perform comprehensive accessibility and physical-device performance audits. Current rate limits and SQLite persistence are single-instance mechanisms, not distributed production infrastructure.

See `API_CONTRACT.md` for endpoint, session, state, and configuration details. Read `README.md` for repeatable setup and validation. Local `.data` contains mutable account/project data and must never be reset merely to start the application.
