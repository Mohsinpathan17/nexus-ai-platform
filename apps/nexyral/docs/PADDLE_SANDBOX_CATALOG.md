# NEXYRAL Paddle sandbox catalog

The owner approved these base prices on October 11, 2026. Each plan has one product, a monthly price and an annual price. Every price has a **7-day free trial**. Annual billing is ten monthly payments, representing two months off relative to twelve monthly payments.

| Plan | USD monthly/yearly | UK GBP monthly/yearly | Ireland EUR monthly/yearly | Australia AUD monthly/yearly |
| --- | --- | --- | --- | --- |
| Starter | $5 / $50 | £4 / £40 | €4.50 / €45 | A$7 / A$70 |
| Pro | $12 / $120 | £9 / £90 | €10 / €100 | A$16 / A$160 |
| Advanced | $25 / $250 | £19 / £190 | €22 / €220 | A$35 / A$350 |

Regional prices are rounded, adjustable launch proposals, not a claim of measured purchasing-power parity or live exchange-rate quotes. Tax treatment follows the Paddle account setting. Country codes are **GB**, **IE**, and **AU**; prices elsewhere default to USD. All API amounts are minor-unit strings: Starter USD monthly is `"500"`, annual `"5000"`; Starter Ireland monthly is `"450"`.

## Current status

Prepared and tested; **no real Paddle products or prices have been created**. The owner saved the sandbox API key and its binding is now available. Read-only sandbox API requests, including an unauthenticated baseline, return HTTP 403 with an HTML Cloudflare security-block page. This prevents checking account permissions and creating the catalog. It is not evidence of an invalid API key. No product/price IDs are invented. Live website pricing, subscriptions, checkout and entitlements have not changed.

Support diagnostic on October 11, 2026: `GET https://sandbox-api.paddle.com/products?per_page=1`, HTTP 403, Cloudflare Ray ID `a48e5abd88931268-LAX`. Request headers and credentials are not included in this report. Ask Paddle support to investigate API access from this cloud environment, or run the same prepared script from an allowed local connection. Never disable TLS validation or send the key to another endpoint to work around the block.

## Connect and create

1. In your **Paddle sandbox** account, open Developer tools → Authentication → API keys. Give a sandbox key Products read/write and Prices read/write permissions. The `saas` tax category must be enabled on the account.
2. Save the key securely as `PADDLE_SANDBOX_API_KEY` in this Codex cloud environment. Its secret requirement was added with the sole destination `sandbox-api.paddle.com`. Save/publish environment changes when requested by the settings UI. Do not paste credentials into chat or commit them.
3. In `apps/nexyral`, preview without any API request:

   ```sh
   node --use-env-proxy scripts/create-paddle-catalog.ts
   ```

4. With the credential available, create the authorized sandbox catalog:

   ```sh
   node --use-env-proxy scripts/create-paddle-catalog.ts --apply
   ```

Only sandbox product/price endpoints are supported. Credentials cannot follow redirects to other hosts. The script tags its entities, reuses matching tagged records, refuses duplicate or inconsistent tagged records, and never alters unrelated products or prices. It does not retry uncertain mutations automatically; a repeat run first lists tagged records to recover from an interrupted response. It writes actual returned IDs after each completed step to `billing/paddle-sandbox-ids.json` and prints the completed mapping. Partial output contains only confirmed IDs, never placeholders. A final account reread remains required before reporting creation complete.

## Files and checks

- `billing/paddle-sandbox-catalog.json`: three approved products and six price payloads, including all overrides and trials.
- `scripts/create-paddle-catalog.ts`: sandbox-only preview/creation utility.
- `tests/billing/paddle-catalog.test.ts`: fixture tests for amounts/trials, attachment/mapping, and repeat runs without duplicate mutations.

Lint and TypeScript checks passed; all four catalog tests passed, including an HTML security-block regression that stops before mutations without exposing credentials. Tests use isolated temporary directories and API fixtures; they do not establish live Paddle access. Run `node --test tests/billing/paddle-catalog.test.ts` from the app directory.

Official references: [Create product](https://developer.paddle.com/api-reference/products/create-product) and [Create price](https://developer.paddle.com/api-reference/prices/create-price). Their current schemas were checked for SaaS tax category, recurring billing, trial period, minor-unit amounts and country overrides.
