# Account recovery

Recovery supports optional SMTP delivery through `POST /api/auth/request-recovery`.
See [ACCOUNT_PROVIDERS.md](ACCOUNT_PROVIDERS.md) to configure AWS SES or another
TLS SMTP provider. No real provider is currently configured or tested here. The
request endpoint returns a uniform response and never returns recovery tokens.
The following operator fallback remains available without SMTP. A trusted
operator must independently verify ownership before issuing a link.

From `apps/nexyral`, using the API's same `NEXYRAL_DB_PATH` and app origins:

```sh
npm run account:recovery -- verified-account@example.com
```

The command writes a unique mode-600 JSON file inside private
`.data/recovery-links/` and prints only its path. It contains a link and expiry;
never commit, log, post publicly, or include the file in frontend deployments.
`NEXYRAL_RECOVERY_APP_ORIGIN` must be one of `NEXYRAL_APP_ORIGINS` and use HTTPS
in production. Deliver the link through an independently verified private
channel. Delete the private link file after delivery; issuance files are not
automatically rotated. Issuing a new link invalidates the prior account link.

Links expire after 15 minutes. Only token hashes are stored in SQLite. The
`/recover` page consumes a URL fragment, removes it from the visible URL, and
submits the code with a new password to `POST /api/auth/recovery`. The endpoint
checks accepted Origin, applies an attempt limit, validates/revalidates the
single-use grant around password hashing, changes the password and revokes all
account sessions (also revoking session-bound preview grants). It requires a
fresh sign-in and never automatically establishes a session. Projects and
engineering evidence are preserved. Minimum password length is 12 characters.

Current schema v7 retains the v5 recovery table. Backup/restore accepts v4–v7;
restoring revokes sessions, preview grants and available recovery/verification
grants, while preserving GitHub identities and verified-email status.

The Vercel static demo disables account forms. Live email delivery and GitHub
authentication require server-side provider configuration and deployment. SMTP
acceptance does not establish inbox delivery; receiving support mail also
requires a separate real mailbox with working MX records.
