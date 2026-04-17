import { defineConfig, devices } from '@playwright/test';
import { appConfig } from './test-data/env';

const isCi = !!process.env.CI;

/**
 * 点餐页布局与视口：默认 1920×900（略缩高度便于底栏多露出一行，如 Save 所在行）。
 * - 可选：POS_VIEWPORT_MODE=maximized → viewport=null + --start-maximized。
 * - 数值覆盖：POS_VIEWPORT_WIDTH、POS_VIEWPORT_HEIGHT。
 */
const posViewportFixed = {
  width: Number(process.env.POS_VIEWPORT_WIDTH ?? 1920),
  height: Number(process.env.POS_VIEWPORT_HEIGHT ?? 900),
};

function resolveViewport(): { width: number; height: number } | null {
  if (!isCi && process.env.POS_VIEWPORT_MODE === 'maximized') {
    return null;
  }
  return posViewportFixed;
}

const playwrightViewport = resolveViewport();

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
  /** 单 POS 环境多 worker 易导致路由/登录互相干扰，默认串行更稳 */
  workers: 1,
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
    viewport: playwrightViewport,
    ...(playwrightViewport ? { deviceScaleFactor: 1 } : {}),
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: playwrightViewport,
        ...(playwrightViewport ? { deviceScaleFactor: 1 } : {}),
        headless: false,
        launchOptions: {
          args:
            !isCi && playwrightViewport === null ? ['--start-maximized'] : [],
        },
      },
    },
  ],
});
