# Step 23 — Mumbai launch preparation and account-provider gates

## Outcome

Tailored the AWS beta path to the user's India location, no owned domain, and
reported six-month/$100 credit offer. Mumbai/ap-south-1 is the documented starting
region. Credits/expiry/eligible services remain unverified. Added instructions
for two privately controlled free DuckDNS hostnames and an accounts-only
2GiB/t3.small candidate with40GiB encrypted storage and the worker disabled.
The CloudFormation template still defaults to t3.large/80GiB; users must select
the smaller settings deliberately. Neither instance size nor regional AMI has
been benchmarked/validated against a live AWS account here.

The backend now validates supplied provider configuration at startup before
opening SQLite. Partial GitHub settings, insecure/incomplete SMTP settings,
invalid support addresses and mismatched app origins fail with sanitized errors.
Optional providers remain disabled when absent. Setting
NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS=1 requires GitHub, SMTP and a support address.
The deployment preflight includes these checks; `--public-accounts` requires
production origins/providers without making network requests or sending mail.
Configured does not mean credentials, sender authorization or delivery work.

No resources were provisioned, DNS registered, OAuth app created, email sent,
website published, repository committed/pushed, or private database reset.
AWS CLI remains absent and the selected AWS profile is absent in both configured
credential/config files. Git read access was rechecked with git ls-remote origin
HEAD; it does not establish OAuth registration or AWS access.

## Files

Created:
- server/account-provider-config.ts
- docs/AWS_INDIA_QUICKSTART.md
- docs/STEP_23_REPORT.md

Modified:
- server/index.ts
- server/deployment-preflight.ts
- scripts/deployment-preflight.ts
- server/deployment-preflight.test.ts
- deploy/aws/cloudformation.json
- deploy/backend.env.example
- docs/AWS_LAUNCH.md
- docs/ACCOUNT_PROVIDERS.md

No dependencies added; no frontend UI changes.

## Checks executed

- npm run lint: passed.
- npm run typecheck: passed.
- npm run build: passed, client and compiled server output.
- node --test server/deployment-preflight.test.ts server/aws-deployment.test.ts
  server/account-integrations.test.ts:12 passed,0 failed,0 skipped.
- npm run preflight:backend:7 passed; optional providers explicitly reported
  disabled, not connected.
- CLI public-account mode: expected exit1, verified missing GitHub/mail/support
  failures. It is not a successful public-launch readiness result.
- Compiled API startup with controlled partial GitHub settings: expected exit1,
  verified safe error before database startup.
- git ls-remote origin HEAD: passed read-only.
- Release source archive regenerated and checksum/private-file exclusion checked.

The prior Step22 full66 API/14 browser results are documented separately; those
full suites were not rerun for this limited backend/configuration change. New
provider configuration cases exercised real preflight and compiled startup.
No real EC2 provisioning, Session Manager command, DuckDNS registration,
certificate issuance, GitHub OAuth authorization or email delivery was tested.
Remaining Vite advisory: lazy3D bundle917.50KB/243.26KB gzip; main499.42KB/154.46KB
unchanged. This remains a controlled single-host beta with opt-in execution,
not an unrestricted commercial code-execution service.

## What the user does next

Read AWS_INDIA_QUICKSTART.md. Register two available DuckDNS names, sign into
AWS securely, select Mumbai, review actual credits/costs, upload the private
release, and provision the reviewed stack. Configure GitHub using the actual
HTTPS callback. Free web hostnames do not create an email domain/mailbox: use an
authorized existing SMTP mailbox for beta or configure SES according to its
sandbox/production rules. Configure support reception and test live providers
before invitations. Enable larger-host engineering separately after cost and
actual run checks. Keep all passwords/access keys/DuckDNS tokens out of chat.

Cloud environment startup instructions were updated for the new preflight mode
and user-specific India/no-domain launch guide; installation/network/repository
membership were preserved. Saving a draft is separate from publication; review,
save and publish the cloud environment to activate it. No fresh-task restoration
claim is made.
