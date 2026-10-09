# Step 15: HTTPS validation and backend launch handoff

The user confirmed the free VM has not been created. No hosting account was
provisioned, no backend deployed and no public TLS claim made. The Vercel demo
and frontend/Core identity remain unchanged.

Added an eight-check anonymous HTTPS command for the eventual backend. It checks
app/security headers, API health, anonymous session, private project rejection,
foreign-Origin rejection, separate preview health, denied preview account routes
and invalid grant protections. It makes no authenticated requests, creates no
accounts/projects/runs and consumes no valid grants. TLS verification stays on,
redirects are not followed, and responses have bounded time/size. Results do not
print bodies, cookies, credentials or redirect targets. Exit code is nonzero
when configuration or any check fails.

Local TLS regression tests exercised actual API and preview servers through a
TLS proxy fixture, trusting only its temporary certificate. They verified all
eight checks pass and no users/runs are inserted, and verified failure on an
untrusted certificate, a redirect, oversized output and preview misrouting.
These fixtures prove the checker, not public DNS, certificates or deployment.

Created:

- `server/https-smoke.ts`, `server/https-smoke.test.ts`
- `scripts/https-smoke.ts`
- `docs/HTTPS_VALIDATION.md`, this report

Modified:

- `package.json`: added `smoke:https`
- `docs/FREE_HOSTING.md`, `docs/BACKEND_HOSTING.md`: documented hosted checks
- `docs/API_CONTRACT.md`: corrected outdated schema, recovery, backup, bounded
  repair/browser-check descriptions and proxy identity configuration

No npm dependencies added. Node24.19+ and OpenSSL are present in this instance;
OpenSSL generates isolated test certificates, not production certificates.

Checks executed:

- `node --test server/https-smoke.test.ts`: 2 passed, zero failed/skipped.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `npm run preflight:backend`: passed against the ordinary local build/database.
- Regenerated source-only package: checksum and 197 safe entries passed inspection.
  A clean extraction passed `npm ci`, lint, TypeScript/production build, both
  HTTPS tests and preflight with a fresh private database directory.

The reusable HTTPS command and its limits were saved in the cloud startup
instructions, preserving existing installation/network/credential settings.
Review and save the draft in environment settings, then publish the environment
to retain the setup changes. Draft saving did not deploy or publish services.

The existing lazy 3D size advisory remains (917.50KB / 243.26KB gzip). No frontend
UI changed; the previous browser results are not represented as new runs.
The full backend suite's previous 47 passing tests are also not a new result
for this milestone. Only the new TLS regression suite was run here.

Next: create an eligible free Ubuntu VM using FREE_HOSTING.md and configure its
app/preview DNS hostnames, then run the new command and complete authenticated
persistence, ownership, recovery and off-machine restore checks described in
HTTPS_VALIDATION.md. Full worker/model provisioning is a separate reviewed step;
the initial VM installer keeps workers/build execution off. No provider capacity,
permanent free pricing, SSH access or remote readiness has been verified.
