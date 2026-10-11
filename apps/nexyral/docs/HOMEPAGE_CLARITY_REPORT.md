# Homepage clarity and guided first project

Published 11 October 2026 at https://nexyral.online. Cloudflare version `eee33b15-4977-41bb-a268-3fbd4d66e1af`.

## Product decisions

The default homepage now explains the available product before introducing engineering concepts. Its first screen says **“Describe an app. AI writes the code.”** Supporting text describes the real output: screens and code for a web app, available for review and download. The original brand tagline remains visible and the interactive 3D Core is preserved.

The main path is: explain the product → describe an idea → try actual AI-built examples → watch the current-workspace walkthrough → answer common questions → start a project. The longer engine, memory, repair, verification, and deployment sections are inside an optional **Explore the engineering vision** disclosure, with an explicit distinction between current frontend generation and future workflows. The simulated engineering activity stream is separately collapsed underneath the real 30-second walkthrough.

Added a guided idea composer with booking-page, business-dashboard, and support-inbox starters. Visitors can edit the brief before continuing. The draft stays in browser session storage, never in a URL or an anonymous server-side project. Signup confirms the draft is saved; the authenticated workspace restores it. Successful project saving clears the landing draft. Blocked browser storage produces a recoverable explanation and retains the editable text.

A plain-language FAQ explains the output, coding requirements, free access/service capacity, source ownership, and the limits of current full-stack/deployment support. Typography, call-to-action hierarchy, mobile spacing, themes, native keyboard controls, and touch targets received a coordinated styling pass. No pricing, fake metrics, new inference runs, or paid dependencies were introduced.

## Files

Created:

- `src/lib/build-draft.ts`
- `src/sections/GettingStarted/GettingStarted.tsx`
- `src/sections/Questions/Questions.tsx`
- `src/styles/clarity.css`
- `tests/cloud/clarity.spec.ts`
- `docs/HOMEPAGE_CLARITY_REPORT.md`

Modified:

- `src/pages/Home.tsx` — simpler default section order and optional engineering content.
- `src/sections/Hero/Hero.tsx` — plain-language headline, explanation, and guided CTA.
- `src/sections/BuildDemo/BuildDemo.tsx` — current-workspace tour separated from simulated future execution.
- `src/sections/FinalCTA/FinalCTA.tsx` — returns visitors to the idea composer.
- `src/pages/CloudStudio.tsx` — restores and clears the landing draft.
- `src/components/account/CloudAccount.tsx` — draft confirmation and simpler account messaging.
- `src/main.tsx` — coordinated clarity stylesheet.
- `tests/cloud/studio.spec.ts` — authenticated draft restoration and successful-save clearing.
- `tests/cloud/live-examples.spec.ts` — scopes example switching to the live gallery rather than the distinct idea starters.
- `scripts/check-public-examples.mjs` — preserves actual live-gallery checks and adds public draft-to-signup/reload validation without creating an account or invoking inference.

No dependencies installed. Backend schema and provider configuration unchanged.

## Verification

- `npm run lint` passed with no lint warnings.
- `npm run build:cloud` passed frontend/server TypeScript, Cloudflare type checking, and Vite production build.
- `npm run test:cloud:ui`: **25 passed**, none skipped. Authentication/provider scenarios use fixtures; these are not claimed as live provider/account tests.
- `npm run test:cloud`: **16 passed**, none skipped.
- `npm run test:showcase:live`: all three saved, genuinely AI-generated apps passed their actual interaction checks at 1440px and 390px; the deployed composer → signup → draft confirmation → reload path also passed. This used actual public HTTPS responses through TLS-verified Node fetch; no generated output was mocked and no inference request was made. No browser page/console errors or page/preview overflow were observed in this live run.
- Responsive suite checked both themes at 375, 390, 430, 768, and 1440px without horizontal page overflow. Separate visual checks used actual saved AI output with the current local production bundle at 390, 768, and 1440px in both themes. Hero and composer screenshots were produced and inspected in `artifacts/clarity-*.png` and `artifacts/composer-*.png`.
- `wrangler deploy` published the version above to the existing root custom domain.
- `git diff --check` passed.

Two initially failing gallery tests were diagnosed as ambiguous selectors after adding a starter with the same subject. They now select the live-example group explicitly; no assertions or scenarios were removed.

The local Vite-only preview can log proxy connection warnings where tests intentionally do not start the legacy API. The deployed Cloudflare API and actual public examples were checked separately. Vite's existing lazy 3D chunk advisory remains: approximately 918 KB / 244 KB gzip; main entry approximately 458 KB / 145 KB gzip. No physical-device performance certification, guaranteed comprehension, or error-free code-generation claim is made.

Next product work: improve generated-project review and connect real backend/deployment contracts. Next design validation: observe first-time visitors completing a brief and identify wording or steps that still confuse them.
