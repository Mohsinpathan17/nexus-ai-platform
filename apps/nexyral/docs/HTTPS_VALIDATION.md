# Validate a hosted backend

Run from `apps/nexyral` with Node24.19+ after the VM is provisioned and DNS/TLS
are working. The public Vercel website is a static demo and cannot pass these
backend checks. Use the actual backend app and distinct preview origins.

```sh
npm run smoke:https -- https://app.your-domain.com https://preview.your-domain.com
```

The command runs eight anonymous checks: application/CSP/HSTS, API health,
anonymous session, denied project access, rejected foreign-Origin login,
separate preview health, denied preview account routes, and denied invalid
preview grants with restrictive sandbox/error headers. An empty foreign-Origin
login request is rejected before authentication; no credentials are supplied.
No accounts, projects, worker runs or valid grants are created or consumed.

All checks must pass for exit code0. Each request has an eight-second timeout
and a 256KiB response-body limit. Redirects are not followed, so a wrong route
or redirect to the static demo cannot count as success. HTTPS certificate
validation stays enabled; `NODE_TLS_REJECT_UNAUTHORIZED=0` is refused. The command
supports the environment's configured network proxy through Node's
`--use-env-proxy`. A network-policy rejection is not proof of a backend defect.
It prints named outcomes, not response bodies, cookies or redirect targets.

Local regression tests use actual API/preview servers behind a TLS fixture.
An ephemeral certificate is explicitly trusted through `NODE_EXTRA_CA_CERTS`;
verification is never disabled. Tests reject an untrusted certificate, redirect,
oversized response and preview origin accidentally routed to the account API.
OpenSSL is required to generate the temporary test certificate. Temporary keys,
servers and the in-memory fixture database are removed afterward.

Passing the command demonstrates anonymous routing and response protections at
that moment. It does not validate account persistence, Secure session cookies,
CSRF for authenticated actions, SSE, real generated previews, disaster recovery,
certificate renewal, production load or tenant isolation.

Before inviting users, complete these checks on the actual VM:

1. In the backend browser UI, create a controlled test account and project.
   Check Secure/HttpOnly/SameSite session attributes without copying cookie
   values into logs. Refresh and sign in again: the project must persist. With
   the initial worker-disabled installer, a run should report no executor;
   it must not fabricate a successful build.
2. Use a separate browser profile/account to verify that another owner's direct
   project/run/artifact access is denied. Logout must revoke the first session,
   and authenticated mutations must require the expected Origin and CSRF token.
3. Follow ACCOUNT_RECOVERY.md to exercise verified-owner recovery and subsequent
   login on the VM. Deliver the private link through a trusted channel; email
   delivery is not automated. Confirm old sessions are revoked.
4. Follow RECOVERY.md to take a consistent backup, protect a copy off-machine
   and restore to a new private database path. Validate restored evidence before
   selecting it; never overwrite the running database or start queued workers
   during the recovery drill.
5. After a separately reviewed Docker/model worker setup, explicitly approve a
   bounded plan and inspect actual check evidence. Then verify SSE, source
   export, a successful separate-origin preview, and revocation/expiry. These
   checks remain pending while the worker is disabled; preview health alone
   does not prove generated output works.

The user confirmed no VM exists yet. This guide and the local TLS fixture are
prepared; remote execution, public certificates and deployment remain untested.
