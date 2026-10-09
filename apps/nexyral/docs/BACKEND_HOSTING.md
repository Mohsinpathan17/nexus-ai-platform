# Backend hosting preparation

For the AWS path, use [AWS launch instructions](AWS_LAUNCH.md) and
`deploy/aws/cloudformation.json`. This includes billable-resource review,
private release transfer, Session Manager access and staged worker activation.

This step prepares configuration; it does not deploy the backend or issue public
certificates. The Vercel site hosts the static demo only. The current complete
backend needs a long-running Linux host with Node24.19+, durable private SQLite
storage, Docker for isolated verification, and local Ollama for planning/builds.
A static/serverless hosting deployment is not equivalent to that environment.

Use `deploy/backend.env.example` as a reviewed service-manager environment
example. No dotenv dependency or automatic file loader was added. Configure
real app/preview hostnames with DNS pointing at the host; replace reserved
example names. `NEXYRAL_APP_ORIGINS` and `NEXYRAL_PREVIEW_ORIGIN` require HTTPS
and different hostnames. Both backend listeners stay on loopback. Firewall
external access to the API/preview ports and Docker socket. Expose only the TLS
proxy, and persist Caddy certificate state privately.

`deploy/Caddyfile` routes the app hostname to the API (including static React
assets and SSE) and the distinct preview hostname to the grant-based preview
service. It preserves Host, disables SSE buffering and adds HSTS. Access logs
are omitted to avoid retaining bearer grant paths. Do not enable request/debug
logging of recovery request bodies or preview URLs. Caddy's automatic public
TLS needs working DNS, ports80/443 and certificate-authority access on the
actual host. These prerequisites have not been exercised in this cloud task.

The template was formatted and validated offline using the official image:
`caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`.
An HTTP fixture also exercised the actual proxy: forged forwarding headers were
replaced with the connecting client's address, and app/preview Host headers
retained their ports. This does not prove public certificates or remote routing.
Existing CSP, preview sandbox, Secure cookies and Origin/CSRF protections remain.

Set `NEXYRAL_TRUSTED_PROXIES=127.0.0.1` only with this controlled local proxy and
the loopback API listener. Authentication/recovery limits then use the single
literal IP supplied by the proxy. Untrusted peers cannot override their socket
address; chained/malformed forwarded addresses are rejected for trusted peers.
Equivalent IPv6 and IPv4-mapped addresses share a limit identity. Leave this
setting empty for direct local development. CIDRs, arbitrary proxy chains and
other forwarding headers are not supported. Do not put another proxy/CDN in
front without reviewing its topology: this configuration uses Caddy's direct
peer address. Limits are per-process, reset on restart, and are not distributed.

Build the ordinary workspace (`npm run build`), not `build:demo`, then run
`npm run preflight:backend` with the reviewed service environment. It checks
Node/build prerequisites, rejects public-demo output, checks production origins
and proxy listener settings, and checks private database permissions, supported
schema and SQLite integrity. An absent database is allowed only inside an
existing writable private directory. Existing unsupported schemas fail without
migration. Optional workers require an installed local model and, when builds
are enabled, the executor image. Preflight does not validate DNS, certificates,
email delivery, tenant isolation or actual generated software behavior.

`npm run services` repeats preflight before starting any compiled children.
Readiness probes explicitly send the preview Host header, including its port.
This serves `dist`
from the API plus the separate preview process. Workers are off by default;
inspect pending queues before enabling `NEXYRAL_START_WORKER=1`, configure the
installed model and verified executor image, and preserve explicit owner plan
approval. Perform a consistent private backup before switching databases.

Before accepting remote users, verify actual public HTTPS health, signup/login,
Secure cookies, cross-owner rejection, SSE, logout revocation, isolated preview
grants, source export, and backup/restore from the chosen host. Email recovery
remains operator-assisted until a delivery provider is connected. The cloud
execution container and Docker boundary are not a certified tenant sandbox.

`npm run smoke:https -- <https-app-origin> <https-preview-origin>` checks the
anonymous HTTPS surface without creating accounts or runs. It rejects redirects,
untrusted TLS and incorrectly routed preview services. See HTTPS_VALIDATION.md
for the scope and remaining authenticated/persistence/recovery checks.
