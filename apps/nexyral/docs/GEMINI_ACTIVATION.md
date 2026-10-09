# Gemini activation — 9 October 2026

Public site: https://nexyral.nexyral-studio-31d0ee7a.workers.dev

`GEMINI_MODEL` is now `gemini-3.5-flash`. The user stored `GEMINI_API_KEY` as an encrypted Cloudflare Worker secret. Its value was never retrieved, printed or copied into source, frontend configuration or reports.

## Actual verification

A protected temporary operator check made a real generation request from the deployed Cloudflare Worker using the bound key. Google returned HTTP 200 and complete structured React frontend source: 3,102 App.tsx characters and 4,669 CSS characters. The generated source passed the existing shape/size validation. Type checking, build, behavioral tests and deployment of that generated app did **not** run; its verification remains `not_run`.

Google's official pricing page listed a free tier for the selected model: https://ai.google.dev/gemini-api/docs/pricing. This does not establish the user's billing/credit configuration or promise unlimited use. No billing plan was upgraded. The existing global daily generation budget remains 10. Older `gemini-2.5-flash` and `gemini-2.5-flash-lite` lookup metadata was available but actual generation returned HTTP 404; they were not enabled.

The diagnostic endpoint, its temporary operator secret and its private temporary files were removed after testing. The regular Worker was redeployed as version `e940373c-c76c-457d-90aa-470c64cbdcf8`. Secret-name-only inspection confirmed `GEMINI_API_KEY` remains and the diagnostic secret does not. The old diagnostic credential cannot access the deployed endpoint (HTTP 401). No customer accounts, projects, database rows or authentication grants were created by this smoke check.

## Runtime fix

Cloudflare workerd rejects `RequestInit.redirect = "error"`; Node accepted it, so the earlier mocked Node tests missed this runtime defect. `cloudflare/auth.ts` and `cloudflare/gemini.ts` now use `redirect: "manual"`. Their existing status checks reject redirects rather than following them with credentials. This fixes both Firebase JWKS fetching and Gemini requests.

Created `cloudflare/runtime.test.ts`, which executes the real modules in Miniflare/workerd with synthetic signed Firebase tokens and provider fixtures. It constructs requests in workerd, verifies an actual RSA signature, generates structured fixture source and checks redirect rejection. Added Miniflare explicitly as a development dependency; it was already installed transitively with Wrangler. The initial temporary diagnostic deployment needed an explicit configuration path, and the local runtime reproduction was updated to the installed Miniflare v5 configuration API before the successful regression check.

## Checks

Lint, application/server TypeScript, edge TypeScript, all six cloud tests, normal cloud preflight and production cloud build passed. The known lazy 3D chunk size advisory remains. Live checks passed for homepage HTTP 200, health `generationConfigured: true` / `verificationAvailable: false`, anonymous projects HTTP 401, cross-origin project mutation HTTP 403 and diagnostic cleanup. Controlled test results do not establish live account/email delivery.

## Current account setup

Firebase Authentication has subsequently been activated. The public project configuration returns HTTP 200, email/password handling accepts requests, and both the staging hostname and `nexyral.online` are authorized. Live signup, delivered verification/recovery emails and signed-in generation still need an end-to-end owner check. GitHub sign-in remains unconfigured. See [ROOT_DOMAIN_LAUNCH.md](ROOT_DOMAIN_LAUNCH.md) and [CLOUD_WORKSPACE_REPORT.md](CLOUD_WORKSPACE_REPORT.md) for subsequent work.

AWS resources, GoDaddy DNS, legacy SQLite accounts and existing application source history were not migrated or changed. No full-stack generation, secure preview or production shipping capability is claimed.
