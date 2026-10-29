import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: { command: 'npm run dev:web', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI },
  reporter: 'list'
});
