# Step 21: AWS launch package and public workflow guide

This milestone prioritizes hosting and usable public guidance. It does not create
AWS resources or claim the platform is deployed. The existing Vercel static demo
is unchanged. AWS access could not be used here: the AWS CLI is absent and the
configured profile has no matching section in the provided config/credential
files. No credential values were printed or requested in chat.

Prepared infrastructure:

- CloudFormation JSON for a single Ubuntu24.04 x86_64 EC2 beta host in a selected
  existing VPC/public subnet, with an Elastic IP, encrypted retained gp3 storage,
  required IMDSv2 and standard CPU credits.
- Only80/443 ingress; Session Manager replaces public SSH. Instance IAM permits
  SSM and reading exactly three private release objects, not administrative or
  bucket-write access. No application/worker bootstrap occurs implicitly.
- A fresh-host private S3 release retrieval helper reuses the existing validated
  archive/bootstrap path, refusing existing installs. A separately controlled
  worker systemd example preserves deliberate startup and owner approval.
- AWS Console instructions cover private release upload, parameters, DNS, TLS,
  installation, accounts, worker prerequisites, real-run verification, backup,
  costs and cleanup. The root disk remains after host termination and can incur
  storage charges; this retention is not an automatic restore or backup.

The public /docs Workflow Guide now describes actual account/project creation,
requirements, bounded frontend intent, explicit approval, recorded evidence,
private output and retry behavior. It distinguishes a static public demo from
a connected workspace and discloses unavailable automated recovery email,
billing, full-stack generation, audits and generated-app deployment. It uses
existing responsive styling, theme tokens and accessible React links.

Created:

- `deploy/aws/cloudformation.json`, `install-release.sh`,
  `nexyral-worker.service.example`
- `docs/AWS_LAUNCH.md`, this report
- `src/pages/GettingStartedGuide.tsx`
- `server/aws-deployment.test.ts`, `tests/guide.spec.ts`

Modified:

- `src/pages/ContentPage.tsx`, `docs/BACKEND_HOSTING.md`

No npm dependencies, database/schema changes or saved cloud setup changes were
needed. Existing onboarding instructions remain applicable. AWS provisioning is
separate from this development environment and requires provider access and a
review of billable resources. The region/domain/monthly-budget question remains
pending; the template uses placeholders rather than inventing those choices.

Executed validation:

- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `node --test server/aws-deployment.test.ts
  server/deployment-preflight.test.ts server/https-smoke.test.ts`: seven passed.
  Includes offline ingress/storage/IAM/IMDS checks, installer shell syntax,
  existing deployment preflight safeguards and actual local TLS route fixtures.
- `npm run preflight:backend`: local runtime/build/origin/storage passed.
- `npx playwright test tests/guide.spec.ts`: four passed, both themes at375px
  and1440px, reduced motion, guide disclosure/steps, keyboard navigation to
  account signup, no overflow and no application console/page errors.
- Mobile light and desktop dark guide screenshots were inspected at
  `artifacts/guide-375-light.png` and `guide-1440-dark.png`.
- Source-only backend package regenerated, checksum/safe entries inspected,
  including AWS deployment assets, guide and tests.

These are local checks. AWS CloudFormation service validation, regional AMI
resolution, stack creation, Session Manager, remote package installation, real
certificates, AWS CPU-model performance and remote user flows are **unrun**.
The new deployment test is not a substitute for `aws cloudformation
validate-template` and actual AWS provisioning. No costs were incurred by
creating cloud resources. Public-demo build was not rebuilt/published this step.

The lazy 3D bundle advisory remains917.50KB /243.26KB gzip. Existing test-runner
color warnings remain. No warnings were hidden. A single host is not high
availability; current same-host Docker execution is not certified tenant
isolation. AWS_LAUNCH.md recommends a controlled beta before broader execution
and identifies quotas/isolation/recovery/support/legal work for commercial use.

Next action is deployment: settle region/domain/budget, validate/review the AWS
template in that account, create the host, install the release, verify real
HTTPS/accounts/backups, then deliberately enable and test a real engineering
worker before inviting builders. No more cosmetic feature milestones are needed
to begin that hosting work.
