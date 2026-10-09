# Service lifecycle

From `apps/nexyral`, use `npm run dev` for watched API + separate preview service
+ Vite. `npm run dev -- --host 0.0.0.0` remains supported. Vite uses strict port
selection to fail rather than silently moving to a different port.

After `npm run build`, `npm run services` starts the compiled API (also serving
`dist`) and compiled separate preview process. It runs `preflight:backend` checks
before spawning children; a failed prerequisite exits nonzero. The standalone
command is available for operator diagnostics. It checks local build/configuration
and database prerequisites, not public DNS/TLS or a complete remote deployment.
All children inherit the same
`NEXYRAL_DB_PATH`. The supervisor waits for HTTP readiness, stops companions on
unexpected exit, and gives owned process groups five seconds to stop gracefully
before a forced stop. It never searches for or kills unrelated processes, never
resets databases and does not automatically restart failed workers/runs. A
startup failure returns nonzero. SIGINT/SIGTERM stops the owned group.

Workers are off by default. To include a worker, set `NEXYRAL_START_WORKER=1` and
`NEXYRAL_PLANNING_MODEL` for an installed local model. Existing pending runs may
be processed: inspect queues before deliberately enabling this option. Builds
still require `NEXYRAL_ENABLE_BUILDS=1`, the executor image and exact owner plan
approval. Optional worker startup verifies the model/image as before; an early
worker exit stops the companion processes rather than masking failure.

Production still requires a TLS reverse proxy, distinct app/preview hostnames,
explicit origins and durable protected database storage. The supervisor does
not install TLS, orchestrate distributed workloads, enable account recovery or
publish a backend. Preview readiness uses the configured Host header so a local
probe can validate a service configured for a public preview hostname. Avoid
proxy logs containing preview grant paths. See WORKER.md and RECOVERY.md.

The Vercel site is a separate static public demo. Its account/worker boundary
remains explicitly unavailable; service commands apply to the local workspace.
