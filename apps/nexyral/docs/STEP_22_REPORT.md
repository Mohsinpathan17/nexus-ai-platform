# Step 22 — Real account-provider foundation and AWS activation

## Outcome

Implemented configurable GitHub account signup/sign-in, explicit linking from
an existing signed-in email account, SMTP verification and recovery delivery,
and a configured real support mail link. These providers remain disabled until
server settings are supplied. No AWS resource was created, provider registered,
real email sent, public backend deployed, repository pushed or website republished.
The existing static Vercel demo is unchanged and disables account services.

GitHub requests identity/email scopes only, requires a verified primary email,
uses state bound to a browser nonce plus S256 PKCE, and discards provider tokens.
Matching email alone cannot silently merge accounts. Linking checks the
initiating session again after asynchronous exchange. SMTP uses verified TLS on
465/587, bounded timeouts and server-only credentials. Email tokens are hashed,
single-use and expire; recovery revokes prior sessions and preview grants.
Configured email verification gates project writes, including legacy accounts.
Signup SMTP failure keeps the account and reports that verification needs retry.
Support mail uses a real configured mailbox via mailto; SES sending does not
create a receiving inbox or a contact ticket system.

Schema7 is additive. Older v4–v7 backups are accepted; restore revokes grants
and sessions while preserving GitHub identities and verified-email records.
The existing private database was preserved. Back up before production migration;
older servers cannot reopen an upgraded v7 database.

## Created files

- server/github-auth.ts
- server/account-mail.ts
- server/account-integrations.test.ts
- src/hooks/useProviders.ts
- src/pages/VerifyEmailPage.tsx
- src/pages/workspace/AccountConnections.tsx
- tests/account-integrations.spec.ts
- docs/ACCOUNT_PROVIDERS.md
- docs/STEP_22_REPORT.md

## Modified files

- package.json, package-lock.json
- shared/contracts.ts
- server/auth.ts, server/app.ts, server/index.ts, server/database.ts
- server/backups.ts, server/deployment-preflight.ts
- server/backups.test.ts, server/retention.test.ts, server/deployment-preflight.test.ts
- src/app/App.tsx
- src/pages/AuthPage.tsx, src/pages/RecoverPage.tsx
- src/pages/ContentPage.tsx, src/pages/GettingStartedGuide.tsx
- src/pages/workspace/WorkspaceLayout.tsx
- src/components/navigation/Footer.tsx
- deploy/backend.env.example
- docs/API_CONTRACT.md, docs/ACCOUNT_RECOVERY.md
- docs/RECOVERY.md, docs/AWS_LAUNCH.md

Runtime dependency: nodemailer ^10.0.16. Development types: @types/nodemailer
^8.0.2. All other frontend libraries are retained.

## Validation

- npm ci --cache /tmp/nexyral-npm: passed with the updated frozen lockfile.
- npm run lint: passed.
- npm run typecheck: passed.
- npm run build: passed, including compiled server output.
- node --test server/account-integrations.test.ts server/backups.test.ts:
  8 passed, 0 failed on final code.
- npx playwright test tests/account-integrations.spec.ts tests/recovery.spec.ts
  tests/guide.spec.ts tests/workspace.spec.ts: 14 passed, 0 failed.
- npm run preflight:backend: all four readiness checks passed.
- npm run test:api: final full rerun passed 66 tests, 0 failed, 0 skipped.

Browser cases cover 375px/1440px light/dark signup, explicit verification,
GitHub linking/sign-in, recovery email/reset, overflow and page/console errors.
Screenshots artifacts/accounts-{375,1440}-{light,dark}.png were generated;
375 light and1440 dark were visually inspected. Provider exchange and mailbox
delivery are controlled fixtures, not live external-service validation. Existing
workspace tests exercise real isolated Docker builds and browser evidence.

Initial browser attempts exposed a fixture redirect-interception issue and a
real same-page recovery URL-fragment bug. The fixture now preserves server
cookies and redirects to a local controlled callback without disabling TLS;
recovery/verification capture fragment changes and remove tokens from the URL.
The full selected browser rerun then passed. An initial dependency install
failed on the unavailable default cache; the supported /tmp cache fixed it.

Remaining build advisory: the lazy 3D bundle is917.50KB (243.26KB gzip). The
main bundle is499.42KB (154.46KB gzip). No lint/type errors were reported.
Mail has no durable queue, delivery/bounce webhooks or automatic retries. OAuth
state/rate limits are process-local. Accounts are single-instance and the
existing same-host Docker beta still needs stronger tenant isolation before
broad public arbitrary-code use. No final pricing or billing is implemented.

## AWS and provider activation

Follow ACCOUNT_PROVIDERS.md and AWS_LAUNCH.md: sign in to AWS yourself, use MFA
and appropriate IAM access, verify CloudShell identity, select region/domain
and budget, deploy the reviewed HTTPS host, register the GitHub OAuth callback,
verify SES sender/DNS, request SES production access when needed, securely
configure SMTP credentials, and provision a receiving support mailbox/MX.
Then exercise real sign-in, email inbox delivery and recovery before invitations.
An AWS account ID alone is not deployment access. No functional AWS profile
or live account-provider credentials were available here.

Cloud environment draft saved updated startup instructions for schema7 and
provider fixtures plus additive api.github.com network access, preserving
existing domains and setup script. Review/save environment settings and publish
the cloud environment to activate its saved configuration; this does not
publish the website or provision AWS. Fresh-environment restoration was not tested.
