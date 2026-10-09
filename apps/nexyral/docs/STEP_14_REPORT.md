# Step 14: trusted proxy limits and deployment preflight

Authentication and account recovery now identify clients through an explicitly
trusted local proxy. Forwarded headers from other peers are ignored. Trusted
peers must supply exactly one literal IP; malformed values/chains are rejected.
IPv6 spelling variants and IPv4-mapped addresses are normalized. The API refuses
an externally bound listener when proxy trust is enabled. Caddy replaces the
forwarding header and preserves Host, including a custom port. The VM installer
and environment template enable trust only for the local Caddy peer.

Compiled service startup runs deployment preflight before starting children.
Checks cover Node24.19+, required build/dependency files, ordinary workspace
output, production HTTPS origins, preview separation, recovery origin, private
writable database storage, supported schema and SQLite integrity. Optional
workers additionally require the installed local model and configured executor
image when builds are enabled. Unsupported databases are not migrated by this
check. `npm run preflight:backend` provides a standalone operator command.

A real Caddy HTTP fixture exposed a Host-port omission in the template. The
same investigation confirmed Node fetch did not send the explicit Host needed
for preview readiness. Both were fixed; readiness now uses Node HTTP/HTTPS
requests with an explicit Host and bounded cancellation.

Created:

- `server/proxy-address.ts`, `server/proxy-address.test.ts`
- `server/deployment-preflight.ts`, `server/deployment-preflight.test.ts`
- `scripts/deployment-preflight.ts`, this report

Modified:

- `server/app.ts`, `server/index.ts`
- `server/service-supervisor.ts`, `server/service-supervisor.test.ts`
- `scripts/services.ts`, `package.json`
- `deploy/Caddyfile`, `deploy/backend.env.example`, `deploy/bootstrap-free-vm.sh`
- `docs/BACKEND_HOSTING.md`, `docs/FREE_HOSTING.md`, `docs/SERVICES.md`

No dependencies added. Existing source-only archive/checksum regenerated.

Verified in this cloud instance:

- Lint, TypeScript and ordinary production build passed.
- Final full API suite: 47 passed, zero failed/skipped.
- Final lifecycle regression suite: 4 passed, including explicit preview Host.
- Recovery/workspace browser suite: 6 passed, including actual isolated build
  evidence, both workspace themes, account reset and new-password sign-in.
- Standalone preflight passed against the current ordinary build/database.
- Production-configured compiled service smoke with a disposable private DB:
  preflight, API health, static React output, public-host preview readiness and
  SIGTERM shutdown passed; both owned listener ports closed. Worker stayed off.
- Real pinned Caddy HTTP fixture replaced a forged X-Forwarded-For value and
  preserved app/preview Host ports. The fixture and owned container were removed.
- Ubuntu installer syntax passed (`bash -n`); provisioning was not executed.
- Source archive checksum and 192 allowlisted entries passed inspection; no
  runtime data, dependency caches, Git credentials or symlinks were included.
  A clean extraction passed `npm ci`, lint, TypeScript/production build and
  preflight with a fresh private database directory.

Limitations: public DNS, TLS issuance, actual VM installation and remote account
behavior remain unverified. No VM has been created and no backend published.
The existing Vercel demo is unchanged. Oracle Always Free remains conditional
on eligibility/capacity and provider pricing verification. This prepares source
for hosting; it is not a guarantee of free compute or a completed deployment.
Rate limits remain per-process and reset on restart; distributed limits and
arbitrary proxy chains are outside this configuration. Email delivery and full
worker provisioning remain separate steps. The lazy 3D chunk-size advisory and
test-runner color warnings remain. Caddy reports the explicit forwarding-header
replacement as redundant with its default behavior; the override is intentional.

Next: provision an eligible VM following FREE_HOSTING.md, validate actual HTTPS,
account persistence and off-machine backup/restore, then provision a separately
reviewed worker/model after inspecting pending queues.

Reusable cloud startup instructions were saved in the environment draft; existing
installation, networking and credential requirements were preserved. Review and
save the draft in environment settings, then publish the environment to retain
the updated setup. Saving the draft did not deploy services or publish a snapshot.
