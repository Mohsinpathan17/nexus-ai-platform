# Homepage refinement and runnable example — 2026-10-11

## Outcome

The public site keeps free early access and gains a more coherent presentation: simpler headline hierarchy, consistent body type, better laptop spacing, readable mobile layouts, stronger muted-text contrast, a clean SVG brand mark, current-page navigation, and clearer button states. Existing login, Firebase, Gemini, email verification, and service limits are preserved.

Focus is now a substantial working reference app on Home and `/examples/focus`: create tasks, set priority, complete tasks, filter, search, delete, persist on this device, and export JSON. Visitors can download a complete runnable React + TypeScript + Vite project from `/examples/focus-source.zip`, or inspect the component on GitHub. It requires no credentials and does not upload task data. Invalid or unavailable browser storage is handled without preventing use.

The reference app is explicitly not presented as a recorded autonomous AI build. No provider request, email, subscription, payment, or engineering verification was fabricated.

The Core now exposes actual first-frame readiness and shows a fallback until a mesh has rendered. Reduced-motion mode remains static, preference changes are reactive, and pause/resume stays available otherwise. Mobile and desktop remain subject to WebGL availability.

Legacy workspace/account routes now load on demand. The main production chunk decreased from the previous 499.04 KB / 154.06 KB gzip to approximately 445.17 KB / 140.41 KB gzip, despite the expanded example. The separate Core remains approximately 918 KB / 244 KB gzip and lazy-loaded.

## Validation

- `npm run lint`: passed with no code warnings after correcting local-state persistence.
- `npm run build:cloud`: passed (client/server TypeScript, Vite production build, Cloudflare TypeScript).
- `npm run test:cloud:ui`: 17 passed, including persistence, actual JSON download contents, search/deletion, malformed/blocked storage, Core motion/pause/reduced motion, keyboard navigation, account fixture flows, and the 30-second video.
- Additional responsive checks at 375, 390, 430, 768, 1024, 1280, and 1440px in light/dark themes found no page overflow or page errors on Home or the example route.
- Laptop and phone screenshots were generated and inspected in both themes.
- `npm run build --prefix .data/focus-source`: passed for the standalone source project with the environment's installed dependencies. This was not a fresh network installation of the downloadable project.
- A production preview of the standalone app verified mobile layout and persistence after reload.
- ZIP integrity check passed; 16 files, approximately 61 KB, with source/config/fonts/licenses and no backend files, environment files, or credentials.
- `npm run preflight:cloud` and `git diff --check`: passed.

One initial standalone TypeScript check found missing CSS import declarations. The package generator now includes `vite/client` declarations and the React Vite configuration; the actual standalone build was rerun successfully. No failed check is counted as a pass.

## Reproducibility

`npm run package:focus` recreates the source archive using an explicit source allowlist, a small Vite app entry, standalone theme styles, font assets/licenses, and a README. The regular production build runs this packaging step automatically, so the published example archive matches the checked-in app source. Python 3 is used for ZIP creation and is present in this environment. No new npm dependencies were installed.

## Remaining limits

Physical-device GPU, thermal and battery profiling remains unperformed. The existing Core bundle advisory remains. Browser tests of auth and generation use provider fixtures; passing them does not establish real mailbox delivery or a completed production AI run. Focus data is local to a device/origin, not synced between accounts or tabs. Export JSON before clearing browser storage.

## Files

Created: `src/components/examples/FocusWorkspace.tsx`, `src/hooks/useFocusTasks.ts`, `src/pages/FocusExample.tsx`, `src/styles/refinement.css`, `scripts/package-focus-example.ts`, `public/examples/focus-source.zip`, and this report.

Modified: `package.json`, `src/app/App.tsx`, `src/components/3d/nexyral-core/CoreEngine.tsx`, `src/components/3d/nexyral-core/NexyralCore.tsx`, `src/components/3d/nexyral-core/NexyralScene.tsx`, `src/components/navigation/Navbar.tsx`, `src/components/ui/Primitives.tsx`, `src/main.tsx`, `src/sections/FinalCTA/FinalCTA.tsx`, `src/sections/Hero/Hero.tsx`, `src/sections/Showcase/Showcase.tsx`, `src/styles/showcase.css`, `src/styles/typography.css`, and `tests/cloud/home.spec.ts`.

The final mobile navigation change was followed by a targeted passing recheck: clicking the current page closes the menu, and Escape returns focus to the toggle.

Published Cloudflare version: `b18e1dd2-8ee7-4fed-be55-01d3841f077b`.

Public browser checks passed at 390px and 1280px in both themes: actual Core rendering, tasks saved across reload, and no page overflow or page errors. HTTPS asset requests used Node’s configured trusted proxy CA, without disabling TLS validation. Final HTTP checks verified Home, the example route, the health endpoint, the expected main asset version, and an exact SHA-256 match between the published ZIP and the verified source archive.
