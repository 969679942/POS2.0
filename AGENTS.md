# AGENTS.md

## Objective

This repository is a maintainable Playwright + TypeScript UI automation project for a POS/order frontend. Optimize for clarity, reuse, and long-term Codex maintenance, not one-off scripts.

## Interaction

- Address the user as `金将军`.
- Use respectful Chinese throughout replies.

## Automation Rules

- Use Playwright Test as the default runner.
- Prefer `data-testid` locators first for stable elements. Only fall back to other locator strategies such as `getByRole`, `getByLabel`, or `getByText` when no reliable `data-testid` is available.
- Prefer semantic locators such as `getByRole`, `getByLabel`, and `getByText`.
- Do not default to brittle CSS chains, nth-child selectors, or XPath.
- Do not use `waitForTimeout` in tests or helpers.
- Prefer `utils/wait.ts` `waitUntil()` for condition polling that may retry multiple times（未传 `timeout` 时默认 **10 秒**，见 `DEFAULT_WAIT_UNTIL_TIMEOUT_MS`）。Avoid `expect(...).toPass()` and `expect.poll()` in page objects, flows, helpers, and tests when they would create noisy intermediate failures in reports. Assert only the final settled result.
- Every method in `pages/` and `flows/` must use Chinese `@step(...)` descriptions for report display.
- Do not keep page/flow action descriptions only in comments; convert those descriptions into executable report steps.
- Every `describe` and `test` title must be written in Chinese.
- Test-case-level report steps must also use Chinese.
- Test-case-level metadata should use Playwright native `test(title, details, body)` style.
- Jira links should be declared in the `details.annotation` field, not via a custom wrapper helper.

## Page And Flow Boundaries

- `pages/` only holds page structure, locators, page-level actions, and page-level reads.
- `pages/` can do things like: click a button, fill an input, switch a tab, read a table number, return a locator or page data.
- All stable selectors in `pages/` must be centralized on the page object, either as class-level locator fields or dedicated private locator factory methods.
- Do not scatter raw `getByRole(...)`, `getByText(...)`, `locator(...)`, or selector strings throughout page action/read methods when those selectors belong to the page structure.
- If a selector is reused, semantically important, or represents a stable page element such as a button, dialog, input, tab, list, or summary area, define it once and consume it through the centralized page locator API.
- `pages/` must not contain business selection strategy or cross-step intent such as “select any available table”, “pick the first usable license”, “enter the system with employee context”, or other business-level decisions.
- `flows/` only holds business intent, multi-step orchestration, and selection strategy.
- `flows/` can combine multiple page actions, decide which record to pick, decide fallback order, and return business-level results.
- `flows/` must not redefine page locators or duplicate low-level page interaction details that belong in `pages/`.
- Do not mix `page` and `flow` responsibilities in the same method. If a method contains business policy or selection logic, move it to `flows/`. If a method only describes a single page action or read, keep it in `pages/`.

## Recommended Test Metadata Style

```ts
test(
  '应能通过授权选择和员工口令登录进入 POS 主页',
  {
    tag: ['@smoke'],
    annotation: [
      { type: 'issue', description: 'https://devtickets.atlassian.net/browse/POS-46667' },
      { type: 'issue', description: 'https://devtickets.atlassian.net/browse/POS-46668' },
    ],
  },
  async ({ homePage }) => {
    // ...
  },
);
```

## POS Domain Guidance

- Do not model the system like a SaaS app with one global login session.
- Treat "login" as employee context entry or employee switching during operations.
- Prefer expressing employee context through flows and fixtures.
- Keep room for optional API-assisted setup or `storageState`, but do not make that the default strategy.

## Navigation Rules

- Do not open POS inner pages by direct URL, hash, or deep link such as `#orderDishes`.
- Always enter the app from `http://192.168.0.89:22080/kpos/front2/myhome.html`, then navigate through the UI flow to the target page.
- Apply the same rule to every in-app page, not only the order-dishes page.

## 用例失败时的调试约定（Agent）

- 修改或新增 Playwright 用例后**应实际执行**相关 `npx playwright test …`，不得以「理论上应通过」代替验证。
- 若失败：对照报告中的**中文步骤**与 `test-results/**/error-context.md` 快照，判断当前步骤期望的 UI 是否已出现。
- **优先检查定位**：是否应落在 `#newLoginContainer iframe` 内、是否与侧栏等同名控件混淆、是否因已打卡/已登录等状态导致按钮文案从 Clock In 变为 Clock Out。
- 在 `pages/` 中**集中修正定位**（优先 `data-testid`，其次 `getByRole` / 文案），再重新运行同一用例直至通过或明确卡点（环境不可用、产品变更等）。

## Test Design

- **等待机制**：`playwright.config.ts` 中 `expect.timeout` 为 **30_000 ms**；`utils/wait.ts` 中 `waitUntil` 未传 `timeout` 时默认 **10_000 ms**（`DEFAULT_WAIT_UNTIL_TIMEOUT_MS`）。单条用例总超时由同文件 `timeout` 单独配置；个别长流程用例可用 `test.setTimeout` 放大整条用例上限。
- Smoke tests should validate stable availability signals only.
- E2E tests should express business intent instead of click-by-click scripts.
- Add stronger semantic locators or test ids before introducing fragile selectors.

## Project Structure

- Keep page objects lean. Put page-level structure and low-level actions in `pages/`.
- Put business intent and multi-step behavior in `flows/`.
- Put shared Playwright extensions in `fixtures/`.
- Put environment and sample domain data in `test-data/`.
- Put pure helpers in `utils/`.
