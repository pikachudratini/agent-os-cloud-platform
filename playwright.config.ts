import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['html', { open: 'never' }]],
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'mobile-375', use: { ...devices['iPhone 12'], viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 1000 } } }
  ]
});
