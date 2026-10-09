# Free-tier serverless launch

Current public website: **https://nexyral.online**. Root HTTPS and the `www` redirect are verified; the temporary Workers demo URL is disabled. See [root-domain launch report](ROOT_DOMAIN_LAUNCH.md). Firebase Authentication is activated and Gemini is connected. GitHub OAuth setup and real account/email-delivery checks remain.

NEXYRAL can run publicly without an always-on EC2 host. This implementation uses Cloudflare Workers Static Assets, D1, Firebase Authentication (Spark), and Google Gemini. Free tiers are quota-limited; this is not unlimited or a guarantee of permanent free service. No billing upgrade is required by these instructions. Do not execute the pending AWS capacity upgrade.

## What this version does

- Public React website, themes, interactive 3D identity and larger readable Hero typography.
- Firebase email/password signup and recovery, plus Google sign-in. Email signup verification now uses six-digit NEXYRAL codes delivered through a verified Resend sender; delivery is blocked until its credentials and domain are configured. Optional real GitHub sign-in through Firebase OAuth. See [email code setup](EMAIL_CODE_SETUP.md).
- Owner-scoped persistent projects in D1, verified-email gate for generation, atomic generation leases and a daily AI request budget.
- Real Gemini API integration generating downloadable App.tsx and styles.css. No secret reaches the browser.
- Generated code is displayed as text, never executed on the application origin. Build, tests, security review, previews and deployment are **not run** by this version.

This is a serverless generation foundation, not yet a replacement for every existing EC2 engineering-worker feature. GitHub sign-in authenticates an identity; it does not connect repositories or grant commit access.

## 1. Create free accounts

Create a Cloudflare account at https://dash.cloudflare.com/sign-up. You do not need to move your GoDaddy domain yet: the staging deployment gets an HTTPS `workers.dev` address.

Create a Firebase project at https://console.firebase.google.com/ on **Spark**, without upgrading to Blaze. Enable Authentication > Sign-in method > Email/Password. Register a Web app in Project settings and copy its public configuration into `.env.local` using `.env.example`. Enable email enumeration protection and set password requirements in Firebase Authentication settings.

For GitHub sign-in, enable the GitHub provider in Firebase. Create a GitHub OAuth app using the callback URL Firebase displays. Store its client secret **in Firebase**, not in frontend variables. Set `VITE_FIREBASE_GITHUB=1` only when configured. Add the staging hostname to Firebase Authentication > Settings > Authorized domains. Configure verification/recovery email templates with the correct project identity.

Create a Gemini key at https://aistudio.google.com/api-keys. Choose a model currently listed as eligible for the free tier in https://ai.google.dev/gemini-api/docs/pricing and available to your account/region. Review the free-tier data-use terms before accepting confidential customer code. Do not enable paid billing just to follow this guide. Quotas and availability depend on model/account/region.

## 2. Prepare and deploy from this repository

Use Node 24.19+ in `apps/nexyral`:

```sh
npm ci --cache /tmp/nexyral-npm-cache
npx wrangler login
npx wrangler d1 create nexyral
```

Copy the returned database ID into `wrangler.jsonc`. Replace `FIREBASE_PROJECT_ID` with the same project ID as the frontend. Set `GEMINI_MODEL` to the eligible model ID you selected (without `models/`). Keep `DAILY_GENERATION_LIMIT` at a small initial value. This is a global request budget; provider token quotas also apply. A failed provider attempt consumes a budget slot.

```sh
npx wrangler d1 migrations apply nexyral --remote
npx wrangler secret put GEMINI_API_KEY
npm run test:cloud
npm run lint
npm run deploy:cloud
```

The secret command prompts securely; never put the key in `VITE_*`, Git, chat, or `wrangler.jsonc`. Wrangler prints the actual public staging URL after deployment. A Cloudflare API token with the needed Workers/D1 permissions can replace interactive login in CI; store it securely alongside the account ID.

## 3. Validate staging before changing DNS

Visit the returned URL. Test both themes and mobile, signup with a real inbox, verification delivery, recovery, GitHub sign-in if enabled, saving a project, generation and source download. In another account, confirm the first account's project is inaccessible. Refresh to verify persistence. Confirm generated output is labelled unverified and the provider quota failure is readable. Run `/api/health` to check serverless mode. Local tests use synthetic identities and mocked Gemini responses; they do not verify live provider credentials or mail delivery.

Workers Free currently publishes request/CPU limits; D1 Free has daily reads/writes and storage limits. See https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/d1/platform/limits/. Profile Worker CPU on a real deployment before accepting public traffic; free-plan execution limits may constrain token verification and large responses. Gemini generation is one bounded request, not a durable background engineering queue: keep the tab open. Interrupted leases can be retried after two minutes. Firebase ID tokens expire, but immediate server-side revocation checking is not implemented here.

## 4. Move the domain only after staging passes

Use Cloudflare's documented custom-domain setup. If it requires Cloudflare DNS, add `nexyral.online`, copy **all** existing DNS records (including mail records), then change GoDaddy nameservers to the pair Cloudflare assigns. Attach the desired app hostname to this Worker. Do not guess the nameservers, point the Worker hostname at an EC2 IP, or erase existing mail records. Until then, use the HTTPS staging address.

Existing SQLite accounts/projects are not migrated automatically. Firebase identities differ from EC2 user IDs; verified ownership mapping, a consistent private database backup, and a tested D1 import are required before a replacement launch. Never merge accounts only because their email strings match. Keep the old site and disk intact. Once the new site and data migration pass, separately stop AWS resources to prevent ongoing credit usage; never delete the only backup.

## Next production work

Durable engineering jobs, plan approval and real isolated build/type/test execution; owner-safe migration; repository connection separate from sign-in; abuse protection; explicit data-retention controls; production monitoring; live provider and email verification. Generated frontend source alone does not establish an application's commercial value.
