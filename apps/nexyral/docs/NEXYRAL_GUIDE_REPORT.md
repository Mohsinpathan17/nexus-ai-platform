# NEXYRAL Guide

## What shipped

A persistent, restrained “Need help?” launcher opens an accessible desktop dialog or mobile bottom sheet. Light and dark themes share the existing design tokens. The panel has readable typography, quick-help prompts, labeled AI responses, a conversation reset, failure states and a build-request handoff. It never opens automatically.

Quick help is available without an account. Signed-in visitors can ask Gemini for product guidance or a clear frontend app specification. “Use this in the workspace” saves the draft in session storage and opens the project request form, including when the workspace is already open. It does not generate, spend generation capacity or overwrite project source automatically.

The Guide has no tools, automatic project access, code-execution authority or access to secrets. Messages render as plain React text. The model receives an explicit description of current capabilities and unavailable backend/test/deployment features. AI answers are guidance, not proof of engineering verification.

## Server and data handling

`POST /api/cloud/guide` uses the existing Firebase signature verification and same-origin protection. Gemini credentials stay in the Worker. Requests are bounded, conversations are limited to four user turns, provider requests time out, and malformed or incomplete model responses fail explicitly. The endpoint has separate capacity counters: 10 attempts per account/day and `DAILY_GUIDE_LIMIT=50` attempts shared/day. These do not consume the software generation budget. Failed provider requests still consume an attempt to prevent retry storms.

Migration `0005_guide_usage.sql` adds daily usage metadata; it does not alter project data. Conversation text is not persisted in D1. The current tab keeps conversation in memory; refresh, clear, and account changes discard it. Gemini receives the submitted conversation and is subject to its applicable processing terms. The privacy page explains this.

## Validation

- Lint: passed with no application warnings.
- Production build: passed, including frontend, server and Cloudflare TypeScript.
- Cloud backend tests: 21 passed, including quota isolation, invalid conversations, provider failure and incomplete output.
- Dedicated Guide browser tests: 6 passed, covering both themes at 390/1440px, keyboard dismissal/focus restoration, guest help, retryable AI failures, and authenticated draft handoff. Auth/provider responses in these signed-in browser tests are fixtures.
- Screenshots inspected: `artifacts/guide-390-light.png` and `artifacts/guide-1440-dark.png`.
- Full browser regression: 43 passed initially; the privacy-page count assertion was updated for the new Guide disclosure, and that test then passed. All 44 cases passed across the regression run and targeted recheck.
- Public production checks: quick help, keyboard focus restoration, modal background recovery and no page overflow passed at 390, 768 and 1440px in both themes. No browser console/page errors observed. Unauthenticated AI request returned 401. These use actual HTTPS production responses, not fixture responses.
- Remote migration applied successfully. Cloudflare deployment version: `f6eb7205-b6d1-411f-bb59-520ae7ffa46e`. Public URL: https://nexyral.online.

## Files

Created: `cloudflare/guide.ts`, `cloudflare/migrations/0005_guide_usage.sql`, `src/components/guide/GuideHost.tsx`, `src/components/guide/NexyralGuide.tsx`, `src/styles/guide.css`, `tests/cloud/guide.spec.ts`, `scripts/check-guide-live.mjs`, this report.

Modified: `cloudflare/worker.ts`, `cloudflare/cloud.test.ts`, `wrangler.jsonc`, `src/main.tsx`, `src/pages/CloudStudio.tsx`, `src/pages/PolicyPage.tsx`, `tests/cloud/studio.spec.ts`, `tests/cloud/preview.spec.ts`, `package.json` (live-check command only).

No dependencies added. Existing lazy 3D chunk size advisory remains. Real signed-in production Gemini guidance still needs a user session check; controlled tests must not be described as real customer authentication or production inference verification.

## Branding update — 12 October 2026

Removed underlying model branding from Guide labels, workspace controls/status, the refinement panel, public example provenance, product pages, documentation, privacy text and walkthrough captions. Privacy text still discloses external AI processing. Internal provider credentials and API routing remain intact.

Re-recorded the 30-second walkthrough with the current interface; example account/output labels remain. Build and lint passed, along with 21 backend tests and 15 affected browser cases. Production checks found no provider name in rendered homepage, Product, How It Works, Features, Documentation, Privacy, Workspace and Guide text. Published video and caption bytes matched the new assets. Deployment version: `6d3d5dfa-a6ca-41d8-b7d8-499c9e87314d`.

## Interface cleanup — 12 October 2026

Removed persistent technical footnotes from app previews and exports, simplified project success/status copy and public example captions, and replaced the prominent open-workspace caveat with an optional starter disclosure. Preview/export guidance is available in a closed details panel; documentation retains the technical limitations. Preview isolation and actual verification behavior are unchanged.

Lint and production build passed. Seventeen affected workflow/browser tests passed, followed by six final playground checks at 375, 768 and 1440px across both themes. The public preview interaction/edit/export checks passed at 390 and 1440px in both themes, with no browser errors or page overflow. The walkthrough video was refreshed and remains 30 seconds. Deployment version: `ee7c33d2-6253-4bce-af17-f7cff469140b`.
