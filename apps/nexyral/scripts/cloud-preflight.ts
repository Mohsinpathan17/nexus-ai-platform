import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import ts from 'typescript';
const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync('wrangler.jsonc', 'utf8'));
if (parsed.error) throw new Error('Invalid wrangler.jsonc syntax');
const config = parsed.config as {
  vars: { FIREBASE_PROJECT_ID: string; GEMINI_MODEL: string; DAILY_GENERATION_LIMIT: string };
  d1_databases: { database_id: string }[];
};
const web = loadEnv('production', process.cwd(), 'VITE_');
const missing = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'].filter(name => !web[name]);
if (!/^[a-f0-9-]{36}$/i.test(config.d1_databases[0]?.database_id ?? '')) missing.push('D1 database ID');
if (!config.vars.FIREBASE_PROJECT_ID || config.vars.FIREBASE_PROJECT_ID.startsWith('REPLACE_')) missing.push('Worker FIREBASE_PROJECT_ID');
const allowDisabledGeneration = process.argv.includes('--allow-disabled-generation');
if (!/^[a-z0-9.-]{1,100}$/.test(config.vars.GEMINI_MODEL) && !(allowDisabledGeneration && config.vars.GEMINI_MODEL === '')) missing.push('Worker GEMINI_MODEL');
if (web.VITE_FIREBASE_PROJECT_ID && web.VITE_FIREBASE_PROJECT_ID !== config.vars.FIREBASE_PROJECT_ID) missing.push('Matching frontend/Worker Firebase project');
const budget = Number(config.vars.DAILY_GENERATION_LIMIT);
if (!Number.isInteger(budget) || budget < 1 || budget > 1000) missing.push('Valid DAILY_GENERATION_LIMIT');
if (web.VITE_PUBLIC_DEMO === '1') missing.push('Disable VITE_PUBLIC_DEMO for real accounts');
if (missing.length) {
  console.error(`Cloud deployment configuration incomplete: ${missing.join(', ')}. See docs/FREE_SERVERLESS.md.`);
  process.exitCode = 1;
} else {
  console.log('Cloud configuration checks passed. Provider credentials, quotas and delivery still require staging verification.');
  if (!config.vars.GEMINI_MODEL) console.log('Staging only: AI generation remains disabled because no model is configured.');
}
