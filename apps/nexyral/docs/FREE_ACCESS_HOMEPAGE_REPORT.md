# Free access and homepage update — 2026-10-11

NEXYRAL stays free during early access. Paddle checkout is deferred at the owner's request. No new dependencies remain installed; the temporarily installed Paddle SDK was removed, restoring the existing manifest and lockfile.

## Changes

- Replaced proposed paid-tier cards on Home and `/pricing` with one $0 free early-access offering, a signup/workspace link, and clear service-capacity and generation limitations. Removed unused plan data.
- Added Focus, a working React task interface directly to Home: add tasks, complete tasks, filter views, and reset. It is labeled as a browser example, not an AI engineering run. Changes are held in memory until reload; no task data is submitted to the server.
- Updated hero copy to describe the deployed frontend source-generation capability and free access.
- Enabled Core antialiasing on mobile, increased the mobile DPR cap from 1.25 to 1.75, and increased the mobile visual height from 440px to 500px. Desktop DPR caps at 2.
- Made Core/ring rotation more visible with bounded frame deltas; added pause/resume. Rendering still stops when hidden or offscreen. A reactive media-query hook stops motion when the OS preference changes while the page is open.

## Created files

- `src/hooks/usePrefersReducedMotion.ts`
- `src/sections/Showcase/Showcase.tsx`
- `src/styles/pricing.css`
- `src/styles/showcase.css`
- `tests/cloud/home.spec.ts`
- `docs/FREE_ACCESS_HOMEPAGE_REPORT.md`

## Modified files

- `src/components/3d/nexyral-core/CoreEngine.tsx`
- `src/components/3d/nexyral-core/NexyralCore.tsx`
- `src/components/3d/nexyral-core/OrbitalRing.tsx`
- `src/lib/product-content.ts`
- `src/main.tsx`
- `src/pages/ContentPage.tsx`
- `src/pages/Home.tsx`
- `src/sections/Hero/Hero.tsx`
- `src/sections/Pricing/Pricing.tsx`
- `src/styles/core.css`
- `docs/PADDLE_SANDBOX_CATALOG.md`

## Validation

- `npm run lint`: passed.
- `npm run build:cloud`: passed, including client/server TypeScript, Vite production compilation, and Cloudflare TypeScript.
- `npm run preflight:cloud`: passed.
- `npm run test:cloud:ui`: 14 browser tests passed after fixing dynamic reduced-motion handling. Existing account tests use provider fixtures, not actual mailbox delivery or production sign-ins.
- Additional browser checks at 375, 390, 768, and 1440px in both themes verified task interactions, animation, pause, free pricing links, and no horizontal overflow or page errors.
- Screenshots were produced and visually inspected for mobile Core and the example in desktop/mobile light mode.
- Production chunk advisory remains for the lazy-loaded Three.js Core (~918 KB, ~243 KB gzip). Physical-device frame rate, thermal behavior, and battery impact are not measured by browser emulation.

## Publication

Cloudflare Worker `nexyral` is published at `https://nexyral.online`. The existing D1 binding, AI/email secrets, and usage safeguards are preserved. No migrations, catalog creation, or payment transactions were performed.

Deployment uses the existing repository configuration, with `--keep-vars`. This environment needs writable temporary Wrangler configuration/log paths:

```sh
mkdir -p /tmp/nexyral-config
XDG_CONFIG_HOME=/tmp/nexyral-config WRANGLER_LOG_PATH=/tmp/nexyral-wrangler.log NODE_USE_ENV_PROXY=1 npx wrangler deploy --keep-vars
```

## Next work

Profile the Core on physical phones and evaluate adaptive render quality. Extend generation verification and isolated previews before claiming generated output is tested or deployable. Paid checkout can be added later using real Paddle catalog IDs, a sandbox client token, verified webhooks, and server-enforced entitlements.

Final Cloudflare deployment version: `ee01fe6b-6866-4b76-b747-039d5ed79e3d`.

Public post-deployment smoke checks returned HTTP 200 for Home, `/pricing`, and `/api/health`. Health reported AI generation and email-code delivery configured. A mobile browser smoke test against the actual public assets verified task interaction, visible Core rotation, dynamic reduced-motion response, free pricing, and no overflow/page errors. The browser's environment proxy certificate was handled by forwarding read-only public requests through Node's configured trusted CA; TLS verification stayed enabled. This check did not submit an AI request, send email, or make a payment.
