# Step 12: interactive Core design and service lifecycle

The hero now presents a layered six-sided computational stack with separated
structural ribs, luminous rails, orbital segments and stage nodes. Intent,
Plan, Build, Verify and Ship have keyboard-accessible controls, selected-state
labels, corresponding node/connection highlights, and live explanatory copy.
The scene is explicitly a system model, not real worker telemetry. Theme-aware
materials give light mode porcelain surfaces and dark mode titanium. Editorial
headline treatment and a restrained coordinate grid connect the scene with the
website identity. Screenshots were inspected in both themes and on mobile;
lighting was adjusted after the first inspection.

Continuous rendering pauses when the Core leaves the viewport or the document
is hidden. Reduced motion remains a stable demand-rendered scene. Mobile DPR,
WebGL fallback, lazy loading, limited geometry and particle counts are preserved.
No heavyweight shader, new animation library or npm dependency was introduced.

Added a service supervisor for API, preview and development frontend. It checks
HTTP readiness, stops companion process groups after unexpected failures,
bounds graceful/forced shutdown and returns nonzero on startup failure. Workers
remain opt-in. Database resets, automatic run retries and unrelated-process
termination are absent. Compiled service startup was exercised with a separate
temporary fixture database and API/website/preview requests, then stopped cleanly.

Created: `src/styles/core.css`, `server/service-supervisor.ts`,
`server/service-supervisor.test.ts`, `scripts/services.ts`, `docs/SERVICES.md`,
this report. Modified: all Core modules except the standalone fallback structure,
`src/main.tsx`, `server/dev.ts`, `package.json`, `tests/site.spec.ts`,
`scripts/deploy-demo.ts`. The deploy helper can reuse only recorded NEXYRAL demo
project metadata and stores selected non-secret deployment fields. It uploads
only static public-demo output. Account and worker services remain local.

Validation/results and publication are recorded below after completion.
Existing 3D chunk advisory remains: lazy Core chunk is 917.50 KB / 243.26 KB
compressed, a small increase for the added interaction. Physical-device GPU
profiling, certified workload isolation, TLS backend hosting and account recovery
remain future work. Next: account recovery and backend hosting preparation.

Final checks: lint, TypeScript, standard production build and public-demo build
passed. All 21 browser tests passed, including ten theme/viewport layouts,
keyboard Core selection under reduced motion, WebGL/fallback, mobile navigation,
and five authenticated-workspace flows. Three service lifecycle tests passed;
compiled startup/API/static website/preview health/shutdown smoke passed using
an isolated database. No new npm dependencies were installed.

The existing Vercel demo project was updated. Vercel reports READY; Home,
Product and Get Started return public HTTP 200. Public JS/CSS asset hashes match
the checked build. Public-deployment browser smoke uses proxy-fetched HTTPS
responses because this cloud browser requires the network proxy; it exercises
actual deployed assets rather than local dist. Updated cloud startup instructions
were saved as a review draft, not published.
