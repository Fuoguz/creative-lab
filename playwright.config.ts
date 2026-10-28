import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5177',
    channel: process.env.BROWSER_CHANNEL || 'msedge',
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--enable-webgl', '--ignore-gpu-blocklist'] },
  },
});
