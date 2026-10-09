# Step 13: operator-assisted account recovery and HTTPS hosting preparation

Account recovery now has a dedicated React route, password confirmation,
understandable errors, completion/sign-in state, and a login-page entry point.
Links use a URL fragment removed after loading. Public-demo builds disable the
form and collect no recovery inputs. No automatic email delivery is claimed.

A local operator command issues 15-minute, single-use, 256-bit recovery grants
only after the operator verifies ownership. The command writes the link into a
private ignored file and prints its path, not its token. SQLite stores hashes
only. The Origin-protected, rate-limited reset endpoint revalidates the grant
atomically after asynchronous password hashing, changes credentials, revokes
account sessions and associated preview grants, and requires fresh sign-in.
There is no anonymous token-issuance endpoint.

SQLite v5 adds only recovery storage/index. Users and project evidence remain.
Backups support both v4 and v5 and revoke recovery links when restoring v5.
Tests demonstrate v4 backup restoration and additive upgrade, as well as token
expiry, supersession, one-time consumption, racing resets and grant revocation.

Created: `server/password-recovery.ts`, `server/password-recovery.test.ts`,
`scripts/issue-recovery.ts`, `src/pages/RecoverPage.tsx`,
`tests/recovery.spec.ts`, `deploy/Caddyfile`, `deploy/backend.env.example`,
`docs/ACCOUNT_RECOVERY.md`, `docs/BACKEND_HOSTING.md`, this report.
Modified: `server/auth.ts`, `server/app.ts`, `server/database.ts`,
`server/backups.ts`, `server/backups.test.ts`, `server/retention.test.ts`,
`src/app/App.tsx`, `src/pages/AuthPage.tsx`, `package.json`,
`docs/API_CONTRACT.md`, `docs/RECOVERY.md`.
No new npm dependencies. Official Caddy image was downloaded and digest-pinned
for offline configuration validation only; no public proxy service was started.

Validation:

- Full `npm run test:api`: 40 passed, zero failed/skipped.
- Recovery + workspace Playwright suite: 6 passed, including real password reset
  and subsequent login, both workspace themes, and actual isolated build evidence.
- Targeted final recovery tests: 3 passed, including explicit preview-grant revocation.
- Backup compatibility tests: 3 passed.
- Operator CLI smoke: private fragment link, mode600, no token in stdout; its
  synthetic database and private output were removed after verification.
- Lint/TypeScript/standard production build/public-demo build passed.
- Public-demo mobile smoke in both themes verifies no recovery input fields.
- Official Caddy validates the formatted two-host template offline. Public DNS,
  certificate issuance and actual remote TLS routing are untested.

Existing lazy-loaded 3D chunk-size advisory and test-runner color warnings remain.
The Caddy formatting advisory was corrected and validation repeated. The current
workspace dist is rebuilt in ordinary mode after testing the public-demo boundary.

The Vercel public website is unchanged; account/API/worker services were not
published. Automatic email, verified-email enrollment, operator identity policy,
trusted-proxy/per-client rate limiting, remote storage, hosting credentials and
certified tenant isolation remain outstanding. Next: choose backend hosting
scope, address trusted-proxy rate limiting, and verify a real HTTPS deployment.

User chose a free hosting option. Added `scripts/package-backend.ts`,
`deploy/bootstrap-free-vm.sh`, `docs/FREE_HOSTING.md` and `package:backend`.
Generated a source-only deployment tarball/checksum in ignored `artifacts`.
Archive scanning verified 186 safe entries with no runtime data/caches/symlinks;
a clean extracted copy passed `npm ci`, lint and production build. The Ubuntu
VM installer passed `bash -n` only and was not executed. Oracle Always Free is
conditional on account eligibility/capacity; current pricing-page access here
was blocked by HTTP403. No cloud VM or paid resource was created. The initial
installer starts accounts/UI/isolated preview services with workers disabled;
Docker/model provisioning remains a separate reviewed step.
