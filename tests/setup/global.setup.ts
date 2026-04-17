import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { appConfig } from '../../test-data/env';

function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid PLAYWRIGHT_BASE_URL: ${url}`, { cause: error });
  }
}

/** 每次跑批前清空，避免 allure generate 把历史 *-result.json 合并进报告（用例数虚高、含已删用例） */
function resetAllureResultsDir(): void {
  const dir = path.join(process.cwd(), 'allure-results');
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // 目录不存在或不可删时忽略
  }
  fs.mkdirSync(dir, { recursive: true });
}

async function globalSetup(_config: FullConfig): Promise<void> {
  validateUrl(appConfig.baseURL);
  resetAllureResultsDir();
}

export default globalSetup;
