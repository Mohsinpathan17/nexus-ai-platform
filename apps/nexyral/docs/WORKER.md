# Local planning and approved frontend builds

The worker uses a local Ollama model. No paid API key is required; model licenses and local hardware costs still apply. Public-site walkthroughs remain simulated.

## Start the local services

Node 24.19+ and the API are required. Ollama **0.40.0** is installed at `/workspace/tools/ollama/bin/ollama`. Its archive passed the official release SHA-256 check. Models live at `/workspace/tools/ollama/models`. Start the service separately:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MODELS=/workspace/tools/ollama/models OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 /workspace/tools/ollama/bin/ollama serve
```

Ollama creates its local identity in standard `~/.ollama`. That directory was initialized with granted filesystem access; no identity or secret values belong in repository files. Do not repurpose HOME or disable TLS validation. Live processes must restart in new environments.

The **qwen2.5-coder:1.5b** Q4_K_M model is now installed and was used for real inference. Native `ollama pull` still fails during redirect DNS validation in this cloud machine. The working route uses verified HTTPS downloads from the official registry and a supported local `ollama create` import:

```sh
cd /workspace/nexus-ai-platform/apps/nexyral
python3 scripts/install-local-model.py
```

The helper pins the official manifest and checks every weight/template/system/license digest before import. It reuses the verified import cache under `/workspace/tools/ollama/import-source`. The runtime identity of the locally imported model can differ from the published tag because local import metadata differs; the underlying weight SHA-256 remains `29d8c98fa6b098e200069bfb88b9508dc3e85586d20cba59f8dda9a808165104`. No TLS or checksum checks were bypassed. This small CPU model is a development option, not a production quality guarantee.

From `apps/nexyral`, planning-only startup is:

```sh
NEXYRAL_PLANNING_MODEL=qwen2.5-coder:1.5b npm run worker
```

The worker checks `/api/tags` and refuses to claim pending runs if the configured model is absent. `NEXYRAL_DB_PATH` must match the API; default `.data/nexyral.sqlite`. `NEXYRAL_OLLAMA_ORIGIN` accepts only loopback HTTP origins; default `http://127.0.0.1:11434`. Development does not automatically start the worker or download models.

## Enable frontend builds explicitly

Docker is optional for the website and planning, required for this executor. The tested image is pinned by digest:

```sh
docker pull node:24.19.0-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
NEXYRAL_ENABLE_BUILDS=1 NEXYRAL_PLANNING_MODEL=qwen2.5-coder:1.5b npm run worker
```

The worker inspects the local image before advertising build capability. Containers use `--pull never`; they never download an image while handling a user's build. After `npm run build`, the compiled equivalent is `npm run start:worker` with the same variables. A live builder lease is required to approve a plan; a planning-only worker cannot authorize builds.

This executor supports a **small client-side React frontend** using existing React, TypeScript and Vite dependencies. Backend services, authentication in generated applications, arbitrary repositories, new dependencies, application tests and deployment are not implemented. The approval control explains these limits. Acceptance criteria remain proposed requirements, not measured test results.

## Lifecycle and evidence

Schema v3 adds worker capabilities without replacing user data. Pending intents are claimed oldest first, one at a time. Starting the worker may send all pending intents to the local service; cancel unwanted intents before startup.

Planning records `worker.started`, requests schema-constrained JSON, validates the bounded response, and stores `engineering-plan.json` at `awaiting_approval`. Owner approval requires Origin/CSRF protection and an exact stored artifact ID. It records an immutable snapshot, SHA-256, owner and timestamp as `approved-plan.json`, then queues stage `build`. Repeating the same approval is idempotent. Clients cannot mark checks passed.

The model supplies only App.tsx and CSS. Trusted code creates the React entry, HTML, TypeScript config and package manifest; model-provided paths, scripts and build config are never used. TypeScript and Vite run as a non-root user in the pinned Docker image, with network disabled, root read-only, all capabilities dropped, no privilege escalation, PID/CPU/memory limits, and bounded temporary storage. Only the run's temporary workspace is writable; dependencies are mounted read-only. Repository files, account databases, model files, Docker sockets and credentials are not mounted into the container.

Verification stores `frontend-source.json` and `verification.json`: actual check names, exit codes, bounded output, image digest, source hash and approved-plan hash. Both checks must exit zero for `succeeded` at `verify`. Failures preserve source and actual output when available. Temporary workspaces are removed; successful bounded preview assets are retained subject to quota/TTL and may be rendered in owner-only sandboxed frames. Stored source can be downloaded. Generated applications are not publicly deployed.

If compilation fails, generation can make **one** bounded repair request using the actual compiler output and unchanged approved scope. Verification retains both attempts' check results, output and source hashes. A failed repair request preserves the first measured failure; failed repairs never become successful runs. If the shared deadline/cancellation aborts work, no late artifacts are committed.

The lease expires after 15 seconds, renewing during work. Takeover marks interrupted running work failed without retry. Cancellation aborts the model request, cleans up the container, and blocks late artifact persistence. Inference servers may continue internal computation after HTTP cancellation. Planning has a two-minute deadline; generation plus compilation has a four-minute deadline. Logs are bounded to 64 KB. Temporary workspaces are removed after completion, failure or cancellation. Shutdown aborts active work and releases the lease.

## Real-model verification

The model generated a counter proposal and React source through an isolated database's real account/project/run flow. After explicit approval of the exact proposal, the generated frontend passed actual Docker TypeScript checking and Vite compilation. Earlier malformed planning output and a failed HTML-fragment build were kept as failures. Another proposal invented backend requirements; it was rejected and cancelled before build. Schema constraints improve structure but do not prove a proposal is correct.

A separate browser smoke check reconstructed the exact stored source, verified its recorded SHA-256, compiled it inside the same Docker boundary, and tested initial zero, Increment, Reset, Enter/Space controls and overflow at375/768/1440px. Its temporary loopback server had no API or credentials; CSP and request interception blocked outside networking. No page errors or external requests were observed. This is a targeted test of one counter, not a general generated-application test runner or accessibility certification. The worker's `testsRun:false` remains accurate because that check ran separately.

Reproduce with:

```sh
node scripts/local-model-smoke.ts plan
# Inspect artifacts/local-model-plan.json before approving the synthetic test proposal.
node scripts/local-model-smoke.ts build --approve-smoke-plan
node scripts/check-generated-counter.ts
```

The smoke script creates a separate `.data/local-model-<uuid>.sqlite`; it never processes existing user projects. Latest evidence is under `artifacts/local-model-evidence.json`, `local-model-source.json` and `local-model-counter-check.json`. These files and databases are ignored by Git. A fresh plan phase is required before another build phase. Local inference is intentionally excluded from ordinary deterministic tests.

The download host `dd20bb891979d25aebc8bec07b2b3bbc.r2.cloudflarestorage.com` now responds successfully through HTTPS. Native pull's DNS issue remains diagnosed; the verified import path works. Existing official-domain network settings were preserved. Startup instructions were updated in an unpublished environment draft; saving does not publish the environment.

This Docker foundation is not a certified multi-tenant sandbox. Add quotas, supply-chain review, stronger workload isolation, a general generated-app test runner, plan revisions and backups before commercial use. Deployment approval remains a separate future capability.

## Owner-selected behavior checks

An owner may revise a proposal to include `behaviorChecks` before approving it. The bounded contract supports exact-name button clicks, exact-name textbox fills and exact visible-text assertions. Maximum: eight checks, twelve steps per check, at least one assertion each. No executable JavaScript, URLs, selectors or shell commands are accepted. Existing plans without checks continue to compile with an explicit `not_run` behavior report.

After TypeScript and Vite pass, the worker runs a trusted Playwright harness inside the same pinned, non-root, network-disabled Docker image. Chromium at `/usr/lib/chromium/chromium` and its `ldd`-resolved system libraries, `/etc/fonts`, `/usr/share/fonts`, and `/usr/share/fontconfig` are mounted read-only. Full development dependencies are required, including Playwright; an install omitting devDependencies does not support this worker. No host credentials, database or Docker socket is mounted. Chromium uses `--no-sandbox` inside the Docker isolation boundary, not as a host application runner. Each check uses a fresh context, blocked external requests, disabled service workers and a local static server with restrictive CSP. Each action has a 1.5-second timeout; browser execution is bounded to 60 seconds and the whole build retains its worker deadline. A timeout or missing browser produces `not_run`, keeps `testsRun=false`, and fails verification when checks are required.

The build copies `behavior-harness.mjs` into `server-dist/server`, so source and compiled workers use the same trusted harness. The legacy Linux browser mount fallback is environment-specific; the bundled image described below removes those mounts. Hardened multi-tenant execution remains future work. No browser behavior checks means compile-only success, not tested application behavior. The one bounded repair can use measured behavior failures as well as compiler failures; prior attempts remain recorded in evidence output.

## Durable previews and source exports

After successful verification, `verifyFrontend` captures the compiled JavaScript entry and CSS referenced by the trusted Vite HTML before deleting the temporary workspace. The worker commits `frontend-preview.json` in the same SQLite transaction as source and verification, with `previewSha256`, `sourceSha256` and the approved-plan digest. Failed, cancelled or interrupted runs never commit a preview. Capture is bounded to one JavaScript entry, up to four stylesheets, and 2 MB of combined asset text. Capture failure leaves the measured verification intact and explicitly notes that no preview was retained.

The API, worker and separate preview service must share the existing SQLite database. Step 10 adds grant/retention tables through an additive v4 migration. Back up the database and its WAL consistently to retain outputs. Old records remain readable, but their discarded bundles cannot be previewed without a new, separately approved run.

Previews are owner-only sandboxed documents, not deployed sites. They render local state from retained code; closing, resetting or reopening discards that state. Remote APIs, external images/fonts and multi-chunk dynamic imports are outside this preview format. Sandboxing and CSP protect workspace access, but browser resource management and broader operational hardening are still needed before hosting arbitrary multi-tenant workloads. CSP does not establish a universal navigation firewall.

Source export uses fixed safe USTAR paths, validates evidence digests, and includes the complete stored scaffold plus approval/evidence. It does not execute exported code. No generated dependency lockfile is included; a fresh installation is not claimed reproducible or verified. Existing builds resolved dependencies from the worker installation. Review exported code and evidence before using it elsewhere.

## Separate preview service and retention (Step 10)

The workspace API no longer serves executable preview HTML. Owners mint a
single-use 60-second grant via `POST /api/runs/:id/preview-access`, protected by
session, ownership, Origin and CSRF checks. Only the grant hash is stored.
`npm run dev` starts the API, Vite and a separate preview service. Compiled
startup uses `npm start` and `npm run start:preview`, sharing `NEXYRAL_DB_PATH`.
Default preview origin is `http://127.0.0.2:8788`; production requires HTTPS and
a hostname different from every `NEXYRAL_APP_ORIGINS` entry. Set
`NEXYRAL_PREVIEW_HOST` for the proxy-facing listener and preserve the configured
Host header. Avoid logging grant paths in reverse-proxy access logs.

Preview HTML retains an opaque `sandbox="allow-scripts"` frame, restrictive CSP,
no-store and no-referrer headers. No workspace session cookie is required by
this service. Grants bind to the owner session and are revoked by logout. The
iframe announces readiness through a message whose source and opaque origin
are checked by the workspace; a timeout offers retry rather than false success.
A separate origin is an additional boundary, not a certified tenant sandbox.

New previews default to seven-day retention, five retained previews per owner,
and 10 MB total payload per owner. Configure `NEXYRAL_PREVIEW_TTL_HOURS`,
`NEXYRAL_PREVIEW_MAX_PER_OWNER`, and `NEXYRAL_PREVIEW_MAX_BYTES_OWNER`. Admission
is atomic with evidence persistence. Quotas do not evict older previews. A
60-second service sweep removes only expired managed preview payloads/grants;
source, approval and verification evidence remain. Legacy previews are counted
against quotas but never retroactively scheduled for removal. Database v4
migration is additive. Retention notices appear in the workspace outputs.

## Self-contained execution image

Run `npm run build:executor` with Docker available. The build pins the Node base
digest, installs Chromium and fonts from signed Debian repositories over HTTPS,
and records the resulting immutable local image ID in ignored
`.data/execution-image.json`. A browser-binary probe must succeed before that
record is written. The worker also probes a bundled browser before claiming
work when builds are enabled. Package updates are not pinned to a snapshot;
future rebuilds may have different image IDs and browser versions.

The build uses the environment's public CA bundle and configured proxy, with
build-only proxy hostname resolution. It does not copy proxy credentials into
Dockerfile instructions or disable trust checks. The image contains browser
libraries and fonts, so behavior verification does not require host browser
mounts. Compiler/Playwright dependencies still come from the project's locked
installation, mounted read-only. No database, secret, or Docker socket is
mounted into execution containers. Legacy Node-image execution remains a
fallback when no descriptor exists. Production distribution, image provenance,
updates and stronger workload isolation remain future work.
