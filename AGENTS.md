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

### 支付壳 `paymentPanel` 与「No Signature」（写支付相关步骤时优先按此核对）

- 无界 wujie 将**支付子应用**挂在 **`iframe[data-wujie-id="paymentPanel"]`** 内；「No Signature」等控件实际文档在该 iframe 的 **`contentFrame()`** 中，**仅在顶层 `page` 或无序遍历所有 iframe 时容易点不到或判不到**。
- **定位能稳定成功的原因（摘要）**：先**锚定** `paymentPanel` → **`waitFor({ state: 'visible' })`** 避免子应用未挂载 → 取 **`contentFrame()`**（若为空说明未就绪或隔离，不可在 `page` 上硬点）→ 在 **Frame** 内用 **`button[data-testid="button-default"]`** 并以文案 **`No Signature`（`exact: true`）收窄**，避免同页多个 `button-default` 误点；必要时回退 **`getByRole('button', { name: 'No Signature' })`**。
- **实现参考**：`pages/order-dishes.page.ts` 的 `paymentPanelIframeLocator`、`clickNoSignatureInPaymentPanelIfVisible`、`dismissCardSignatureIfPresent`；判断「仍在等签名」时与点击路径一致，优先在同一 **`contentFrame()`** 内查等待文案（见 `paymentPanelHasVisibleRegex`）。
- **未要求前不要改动**：**`No Tips`** 仍按「顶层 + 遍历 iframe」等与历史一致的策略；**不要把 `paymentPanel` 专用逻辑套到 No Tips**，除非产品或金将军明确要求。
- **同类问题迁移（其它用例快速上手）**：症状是「文案明明在屏上、Playwright 在 `page` 或点单 iframe 里永远找不到 / 点不到」时，优先怀疑 **另一层 wujie 子应用**：在快照或 DOM 里找 **`iframe[data-wujie-id="…"]`**（如 `orderDishes`、`paymentPanel`），对该 iframe **`waitFor` 可见 → `contentFrame()`**，再在 **Frame** 内用 **`data-testid` + 文案收窄**（或 `getByRole`）；**断言与点击必须在同一文档树**（读等待文案也在该 `Frame` 内查）。具体 `data-wujie-id` 以产品为准，**不要**把 `paymentPanel` + No Signature 的特例不加区分地套到所有交互上。

## Navigation Rules

- Do not open POS inner pages by direct URL, hash, or deep link such as `#orderDishes`.
- Always enter the app from `http://192.168.0.89:22080/kpos/front2/myhome.html`, then navigate through the UI flow to the target page.
- Apply the same rule to every in-app page, not only the order-dishes page.

## 用例失败时的调试约定（Agent）

- 修改或新增 Playwright 用例后**应实际执行**相关 `npx playwright test …`，不得以「理论上应通过」代替验证。
- 若失败：对照报告中的**中文步骤**与 `test-results/**/error-context.md` 快照，判断当前步骤期望的 UI 是否已出现。
- **优先检查定位**：是否应落在 `#newLoginContainer iframe` 内、是否与侧栏等同名控件混淆、是否因已打卡/已登录等状态导致按钮文案从 Clock In 变为 Clock Out；若涉及支付/无界嵌入 UI，核对是否应落在 **`iframe[data-wujie-id="paymentPanel"]`（或其它 wujie id）的 `contentFrame()`**（见「支付壳 paymentPanel」与上条「同类问题迁移」）。
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

--------------------------------------------------------------------------------
### 🛠️ 补充疑难杂症定位指南 (Agent Addendum)

#### 1. 登录壳 `#newLoginContainer` 与动态 ID 陷阱
- **现象**：定位 `#newLoginContainer` 内的输入框或按钮时，Selector 生成器生成了类似 `#username-123` 的 ID，导致下次运行失效。
- **根本原因**：登录壳虽然是 iframe，但其内部元素常使用随机生成的 `id` 属性（如 `id="field-1"`），这些 ID 在每次页面刷新时都会改变。
- **解决策略**：
    - **绝对禁止**使用 `id` 属性进行定位。
    - **首选** `data-testid`（如 `data-testid="login-username"`）。
    - **备选**使用 `getByLabel('Username')` 或 `getByPlaceholder('Enter username')`。
    - **上下文**：必须先通过 `page.frameLocator('#newLoginContainer')` 进入 iframe 上下文。

#### 2. 无界子应用通用加载阻塞 (WuJie Generic)
- **现象**：脚本运行到点击菜单（如“点单”或“报表”）时，报错 `Element not found`，但肉眼可见页面已经跳转。
- **根本原因**：无界框架卸载旧应用并挂载新应用（`iframe[data-wujie-id="xxx"]`）存在微秒级的 DOM 替换间隙。Playwright 可能拿到了旧的 iframe 引用，或者新 iframe 还没挂载完就去查内部元素。
- **解决策略**：
    - **导航后必须等待**：在点击导致页面跳转的按钮后，必须显式等待目标页面的标志性元素可见。
    - **代码逻辑**：先 `waitForSelector` 等待 `iframe[data-wujie-id="xxx"]` 可见，再获取 `contentFrame()`，最后操作内部元素。切勿在点击跳转后直接链式调用下一页的元素操作。

#### 3. 条件渲染导致的 `Locator` 缓存失效
- **现象**：代码中定义了 `const submitBtn = page.getByRole('button', { name: 'Submit' })`，但在点击 `submitBtn.click()` 时抛出 `Element is not attached to the page document`。
- **根本原因**：Playwright 的 `Locator` 对象虽然具有重试能力，但如果页面在两次操作之间发生了局部刷新（SPA 路由跳转或组件重新渲染），原来的 DOM 节点被销毁重建，Locator 持有的引用就会失效。
- **解决策略**：
    - **即用即查**：尽量避免在代码开头就将 Locator 赋值给常量并在几十行代码后使用。对于跨步骤、跨渲染周期的元素，建议在使用时直接调用 `page.getByRole...`。
    - **封装重试**：如果必须复用，将其封装在函数中，确保每次调用都是获取最新的 DOM 节点。

#### 4. 无头模式 (Headless) 与有头模式 (Headed) 的行为差异
- **现象**：脚本在本地 `headed` 模式下运行完美，但推送到 CI/CD (Jenkins/GitLab CI) 的 `headless` 模式下频繁报错 `TimeoutError` 或点击位置偏移。
- **根本原因**：
    - **分辨率差异**：CI 环境的默认视窗尺寸可能很小，导致元素被折叠进“汉堡菜单”或换行，导致无法点击。
    - **渲染速度**：Headless 模式渲染极快，有时会导致 JS 逻辑未执行完就进行断言。
- **解决策略**：
    - **固定视窗**：在 `playwright.config.ts` 中为 CI 环境设置合理的 `viewport`（如 `1920x1080`）。
    - **增加等待**：在关键步骤增加 `locator.waitFor({ state: 'visible', timeout: 5000 })`，不要依赖隐式等待。
    - **视频录制**：在 CI 环境开启 `trace` 和 `video` 录制，失败后下载视频直接查看 UI 状态。

--------------------------------------------------------------------------------
### 🧠 Agent 决策流程图 (供 AI 内部推理使用)

当 AI 遇到 "Element not found" 或 "Click intercepted" 错误时，请按此逻辑自检：

1.  **Is it in an iframe? (90% probability)**
    - Is the element inside a `data-wujie-id` container?
        - **Yes** -> Use `frameLocator('iframe[data-wujie-id="..."]')` + `contentFrame()`. **Must wait for visibility first**.
    - Is the element inside `#newLoginContainer`?
        - **Yes** -> Use `frameLocator('#newLoginContainer')`.
2.  **Is the ID dynamic?**
    - Does the selector contain numbers or random strings (e.g., `id="btn-123"` or `data-id="456"`)?
        - **Yes** -> Switch to `data-testid`, `aria-label`, or `getByRole`.
3.  **Timing Issue?**
    - Did we click a button that changes the page state right before this error?
        - **Yes** -> Add a `waitFor` for a stable element on the *target* page before proceeding.