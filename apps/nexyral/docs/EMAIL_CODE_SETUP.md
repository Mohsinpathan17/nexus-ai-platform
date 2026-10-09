# NEXYRAL verification codes

October 9, 2026. New signups request a six-digit code, not Firebase's default verification link. The email sender is `NEXYRAL · nexyral.online <verify@nexyral.online>`. HTML and plain-text versions contain the code directly; the HTML footer uses a real clickable `https://nexyral.online` anchor.

Current configuration: after the owner saved the Resend key in Cloudflare, the public health endpoint returned HTTP 200 with `emailCodeDeliveryConfigured: true`. The Resend DKIM TXT and both sending CNAME records are publicly resolvable. The secret remains inside the Worker; its presence does not prove the key is valid, that Resend has completed domain verification, or that an email reached an inbox. A real owner signup/send test is still required.

## Owner setup

1. Sign up or sign in at https://resend.com. No Resend account authentication or API credential is currently available to this environment; it cannot create or manage your account without that access.
2. Add `nexyral.online` under Domains. Resend supplies the exact DNS records for domain verification and sending. Copy the public records to Cloudflare DNS or supply those public record names/types/values for the agent to configure. Preserve existing mail records and DMARC; sending records must use DNS only. Do not guess SPF or DKIM values. Sending-domain verification does not create a mailbox.
3. Once Resend marks the domain verified, create an API key scoped to sending email for this domain. Store it as the encrypted Worker secret `RESEND_API_KEY` in Cloudflare → Workers & Pages → nexyral → Settings → Variables and Secrets. Never paste it in chat or commit it.
4. A separate random `EMAIL_CODE_SECRET` must exist in the Worker. The deployment agent creates it securely for HMAC hashing. Keep it private; rotating it invalidates outstanding codes.
5. Test signup with a real inbox, confirm the code, try an incorrect code, resend after a minute and refresh the verified workspace. Check sender headers and inbox/spam placement. API configuration alone does not establish deliverability.

The implementation must not report successful sending if the provider fails. Without both secrets the API returns 503 with actionable delivery guidance; the account remains saved. Google users and previously verified Firebase accounts retain access.

## Verification model

The Firebase token is cryptographically verified before sending or accepting codes. Codes are tied to the Firebase user ID and exact email address. Correct confirmation writes a server-owned D1 verification record; this does **not** change Firebase's `emailVerified` property. NEXYRAL checks either a trusted Firebase verified claim or its matching D1 record before generating. Other services relying solely on Firebase verification do not inherit this record.

Codes use cryptographic randomness and HMAC-SHA256 storage, expire in 10 minutes, allow five guesses, and cannot be reused. Sends have a 60-second cooldown, a five-per-hour account cap and a 100-per-day deployment cap. These controls protect accounts and mail reputation. Plaintext codes are not stored in D1 or logged. Resend requests cannot follow redirects; mail API responses never expose provider credentials or internal details to the browser. No third-party tracking pixel is included.

`0002_email_codes.sql` is additive and preserves existing projects. Apply with `npx wrangler d1 migrations apply nexyral --remote` before deploying.

## Changes and checks

Added `cloudflare/email-codes.ts`, `cloudflare/email-codes.test.ts`, the D1 migration, and `src/components/account/EmailCodeVerification.tsx`. Updated Worker routing/generation checks, authenticated email claims, signup/verification UI, styles, API/browser tests, the walkthrough recorder, video, captions and transcript. No new dependencies.

Checks cover branded messages, hashed storage, expiry, attempt limits, ownership and email changes, single use, cooldown, failed sender delivery, mail budget, signed-token generation gating and mobile code entry. Provider requests in tests use fixtures, so they do not prove a real delivery or inbox placement. The 30-second recording is explicitly labelled example output.

Validated: lint and cloud production build passed; 11 backend tests and 11 browser tests passed. Remote D1 migration applied successfully and the private hashing secret was configured. Published Worker version `8f32f096-baad-4e32-b7ec-0fffdff24298`. Public health reports `emailCodeDeliveryConfigured: false`, accurately reflecting the missing Resend key. Anonymous verification endpoints returned 401. Updated captions returned 200, and the published MP4 exactly matches the verified 30.000000-second file (530,260 bytes). Vite still reports the known lazy 3D chunk size advisory.

Password recovery and old verification links continue through Firebase's existing action handler. Configure their Firebase sender/app templates separately if needed. New verification requests do not invoke `sendEmailVerification`.

## Delivery limitation

Domain authentication helps reputation, but no provider can guarantee inbox placement. Do not claim the spam issue fixed until real messages and sender authentication have been inspected. The owner has configured the Worker mail secret; Resend's final domain status and real delivery remain to be verified.
