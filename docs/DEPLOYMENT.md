# Deploy NEXUS

The frontend runs on Vercel. The FastAPI backend runs as a Docker web service on Render because it needs a long-lived process for WebSockets. Use managed PostgreSQL for user accounts.

## 1. Push the latest project to GitHub

Vercel and Render deploy from GitHub, so the latest local files must be pushed to `main` first. Include the deployment changes in your GitHub update. Never upload `.env` files or paste secret values into GitHub.

## 2. Create the backend database

1. Sign in to Render and create a PostgreSQL database.
2. Keep the database in the same region as the API service.
3. Copy its **internal** connection string. Treat it like a password.

## 3. Deploy the API on Render

1. In Render, choose **New +** then **Web Service**, and connect `Mohsinpathan17/nexus-ai-platform`.
2. Select Docker as the runtime and set the root directory to `apps/api`.
3. Create the service and add these environment variables in its settings:

   - `DATABASE_URL`: the PostgreSQL internal connection string from step 2
   - `JWT_SECRET`: generate a unique random secret in Render; do not use the example value
   - `ENVIRONMENT`: `production`
   - `NEXUS_DEMO_MODE`: `true`
   - `ALLOWED_ORIGINS`: set this after the Vercel site is deployed, to its exact `https://...vercel.app` origin

4. Wait for the service to deploy. Copy its public URL, such as `https://nexus-api.example.onrender.com`.
5. Check `https://YOUR-API-URL/api/health`. The API should return `"status":"ok"` and database status `"ok"`.

## 4. Deploy the frontend on Vercel

1. Sign in to Vercel and choose **Add New...** then **Project**.
2. Import `Mohsinpathan17/nexus-ai-platform` from GitHub.
3. Set **Root Directory** to `apps/web`.
4. Add the environment variable `VITE_API_URL` with the Render API URL from step 4, without a trailing slash.
5. Deploy. Copy the Vercel domain assigned to the site.

## 5. Allow the Vercel site to call the API

1. In Render, edit the API's `ALLOWED_ORIGINS` variable and set it to the exact Vercel origin, for example `https://nexus-ai-platform.vercel.app`.
2. Save and redeploy the API.
3. In Vercel, redeploy the frontend after setting `VITE_API_URL`.
4. Open the Vercel site and run a mission. If it fails, check the browser console and both providers' deployment logs.

## Current deployment limits

Mission runs and their timeline/evidence are currently held in API process memory. They work while that API instance is running, but are lost when it restarts and are not shared across multiple instances. User accounts are stored in PostgreSQL. Do not scale the API to multiple instances until mission state is moved to shared storage.

The NEXUS workflow is a deterministic demo simulation. It does not connect to a real repository, run untrusted code, or deploy software to production.