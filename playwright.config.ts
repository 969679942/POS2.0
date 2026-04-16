import { defineConfig, devices } from '@playwright/test';
import { appConfig } from './test-data/env';

export default defineConfig({
  testDir: './tests',
  /** 单条用例总超时（整条 `test` 执行上限，与下方 `expect.timeout` 等待机制分离） */
  timeout: 120_000,
  expect: {
    /** `expect(...)` 等断言的默认最长等待（等待机制，秒） */
    timeout: 30_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: false,
      },
    ],
  ],
  globalSetup: require.resolve('./tests/setup/global.setup'),
  use: {
    baseURL: appConfig.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // 与物理机一致 1920×1080；显式 viewport 以覆盖设备预设（如 Desktop Chrome 的 1280×720）
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
    },
  ],
});
