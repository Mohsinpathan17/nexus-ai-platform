# Activate real GitHub sign-in and account email on AWS

GitHub OAuth sign-in/signup, email/password accounts, verification/recovery
delivery and a configured support mail link are implemented. They are disabled
when provider settings are absent. Automated tests use controlled providers;
real GitHub authorization and external inbox delivery still need live settings
and a deployed HTTPS backend. The Vercel static demo cannot host these endpoints.

## Your AWS account ID: what to do next

An account ID is an identifier, not an access key or deployment credential.
Sign in to the AWS Console yourself using your account's normal secure method;
use IAM Identity Center/IAM access for administration rather than sharing root
credentials. Set MFA and a budget alert, then select your region. Open CloudShell
and run `aws sts get-caller-identity` to verify your authenticated account; do not
paste credentials or its whole environment into chat. Select a domain and follow
[AWS_LAUNCH.md](AWS_LAUNCH.md) to upload the private release and create/install
the server. Review billable resources first. Merely sharing an account ID does
not authorize a resource creation or make this workspace authenticated to AWS.

Use two HTTPS names pointing at the EC2 host: app.your-domain.com and
preview.your-domain.com. Before providers are enabled, verify HTTPS routing and
backup/restore. The current code uses schema7: back up an existing database before
opening it with the upgraded server. Older code cannot open a schema7 database.
Migration adds GitHub identities, verified-email records and expiring hashed
verification grants; restore keeps identities/verified state but revokes all
sessions, recovery/verification/preview grants. Never downgrade/reset user data.

## GitHub account sign-in/signup

In GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:

| Field | Value |
| --- | --- |
| Application name | NEXYRAL |
| Homepage URL | https://app.your-domain.com |
| Authorization callback URL | https://app.your-domain.com/api/auth/github/callback |

Create the app and generate its client secret. Keep it only in your server's
private `/etc/nexyral/backend.env` or an appropriate secret manager. Configure:

```text
NEXYRAL_AUTH_ORIGIN=https://app.your-domain.com
NEXYRAL_GITHUB_CLIENT_ID=<OAuth-app client ID>
NEXYRAL_GITHUB_CLIENT_SECRET=<OAuth-app client secret>
```

The origin must exactly match an allowed NEXYRAL_APP_ORIGINS entry. No VITE_
variable, source file, public upload or chat message should contain the secret.
Restart the API service after reviewed changes. Continue with GitHub appears
only when configured, on both sign-in and signup pages. Users must have a
verified primary GitHub email. Only read:user and user:email permissions are
requested; repositories are not imported or modified and no access token is
retained. A real repository link is provided separately in the website footer;
repository visibility/access remains controlled by its owner.

A new GitHub identity creates an account; returning users sign into the linked
account. Matching an existing password-account email does **not** silently merge
it: sign in with the password, then choose Connect GitHub in the workspace using
the same verified GitHub email. Linking is Origin/CSRF/session protected. State
is browser-bound, single-use and expires after10 minutes; PKCE uses S256. Pending
OAuth state is process-local, so API restarts invalidate unfinished sign-ins.
Failures redirect to a safe sign-in message, not provider token/error details.

## Sending verification and recovery email with Amazon SES

Use SES in your selected region (where available). Verify a domain you control
with SES identities, publish its DKIM DNS records, and configure SPF/custom
MAIL FROM/DMARC according to SES instructions. Verify your intended sender,
for example noreply@your-domain.com. Do not invent an address you cannot verify.

New SES accounts can be in the **sandbox**: recipient addresses must also be
verified there. Request SES production access for real public signup/recovery
recipients; AWS review and sending quotas are not guaranteed. Sending email can
cost money. Configure reputation/bounce/complaint monitoring and appropriate
limits before broad signup. Acceptance by SMTP is not proof of inbox delivery.

In SES SMTP settings, create SMTP credentials for restricted sending. These are
not your account ID, console password or ordinary AWS access-key secret. Store
the SMTP credentials securely on the server, then configure:

```text
NEXYRAL_SMTP_HOST=email-smtp.REGION.amazonaws.com
NEXYRAL_SMTP_PORT=587
NEXYRAL_SMTP_USER=<SES SMTP username>
NEXYRAL_SMTP_PASSWORD=<SES SMTP password>
NEXYRAL_MAIL_FROM=noreply@your-domain.com
```

Use the actual SES endpoint shown for your region. Port587 requires STARTTLS;
port465 uses implicit TLS. Certificate verification and TLS1.2 minimum remain
enabled. No insecure SMTP or TLS bypass is offered. The EC2 security group need
not open an inbound mail port; delivery is outbound. SMTP secrets must exist in
the actual server process, not a placeholder intended for an HTTPS proxy.

When SMTP is configured, new email/password signup sends a one-hour verification
link and unverified accounts cannot mutate project data. Existing accounts also
need verification before writes after enabling SMTP. They can still sign in,
read existing projects, send another verification link, refresh status or log
out. Provider failure does not discard the newly created account: the workspace
shows that verification could not be sent. GitHub's verified primary email marks
its linked account verified. Providers may impose additional account rules.

Forgot password offers a recovery-email request when delivery is configured.
Replies are identical for existing/missing/throttled recipients. Links expire
after15 minutes, are stored only as hashes, and a successful reset revokes all
sessions and preview grants. New requests supersede old grants. Without SMTP,
the existing independently verified operator-assisted recovery remains available.

## A real support inbox

SES SMTP sends email; it does **not** automatically create a mailbox. Create an
inbox at a receiving provider (for example Amazon WorkMail where available or
your existing domain's email host), configure its MX records, and confirm that
you can receive and reply. Set `NEXYRAL_SUPPORT_EMAIL=support@your-domain.com` only
after creating the inbox. The Contact page exposes a real mailto link when set;
otherwise it explicitly says no inbox is configured. This uses the visitor's
mail client; no contact-form submission or fake ticket-success message is shown.

## Check configuration before live provider testing

Run `npm run preflight:backend -- --public-accounts` with the actual server
environment loaded. It checks presence and shape, not credential authorization
or mail deliverability. `NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS=1` also requires all
providers/support contact at API startup. Incomplete supplied GitHub/SMTP
settings fail startup even when this flag is absent. See AWS_INDIA_QUICKSTART.md
for the service-user command and free beta hostnames.

## Verify the live integrations before inviting users

1. `sudo systemctl restart nexyral`; inspect status without printing secrets.
   GET /api/auth/providers reports only enabled booleans and the support address.
2. Complete real GitHub signup/login and explicit existing-account linking.
   Check denial/cancelled authorization and retry after session expiration.
3. Use an address you own: sign up, receive/consume verification, resend a link,
   request/consume recovery, and sign in with the new password. Check spam,
   delivery failures and expired/used links. Verify old sessions are revoked.
4. Send a message to the support inbox from your mail client and verify reception.
5. Recheck ownership, persistent data, backups and actual worker approval/output.
   Public model execution still requires the separately enabled/tested worker.

Do not log full OAuth callback query strings or password/verification/recovery
bodies. Existing Caddy access logs are omitted. Automated provider fixtures prove
application behavior, not your OAuth app configuration, DNS or SES deliverability.
Keep secrets/private token links out of Git commits and deployment artifacts.
