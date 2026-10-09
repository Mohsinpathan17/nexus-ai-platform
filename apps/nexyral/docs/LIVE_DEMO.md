# Vercel public website demo

Public demo: https://nexyral-demo-d22728c3.vercel.app

Vercel deployment reached READY on 2026-10-07. Vercel authentication was disabled
for this newly created public-demo project only. The stable project alias passed unauthenticated HTTP 200 checks for Home and
Get Started. The initial deployment-specific URL was blocked by the network
proxy; the public project alias is accessible.

The Vercel project root must be `apps/nexyral`. `vercel.json` builds with
`npm run build:demo`, outputs `dist`, and supports client-side routes.
This build hides account forms, explains the public-demo boundary, and avoids
calling the local session API. Website sequences remain simulations.
SQLite, API services, model workers, source archives, and generated previews
are not hosted by this static demo.

For deployment from this environment, add VERCEL_TOKEN securely in environment
settings. Review/save the hosting requirements and publish the environment
configuration so credentials and networking apply. Never paste a token in chat.
Then run `npm run build:demo` and `npm run deploy:demo` from the app directory.
The helper submits only built static files to a uniquely named preview project;
it does not replace an existing production project. It stores non-secret
deployment metadata in ignored `.data/vercel-demo.json`.

A submitted deployment is not proof of a working public website. Check the
deployment reaches READY, confirm unauthenticated HTTPS access, and exercise
Home, both themes, mobile navigation, a deep route, and the demo account notice
before sharing the URL. Vercel deployment protection or account restrictions
may require adjustment in the hosting account. The provider request remains
untested until credentials are available.

Validated in this environment: `npm run build:demo` (TypeScript, compiled server,
Vite production build) and `npm run lint` passed. A real Chromium check passed
for Home at 390px, the deep-linked Get Started notice, absence of credential
inputs, no horizontal overflow, and no page errors. Vite's existing lazy-loaded
3D chunk size advisory remains. The Vercel credential was supplied securely and provider submission succeeded.
The deployment API confirmed READY and the project API confirmed no SSO
protection. Public HTTPS checks succeeded on the stable project alias.

Step 12 update: the existing NEXYRAL demo project now serves the interactive,
theme-aware computational Core and refreshed hero. Deployment READY, public
route HTTP 200 and checked-build JS/CSS hash comparisons passed. The helper now
reuses only validated recorded `nexyral-demo-*` project metadata rather than
creating a new project on every UI update; this updates that demo's public alias.
