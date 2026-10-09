# Your first public NEXYRAL beta: India, no paid domain yet

Current choice: Mumbai (`ap-south-1`). You reported a six-month AWS offer with
$100 credit. Verify your actual credit balance, expiry, eligible services and
Free/Paid account plan in Billing before creating resources. This repository
cannot check those terms without AWS access. Credits are not a guarantee of six
months of this application's hosting. Set budget alerts and review the regional
AWS calculator estimate, including public IPv4, EBS, S3 and data transfer.

## 1. Get two free HTTPS hostnames

Visit https://www.duckdns.org/ and sign in yourself. Register two available,
unique subdomains you control, for example `your-nexyral.duckdns.org` and
`your-nexyral-preview.duckdns.org`. These examples are not registered or reserved.
Keep the DuckDNS account/token private; do not share it in chat. Free service
availability is external and no domain has been created by this project.

After creating the AWS host below, set the IPv4 address for BOTH subdomains to
the stack's PublicIPv4 in DuckDNS. Caddy will obtain HTTPS certificates after
public DNS points to the host and ports80/443 are reachable. An EC2 IP address
alone is not the HTTPS app URL. Preview must use a distinct hostname.

These are free beta hostnames, not an owned email domain. They do not give you
DuckDNS-domain sender authentication, arbitrary MX records or a support mailbox.

## 2. Launch the accounts-only website first

Follow [AWS_LAUNCH.md](AWS_LAUNCH.md), using these starting parameters:

| Setting | Starting choice |
| --- | --- |
| AWS region | Mumbai, ap-south-1 |
| InstanceType | t3.small (2GiB; accounts-only candidate, not load-tested) |
| DiskGiB | 40 (encrypted gp3; backups are separate) |
| App host | Your first DuckDNS name |
| Preview host | Your second DuckDNS name |
| NEXYRAL_START_WORKER | 0 |
| NEXYRAL_ENABLE_BUILDS | 0 |

The template still defaults to t3.large/80GiB; explicitly choose the smaller
parameters in CloudFormation. Availability and pricing must be checked in your
account. Accounts-only means users can sign in, save projects/requirements and
submit intents, but generation waits for a connected worker. Do not advertise
live AI building at this stage. A 2GiB server is not a model/build-worker target;
installation and concurrency have not been measured on that EC2 size.

Use an existing public subnet with an Internet Gateway route. Do not add a NAT
gateway or load balancer for this documented single-host topology. The stack
has an Elastic IP and Session Manager access; no public SSH is required.

Download the release archive/checksum, bootstrap and CloudFormation template
listed in AWS_LAUNCH.md. Upload the release files to your private S3 bucket,
create the reviewed stack, set DuckDNS IPs, and run the install commands in
Session Manager with YOUR actual hostnames and `ap-south-1` as the region.
No infrastructure has been created here. Budget alerts do not cap spending.

## 3. Connect accounts and real mail

Follow [ACCOUNT_PROVIDERS.md](ACCOUNT_PROVIDERS.md). In the GitHub OAuth App use:

- Homepage: `https://YOUR-APP.duckdns.org`
- Callback: `https://YOUR-APP.duckdns.org/api/auth/github/callback`

Replace YOUR-APP with your registered name. Client secrets belong only in the
private server environment. This grants GitHub identity/email access, not
repository imports or writes.

Without your own email domain, use a mailbox you already control for support
and a SMTP provider that authorizes sending from that mailbox. The implemented
adapter supports authenticated TLS SMTP on465/587. Check that provider's
sending limits and account requirements; regular inbox passwords may not be
accepted and provider-specific app passwords may require two-factor setup.
Do not bypass MFA or certificate checks. Configure NEXYRAL_MAIL_FROM and
NEXYRAL_SUPPORT_EMAIL only for addresses you actually own/use.

For SES you can verify an email-address identity you control, but sandbox
recipient restrictions still apply. Do not assume public signup mail works
until SES approves production access and real delivery is tested. DuckDNS
names are not a sender domain you can configure with DKIM/MX. An owned domain
and a real mailbox are preferable for a branded public launch. Sending with SES
does not create receiving mail. No SMTP provider has been activated here.

## 4. Check before sharing the link

On the server, run the checks as the service user with its actual private
backend environment loaded. Do not paste its contents or secrets into chat.
The systemd service already receives `/etc/nexyral/backend.env`; a separate
shell does not automatically inherit it. One way to run preflight with the
same environment without printing credentials is:

```sh
sudo systemd-run --wait --pipe --collect \
  --property=User=nexyral \
  --property=WorkingDirectory=/opt/nexyral/app \
  --property=EnvironmentFile=/etc/nexyral/backend.env \
  /usr/local/bin/node scripts/deployment-preflight.ts --public-accounts
```

This performs read-only configuration/storage checks; it sends no email and
cannot validate credential authorization or inbox delivery. The public-account
mode fails when GitHub, SMTP or a support address is missing. In the private
server environment, set `NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS=1` after configuring
all three so API startup also rejects incomplete account-provider settings.

Then run the HTTPS smoke probes from AWS_LAUNCH.md and complete real GitHub
signup/linking, inbox verification, password reset, support reception and
backup/restore tests. Only then share `https://YOUR-APP.duckdns.org` with a small
test group. No fake sample results substitute for these live checks.

## 5. Enable the AI worker only after reviewing cost

Follow phase5 of AWS_LAUNCH.md separately. The existing small CPU model was
validated locally, not benchmarked on Mumbai EC2. A larger8GiB+ host is a beta
starting point, not a throughput guarantee. Review credits/cost before resizing,
keep model/Docker ports private, inspect queues before startup, and test an
actual owner-approved run and isolated preview. Existing same-host Docker
execution is for a controlled beta; stronger isolation is needed before broad
public untrusted-code workloads. No payment system is implemented.

Stopping an EC2 host still leaves storage/IPv4 costs possible. Stack deletion
retains its encrypted root disk; back up and separately inspect retained storage,
IP allocations and S3 before assuming charges stop. Never delete the only copy
of account/project data.
