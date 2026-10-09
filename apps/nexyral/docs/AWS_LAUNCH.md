# Host NEXYRAL on AWS

This is a concrete single-server **beta** launch path, not an already deployed
AWS service. The public website and workspace can share one HTTPS app hostname;
generated previews need a different hostname. EC2 runs Node, private SQLite,
Caddy and, when explicitly enabled, local Ollama plus Docker verification.
Lambda, Amplify-only hosting and an S3 static website cannot run this whole stack.

For India with trial credits and no paid domain yet, start with
[AWS_INDIA_QUICKSTART.md](AWS_INDIA_QUICKSTART.md). It covers free beta hostnames
and a smaller accounts-only host with the worker disabled.

## Decide these three things first

Choose an AWS region near your users, a domain you control, and a monthly budget.
Example names below (`app.your-domain.com`, `preview.your-domain.com`) are
placeholders. EC2, EBS, public IPv4, S3 backups, DNS and data transfer can incur
charges. Do not assume this configuration qualifies for a free tier or that
trial credits will last. Check your account's offers and the AWS calculator:
https://calculator.aws/ . Set AWS Budgets alerts before creating the stack;
alerts do not automatically cap spending. A t3.large /8GB CPU host is a starting
point for a small local-model beta, not a measured concurrency guarantee.
Standard CPU credits in the template avoid surplus-credit billing, but can
throttle sustained inference. Monitor before resizing or inviting more people.

## 1. Upload the prepared private release

Download these files from this workspace:

- `artifacts/nexyral-backend-source.tar.gz`
- `artifacts/nexyral-backend-source.tar.gz.sha256`
- `deploy/bootstrap-free-vm.sh`
- `deploy/aws/cloudformation.json`

In AWS Console, create a private S3 bucket in your chosen region. Leave **Block
all public access** enabled, enable default encryption, and upload the first
three files under `nexyral-release/`. Do not upload `.data`, account databases,
environment files, SSH keys or model/runtime files. Keep the checksum filename.
Enable versioning for release/backup retention if appropriate; versions cost
storage and need a retention policy. No public bucket policy or ACL is needed.

## 2. Create the EC2 foundation

Open CloudFormation in the same region → Create stack → With new resources →
Upload a template file → select `deploy/aws/cloudformation.json`.

- Choose a VPC and a **public subnet in that same VPC** with a route to an
  Internet Gateway. The template does not create networking/NAT gateways.
- Set ReleaseBucket to your private bucket and ReleasePrefix to
  `nexyral-release` (no trailing slash).
- The Ubuntu AMI parameter is Canonical's Ubuntu24.04 x86_64 public SSM path.
  AWS must resolve it in your region; verify it before launch. You can use
  CloudShell `aws ssm get-parameter --name
  /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id`
  and inspect the returned image with `aws ec2 describe-images`. This template
  and its AMI resolution have not been validated against an AWS account here.
- Choose instance size/disk after reviewing cost. The default is t3.large and
  encrypted80GB gp3. Review IAM permission creation and the change preview.
- Create the stack only when its resources/cost are acceptable.

The role permits Session Manager and reading **only the three release objects**;
it has no administrator, bucket-list/write or backup permissions. The host uses
IMDSv2 and opens only TCP80/443. SSH, API, Ollama and Docker ports are not public.
A stable Elastic IP is allocated. EC2 creation is billable. Stack CREATE_COMPLETE
means infrastructure exists, not that NEXYRAL is installed or working.

Use stack Outputs to find InstanceId and PublicIPv4. Go to EC2 → Instances →
Connect → Session Manager. Ubuntu AWS images normally include the SSM agent;
check its availability, instance role and outbound HTTPS if Connect is disabled.
Do not open unrestricted SSH to bypass an unresolved setup problem.

## 3. Point your domain at the host

Create two DNS A records at your domain provider:

| Record | Value |
| --- | --- |
| app | CloudFormation PublicIPv4 |
| preview | Same PublicIPv4 |

Use DNS-only routing for this initial direct-Caddy topology. Do not enable a
CDN/proxy without reviewing forwarded-IP handling. Both names must resolve before
Caddy can issue public TLS certificates. An AWS load balancer is not required
for this single-host beta. Route53 is optional if you already manage DNS elsewhere.

## 4. Install the actual application

In Session Manager on the NEW host, install the AWS CLI from Ubuntu's signed
repositories, then download the reviewed installer from your private bucket.
Replace REGION and YOUR_BUCKET in these commands:

```sh
sudo apt-get update
sudo apt-get install -y awscli
aws --region REGION s3 cp s3://YOUR_BUCKET/nexyral-release/bootstrap-free-vm.sh /tmp/bootstrap-free-vm.sh
aws --region REGION s3 cp s3://YOUR_BUCKET/nexyral-release/nexyral-backend-source.tar.gz /tmp/nexyral-backend-source.tar.gz
aws --region REGION s3 cp s3://YOUR_BUCKET/nexyral-release/nexyral-backend-source.tar.gz.sha256 /tmp/nexyral-backend-source.tar.gz.sha256
cd /tmp
sha256sum -c nexyral-backend-source.tar.gz.sha256
sudo bash bootstrap-free-vm.sh nexyral-backend-source.tar.gz app.your-domain.com preview.your-domain.com
sudo systemctl status nexyral caddy --no-pager
```

The installer refuses existing application/proxy paths, installs pinned Node with
official HTTPS checksum validation, performs a clean dependency install/build,
creates private SQLite storage and a non-root API service, and enables Caddy TLS.
It leaves the engineering worker disabled. `deploy/aws/install-release.sh` is
also available for repeatable three-object retrieval on a fresh host; it calls
the same bootstrap and is not an update/migration tool. Inspect any startup
failure with `sudo journalctl -u nexyral -u caddy -n 100 --no-pager`; do not post
private recovery/preview links or credentials. No AWS host installer was executed
from this development environment.

Run the anonymous public probes from the installed app directory:

```sh
cd /opt/nexyral/app
npm run smoke:https -- https://app.your-domain.com https://preview.your-domain.com
```

All eight probes must pass. Then follow HTTPS_VALIDATION.md: signup/login,
Secure cookies, ownership rejection, live events, logout, isolated previews,
source download and off-machine backup/restore. Keep account data on the private
volume. Configure a separate least-privilege backup process; this EC2 role cannot
write backups. Back up SQLite with `db:maintenance`, not an unsynchronized copy
of a live database. Encryption is not a backup. Configure [account providers](ACCOUNT_PROVIDERS.md) for GitHub sign-in and SMTP verification/recovery; the operator recovery fallback remains available.

## 5. Enable engineering runs separately

Until this phase passes, users can create accounts/projects/requirements and
record intent, but runs wait for a worker. Do not advertise live generation yet.

1. Install Ollama using the official Linux instructions, verifying the selected
   release: https://docs.ollama.com/linux . Keep it on127.0.0.1:11434, set
   OLLAMA_NO_CLOUD=1, limit parallelism to1 and loaded models to1. Check the
   service configuration rather than assuming its defaults are private.
2. Download the chosen model with `ollama pull qwen2.5-coder:1.5b`; inspect its
   license and verify `ollama list`. This small CPU model was exercised locally
   for development; its hosted performance/quality is not proven. Local model
   inference has no model API bill but still consumes paid AWS compute.
3. For builds, install Docker from its official verified repository and build
   the pinned executor with `npm run build:executor` as the service user. Follow
   WORKER.md. Docker group access is root-equivalent: grant it only to the trusted
   worker identity after reviewing this single-host deployment. Do not expose
   the socket/API. The current same-machine worker is not a certified untrusted
   multi-tenant sandbox; start with a small controlled beta, not anonymous mass
   execution. Separate executor infrastructure, quotas and stronger isolation
   are needed before a broad commercial launch.
4. In `/etc/nexyral/backend.env`, keep NEXYRAL_START_WORKER=0 for the API group.
   Add NEXYRAL_PLANNING_MODEL=qwen2.5-coder:1.5b; set NEXYRAL_ENABLE_BUILDS=1
   only after the image/browser checks pass. Keep the DB path identical to API.
   Inspect/cancel unwanted queued intents before starting the worker.
5. Review/copy `deploy/aws/nexyral-worker.service.example` to
   `/etc/systemd/system/nexyral-worker.service`, run `sudo systemctl daemon-reload`
   and `sudo systemctl start nexyral-worker`. The worker refuses absent model or
   executor prerequisites. No automatic restart/boot enablement is configured;
   inspect interrupted runs after reboot and start deliberately.
6. Use a real test account: submit a small counter intent, inspect the proposed
   scope, explicitly approve, wait for actual checks, open the isolated preview
   and download source. Test cancellation, failures and restart persistence.

## What a public user does

Share **https://app.your-domain.com**, not an IP, localhost or a preview grant.

1. Visit the website and choose Get Started.
2. Create an account; create a project and optionally save requirements.
3. Describe a small client-side React interface and create an engineering run.
4. Wait for a connected worker to prepare a proposal. Review/revise its scope;
   approving is a separate action, not implied by submitting an idea.
5. Review recorded TypeScript/build/selected behavior results. Open the private
   sandboxed preview or download stored source when available.
6. If an attempt fails, review evidence and prepare a new attempt; fresh approval
   is required. Account owners see only their own project/run evidence.

The engine currently builds bounded frontend interfaces, not arbitrary full-stack
SaaS platforms. Generated applications have no implemented deployment step.
Security/accessibility/performance audits are not automated promises. Website
demonstrations remain simulated. Pricing is undecided. Optional GitHub sign-in and email verification/recovery require the provider
setup in [ACCOUNT_PROVIDERS.md](ACCOUNT_PROVIDERS.md). No providers have been
activated here, and there is no paid subscription system. Publish only
an accurate beta offering, a usable support contact and reviewed legal/privacy
information; collect no payment for unavailable capabilities.

## Operations and cost cleanup

Monitor CPU credits, memory, disk, worker queues and failures. Keep release
archives and private off-machine backups; test restoration. Use AWS Budgets and
CloudWatch deliberately—their own retention/usage can also cost money. Default
single-instance hosting has downtime during restarts; it is not high availability.

Before deleting/replacing the host, take and verify a consistent backup. The
template retains its root EBS volume on termination to reduce accidental data
loss. Retained volumes continue costing money and are **not** automatically
restored on a new host. Stack deletion removes the allocated Elastic IP, but
retained disks, S3 objects/versions, snapshots and DNS charges need separate
cleanup after required data has been recovered. Stopping EC2 does not remove all
charges. Never delete the only copy of user data to save hosting cost.
