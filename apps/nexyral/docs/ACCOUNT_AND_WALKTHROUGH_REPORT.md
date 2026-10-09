# Account and walkthrough update

Implemented October 9, 2026 for the public serverless site at https://nexyral.online.

Update: new email signup verification has since been replaced with six-digit codes. The historical link-flow notes below describe the earlier deployment; see [current verification-code setup](EMAIL_CODE_SETUP.md) for the current implementation and delivery prerequisite. Firebase links remain supported for recovery and previously issued verification emails.

## Delivered

- Redesigned account screens with an editorial layout, larger labels and inputs, password visibility control, accessible notices, and responsive light/dark styling.
- Added Google sign-in using Firebase's Google provider. The live provider configuration returned a valid OAuth authorization URL; actual consent/account sign-in still needs an owner test. GitHub remains conditional on configured OAuth credentials.
- Added a branded verification/password recovery action page at `/auth/action`. Verification requires an explicit confirmation; expired links display recovery guidance. Recovery uses Firebase action codes, not an invented email OTP system.
- Self-hosted licensed Manrope and Space Grotesk fonts; increased readable body and navigation typography.
- Recorded an actual 30-second walkthrough of the React workspace using a clearly labelled example account and example generated output. Added native video playback, captions, transcript, poster and download fallback. The recording does not claim AI generation finishes in 30 seconds or that generated source has been built or tested.

## Created files

`src/components/account/CloudAccount.tsx`, `src/pages/EmailAction.tsx`, `src/components/ui/BuildWalkthrough.tsx`, `src/styles/account.css`, `src/styles/fonts.css`, `scripts/record-walkthrough.ts`, this report, and `public/media/nexyral-how-to-build.mp4`, its VTT captions and walkthrough poster. `public/fonts/` contains the two font files and their OFL licences.

## Modified files

`src/pages/CloudStudio.tsx`, `src/app/App.tsx`, `src/main.tsx`, `src/styles/typography.css`, `src/styles/story.css`, `src/sections/BuildDemo/BuildDemo.tsx`, `src/sections/Hero/Hero.tsx`, `index.html`, and `tests/cloud/studio.spec.ts`.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build:cloud`: passed, including Cloudflare TypeScript checking.
- `npm run test:cloud:ui`: 10 tests passed. Coverage includes account navigation, verification/recovery requests, verification success/expiry, project generation retry/download, Google control visibility, actual video playback, and both themes at 375, 390, 430, 768 and 1440 pixels without page overflow.
- `ffprobe`: published video duration 30.000000 seconds; 481,985 bytes, H.264 MP4.
- Visual inspection: desktop hero, mobile hero, both account themes, and recorded workspace frames.
- `npm run preflight:cloud`: passed before deployment.
- `wrangler deploy`: published root-domain version `8af132dd-7ae7-4911-9427-c2b52369a015`.
- Public HTTPS requests: homepage, signup, action page, health, captions and fonts returned 200. Video returned `video/mp4` and the complete asset (200 rather than 206 for the range request). Actual published video playback passed with duration 30 seconds. A browser using a TLS-verified Node request bridge rendered the deployed signup with Google control, loaded Manrope, had no mobile overflow, and reported no page errors. This validates deployed content; it does not substitute for a real Google consent or inbox delivery test.

Account operations in browser tests use fixtures, not real emails or Google consent. No new application dependencies were installed. The existing Playwright tooling downloaded its official FFmpeg runtime for recording. To regenerate the optional recording, run a cloud production build, preview on port 4182, install Playwright's FFmpeg runtime, and run `node scripts/record-walkthrough.ts`; system FFmpeg and Chromium are also required. These are recording tools, not production runtime requirements.

The lazy Three.js chunk remains approximately 917.53 KB (243.27 KB gzip), with Vite's size advisory. It does not prevent a successful build.

## Email configuration still required

Firebase sends the verification and reset emails. This app does not control its sender reputation or inbox placement. No custom transactional mail credentials or Firebase administrator identity are configured, and spam placement has not been resolved or tested with a real inbox.

In Firebase Authentication, review the public-facing app name and support address in the Google provider settings. Set the public name to **NEXYRAL**. In **Templates → Email address verification**, set sender name **NEXYRAL**, review the subject, and set the custom action URL to **https://nexyral.online/auth/action**. Configure the same action URL for password recovery. Firebase adds its signed action parameters to this URL; do not paste a bare URL into an email in place of the action-link placeholder. Some built-in Firebase template fields are locked.

For fully branded HTML email with a clickable button and a sender at `@nexyral.online`, a verified transactional sender and server-side Firebase action-link generation need to be configured securely. SPF/DKIM/DMARC must match that chosen mail provider; don't invent DNS values or remove DMARC. Numeric verification codes require a separate, rate-limited and expiring OTP flow; current verification uses Firebase's secure email link.

After saving templates, test a real signup, click the complete verification link, return to the workspace, test recovery, and check actual delivery in the intended inboxes. Never share API keys, passwords or verification links in chat.

## Next production work

Verify real Google consent and branded email delivery; configure GitHub OAuth separately; add isolated build/test execution for generated projects and validate provider quotas and retention policies. The current Gemini integration generates frontend source, with verification explicitly marked as not run.
