import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/cloud', testMatch: '**/*.spec.ts', timeout: 45000, workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4181', launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4181', url: 'http://127.0.0.1:4181', reuseExistingServer: false },
});
