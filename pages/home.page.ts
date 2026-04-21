import { expect, type Locator, type Page } from '@playwright/test';
import { AdminPage } from './admin.page';
import { DeliveryPage } from './delivery.page';
import { HomeMessagesPage } from './home-messages.page';
import { OrderDishesPage } from './order-dishes.page';
import { PickUpPage } from './pick-up.page';
import { RecallPage } from './recall.page';
import { ReportPage } from './report.page';
import { SelectTablePage } from './select-table.page';
import { appConfig } from '../test-data/env';
import { expectPathname } from '../utils/expectations';
import { step } from '../utils/step';
import { waitUntil } from '../utils/wait';

export class HomePage {
  private readonly appFrame: ReturnType<Page['frameLocator']>;
  private readonly openDrawerButton: Locator;
  /** 主页员工 Boss 入口（优先按钮语义，回退精确文案） */
  private readonly bossClockInEntry: Locator;
  /** 点击 Boss 后出现在应用 iframe 内的欢迎/打卡弹层（勿与侧栏「Clock In/Out」卡片混淆） */
  private readonly bossClockInWelcomeDialog: Locator;
  /** 仅位于上述 dialog 内的「上班打卡」按钮（可访问名常含图标前缀，如 ClockedInIcon Clock In） */
  private readonly clockInOnBossPanel: Locator;
  /** 首页顶栏主题切换（中英可访问名均可能出现） */
  private readonly themeToggleButton: Locator;
  /** 顶栏语言切换（地球图标入口，可访问名常为 language） */
  private readonly languageMenuButton: Locator;
  /** 顶栏消息（铃铛图标入口，可访问名常为 message） */
  private readonly messageMenuButton: Locator;
  /** 顶栏刷新入口 */
  private readonly refreshButton: Locator;

  constructor(private readonly page: Page) {
    this.appFrame = this.page.frameLocator('#newLoginContainer iframe');
    this.openDrawerButton = this.appFrame.getByRole('button', { name: 'Open drawer' });
    this.bossClockInEntry = this.appFrame
      .getByRole('button', { name: /^Boss$/i })
      .or(this.appFrame.getByText('Boss', { exact: true }));
    this.bossClockInWelcomeDialog = this.appFrame.getByRole('dialog').filter({ hasText: /Welcome/i });
    this.clockInOnBossPanel = this.bossClockInWelcomeDialog
      .getByRole('button', { name: /Clock\s*In/i })
      .filter({ hasNotText: /Clock\s*In\s*\/\s*Out/i });
    this.themeToggleButton = this.appFrame
      .getByRole('button', { name: /切换到(Light|Dark)模式/ })
      .or(this.appFrame.getByRole('button', { name: /Switch to (Light|Dark)/i }))
      .or(
        this.appFrame
          .getByRole('toolbar', { name: /menu group/i })
          .getByRole('button', { name: /Light|Dark|浅色|深色/i }),
      )
      .first();
    this.languageMenuButton = this.appFrame
      .getByRole('button', { name: /^language$/i })
      .or(this.appFrame.getByRole('button', { name: /语言|語言|Globe/i }))
      .first();
    this.messageMenuButton = this.appFrame
      .getByRole('button', { name: /^message$/i })
      .or(this.appFrame.getByRole('button', { name: /消息|通知|Notice/i }))
      .first();
    this.refreshButton = this.appFrame
      .getByRole('button', { name: /Refresh|刷新/i })
      .or(this.appFrame.getByRole('button', { name: /RefreshIcon/i }))
      .first();
  }

  private resolveEnglishLanguageOption(): Locator {
    return this.appFrame
      .getByRole('menuitem', { name: /English/i })
      .or(this.appFrame.getByRole('option', { name: /^English\b/i }))
      .first();
  }

  private resolveSimplifiedChineseLanguageOption(): Locator {
    return this.appFrame
      .getByRole('menuitem', { name: /简体中文/ })
      .or(this.appFrame.getByRole('option', { name: /简体中文/ }))
      .or(this.appFrame.getByText('简体中文', { exact: true }))
      .first();
  }

  @step('页面操作：打开 POS 首页')
  async goto(): Promise<void> {
    await this.page.goto(appConfig.homePath);
  }

  @step('页面操作：确认 POS 首页已经加载完成')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(appConfig.homeTitle);
    await expectPathname(this.page, appConfig.homePath);
  }

  @step('页面操作：确认员工已经进入 POS 主页状态')
  async expectEmployeeReady(): Promise<void> {
    await expect(this.resolveFunctionButton('Dine In')).resolves.toBeDefined();
  }

  @step('页面操作：确认主页已显示 Boss 打卡入口')
  async expectBossClockInEntryVisible(): Promise<void> {
    await expect(this.bossClockInEntry.first()).toBeVisible({ timeout: 15_000 });
  }

  @step('页面读取：判断 Boss 区域下方是否已出现 Clocked in at 时间提示')
  async isClockedInAtAlreadyShownBelowBoss(): Promise<boolean> {
    const bossRegionWithClockedIn = this.appFrame
      .locator('div, section, article')
      .filter({ has: this.bossClockInEntry })
      .filter({ hasText: /Clocked in at/i })
      .first();
    if (await bossRegionWithClockedIn.isVisible().catch(() => false)) {
      return true;
    }
    return await this.appFrame
      .getByText(/^Clocked in at\b/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  @step('页面操作：点击 Boss 打开打卡相关弹层')
  async clickBossToOpenClockPanel(): Promise<void> {
    await this.bossClockInEntry.first().click();
  }

  @step('页面操作：确认应用 iframe 内 Boss 弹层已就绪（可 Clock In，或已上班显示 Clock Out / 主页 Clocked in at）')
  async expectBossClockDialogReady(): Promise<void> {
    await expect(this.bossClockInWelcomeDialog).toBeVisible({ timeout: 15_000 });
    const clockInBtn = this.clockInOnBossPanel.first();
    const clockOutBtn = this.bossClockInWelcomeDialog.getByRole('button', { name: /Clock\s*Out/i });
    const clockedOnHome = this.appFrame.getByText(/Clocked in at/i);
    await waitUntil(
      async () =>
        (await clockInBtn.isVisible().catch(() => false)) ||
        (await clockOutBtn.first().isVisible().catch(() => false)) ||
        (await clockedOnHome.first().isVisible().catch(() => false)),
      (ok) => ok,
      {
        timeout: 15_000,
        message:
          'Boss 弹层未就绪：未找到 Clock In、未找到 Clock Out，且未见 Clocked in at（可能尚未打开弹层或文案变更）',
      },
    );
  }

  @step('页面操作：若 iframe 内弹层存在 Clock In 则点击完成上班打卡（已上班则跳过）')
  async clickClockInOnBossPanelIfVisible(): Promise<void> {
    const clockIn = this.clockInOnBossPanel.first();
    if (await clockIn.isVisible().catch(() => false)) {
      await clockIn.evaluate((el) => {
        (el as HTMLElement).click();
      });
    }
  }

  @step('页面操作：确认 Boss 区域附近出现 Clocked in at 时间提示')
  async expectClockedInAtLineVisible(): Promise<void> {
    const nearBoss = this.appFrame
      .locator('div, section, article')
      .filter({ has: this.bossClockInEntry })
      .filter({ hasText: /Clocked in at/i })
      .first();
    const clockedInAnywhere = this.appFrame.getByText(/Clocked in at/i).first();
    await waitUntil(
      async () =>
        (await nearBoss.isVisible().catch(() => false)) ||
        (await clockedInAnywhere.isVisible().catch(() => false)),
      (ok) => ok,
      { timeout: 25_000, message: '未检测到 Clocked in at 打卡成功提示' },
    );
  }

  @step('页面读取：读取主页顶栏主题切换控件当前展示的 Light 或 Dark')
  async readThemeToggleDisplayLabel(): Promise<'Light' | 'Dark'> {
    await expect(this.themeToggleButton).toBeVisible({ timeout: 15_000 });
    const inner = (await this.themeToggleButton.innerText()).replace(/\s+/g, ' ').trim();
    const aria = (await this.themeToggleButton.getAttribute('aria-label')) ?? '';
    const bucket = `${inner} ${aria}`;

    if (/\bdark\b|深色|Dark模式/i.test(bucket) && !/\blight\b|浅色|Light模式/i.test(bucket)) {
      return 'Dark';
    }
    if (/\blight\b|浅色|Light模式/i.test(bucket)) {
      return 'Light';
    }
    if (/\bdark\b/i.test(bucket)) {
      return 'Dark';
    }

    throw new Error(`无法从主题切换控件解析 Light/Dark，innerText=${JSON.stringify(inner)} aria-label=${JSON.stringify(aria)}`);
  }

  @step('页面操作：点击主页顶栏主题切换控件')
  async clickThemeToggle(): Promise<void> {
    await expect(this.themeToggleButton).toBeVisible({ timeout: 15_000 });
    await this.themeToggleButton.click();
  }

  @step('页面操作：确认顶栏语言（地球图标）入口可见')
  async expectLanguageMenuButtonVisible(): Promise<void> {
    await expect(this.languageMenuButton).toBeVisible({ timeout: 15_000 });
    await expect(this.languageMenuButton.getByRole('img', { name: /GlobeIcon|globe/i })).toBeVisible({
      timeout: 5_000,
    });
  }

  @step('页面操作：打开顶栏语言选择列表')
  async openLanguageMenu(): Promise<void> {
    await expect(this.languageMenuButton).toBeVisible({ timeout: 15_000 });
    if (await this.resolveSimplifiedChineseLanguageOption().isVisible().catch(() => false)) {
      return;
    }
    await this.languageMenuButton.click();
    await expect(this.resolveSimplifiedChineseLanguageOption()).toBeVisible({ timeout: 10_000 });
  }

  @step('页面操作：在已打开的语言列表中点击 English')
  async clickLanguageOptionEnglish(): Promise<void> {
    await expect(this.resolveEnglishLanguageOption()).toBeVisible({ timeout: 10_000 });
    await this.resolveEnglishLanguageOption().click();
  }

  @step('页面操作：在已打开的语言列表中点击简体中文')
  async clickLanguageOptionSimplifiedChinese(): Promise<void> {
    await expect(this.resolveSimplifiedChineseLanguageOption()).toBeVisible({ timeout: 10_000 });
    await this.resolveSimplifiedChineseLanguageOption().click();
  }

  @step('页面操作：确认语言列表中 English 为当前选中项（√ / CheckIcon / aria-selected / aria-checked）')
  async expectEnglishLanguageOptionShowsSelectionIndicator(): Promise<void> {
    const row = this.resolveEnglishLanguageOption();
    await expect(row).toBeVisible({ timeout: 10_000 });
    const ariaSelected = await row.getAttribute('aria-selected');
    const ariaChecked = await row.getAttribute('aria-checked');
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    const hasTick = /[√✓✔]/.test(text);
    const hasCheckIcon = await row.getByRole('img', { name: /CheckIcon|check/i }).isVisible().catch(() => false);
    if (ariaSelected === 'true' || ariaChecked === 'true' || hasTick || hasCheckIcon) {
      return;
    }
    throw new Error(
      `未识别到 English 为当前选中项：aria-selected=${JSON.stringify(ariaSelected)} aria-checked=${JSON.stringify(ariaChecked)} innerText=${JSON.stringify(text)}`,
    );
  }

  @step('页面操作：确认主页堂吃、外送功能卡已显示中文文案')
  async expectPrimaryFunctionCardsShowDineInAndDeliveryChinese(): Promise<void> {
    await expect(this.appFrame.getByTestId('pos-ui-function-card-dine_in')).toContainText(/堂吃/, {
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-delivery')).toContainText(/外送|外帶/, {
      timeout: 15_000,
    });
  }

  @step('页面读取：判断堂吃功能卡是否已显示中文「堂吃」')
  async isDineInFunctionCardShowingChineseLabel(): Promise<boolean> {
    const card = this.appFrame.getByTestId('pos-ui-function-card-dine_in');
    if (!(await card.isVisible().catch(() => false))) {
      return false;
    }
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    return /堂吃/.test(text);
  }

  @step('页面操作：确认顶栏消息（铃铛）入口可见')
  async expectMessageBellButtonVisible(): Promise<void> {
    await this.expectShellWithoutEmployeePasscodeGate();
    await expect(this.messageMenuButton).toBeVisible({ timeout: 15_000 });
    await expect(this.messageMenuButton.getByRole('img', { name: /RingIcon|ring|bell/i })).toBeVisible({
      timeout: 5_000,
    });
  }

  @step('页面操作：点击顶栏消息入口并进入消息页')
  async openMessageCenter(): Promise<HomeMessagesPage> {
    await this.expectShellWithoutEmployeePasscodeGate();
    await expect(this.messageMenuButton).toBeVisible({ timeout: 15_000 });
    await this.messageMenuButton.click();
    return new HomeMessagesPage(this.page);
  }

  @step('页面操作：确认主页的核心功能入口已经可用')
  async expectPrimaryFunctionCardsVisible(): Promise<void> {
    await expect(this.appFrame.getByTestId('pos-ui-function-card-dine_in')).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-delivery')).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-pickup')).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-report')).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-admin')).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.appFrame.getByTestId('pos-ui-function-card-recall')).toBeVisible({
      timeout: 15_000,
    });
  }

  @step('页面操作：点击 Dine In 入口并进入选桌页')
  async clickDineIn(): Promise<SelectTablePage> {
    await this.clickDineInOnceAndSettleRoute();
    if (/#order[_-]?dishes/i.test(this.page.url())) {
      const orderDishesPage = new OrderDishesPage(this.page);
      await orderDishesPage.exitResumedOrderToHomeShell();
      await this.clickDineInOnceAndSettleRoute();
    }
    if (!/#table[_-]?v2/i.test(this.page.url())) {
      throw new Error(`Dine In 后未进入选桌页（#tableV2 等），当前 URL：${this.page.url()}`);
    }
    return new SelectTablePage(this.page);
  }

  @step('页面操作：确认主页未被员工口令遮罩（否则程序化点击 Dine In 可能无法切路由）')
  private async expectShellWithoutEmployeePasscodeGate(): Promise<void> {
    const gate = this.appFrame.getByRole('heading', {
      name: /Enter Your Passcode|Enter your passcode/,
    });
    await expect(gate).toBeHidden({ timeout: 25_000 });
  }

  @step('页面操作：点击一次 Dine In 并等待进入选桌或点餐路由')
  private async clickDineInOnceAndSettleRoute(): Promise<void> {
    await this.expectShellWithoutEmployeePasscodeGate();
    await this.clickFunctionButton('Dine In');
    await waitUntil(
      async () => {
        const url = this.page.url();
        return /#table[_-]?v2/i.test(url) || /#order[_-]?dishes/i.test(url);
      },
      (ok) => ok,
      { timeout: 45_000, message: '点击 Dine In 后未进入选桌或点餐路由（#tableV2 / #orderDishes）' },
    );
  }

  @step('页面操作：点击 Delivery 入口并进入 Delivery 页面')
  async clickDelivery(): Promise<DeliveryPage> {
    await this.clickFunctionButton('Delivery');
    return new DeliveryPage(this.page);
  }

  @step('页面操作：点击 Pick Up 入口并进入 Pick Up 页面')
  async clickPickUp(): Promise<PickUpPage> {
    await this.clickFunctionButton('Pick Up');
    return new PickUpPage(this.page);
  }

  @step('页面操作：点击 To Go 入口并进入点单页')
  async clickToGo(): Promise<OrderDishesPage> {
    await this.clickFunctionButton('To Go');
    return new OrderDishesPage(this.page);
  }

  @step('页面操作：点击 Report 入口并进入 Report 页面')
  async clickReport(): Promise<ReportPage> {
    await this.clickFunctionButton('Report');
    return new ReportPage(this.page);
  }

  @step('页面操作：点击 Admin 入口并进入 Admin 页面')
  async clickAdmin(): Promise<AdminPage> {
    await this.clickFunctionButton('Admin');
    return new AdminPage(this.page);
  }

  @step('页面操作：点击 Recall 入口并进入 Recall 页面')
  async clickRecall(): Promise<RecallPage> {
    await this.clickRefreshButton();
    await this.expectPrimaryFunctionCardsVisible();
    const recallClicked = await this.clickRecallInLoginIframe();
    if (!recallClicked) {
      await this.clickFunctionButton('Recall');
    }
    const recallPage = new RecallPage(this.page);
    await waitUntil(
      async () => {
        const url = this.page.url();
        const searchTriggerVisible = await this.page
          .getByTestId('recall2-search-trigger')
          .isVisible()
          .catch(() => false);
        return /#recall/i.test(url) || searchTriggerVisible;
      },
      (loaded) => loaded,
      {
        timeout: 25_000,
        interval: 250,
        message: '点击 Recall 后未进入 Recall 页面',
      },
    );
    return recallPage;
  }

  @step('页面操作：在登录壳 iframe 内点击 Recall 入口')
  private async clickRecallInLoginIframe(): Promise<boolean> {
    const loginIframe = this.page.locator('iframe[data-wujie-id="login"]');
    if (!(await loginIframe.isVisible().catch(() => false))) {
      return false;
    }

    const loginFrame = loginIframe.contentFrame();
    if (!loginFrame) {
      return false;
    }

    const recallButton = loginFrame.getByTestId('pos-ui-function-card-recall');
    if (!(await recallButton.isVisible().catch(() => false))) {
      return false;
    }

    await recallButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    return true;
  }

  @step('页面操作：点击主页刷新按钮')
  private async clickRefreshButton(): Promise<void> {
    await expect(this.refreshButton).toBeVisible({ timeout: 15_000 });
    await this.refreshButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
  }

  @step((buttonName: string) => `页面操作：点击主页中的 ${buttonName} 功能入口`)
  private async clickFunctionButton(buttonName: string): Promise<void> {
    const button = await this.resolveFunctionButton(buttonName);
    await button.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
  }

  @step((buttonName: string) => `页面操作：在主页中查找 ${buttonName} 功能入口，若未显示则展开更多菜单后查找`)
  private async resolveFunctionButton(buttonName: string): Promise<Locator> {
    const resolvedButton = await waitUntil(
      async () => {
        const visibleButton = await this.findVisibleFunctionButton(buttonName);

        if (visibleButton) {
          return visibleButton;
        }

        await this.openMoreMenu();
        return await this.findVisibleFunctionButton(buttonName);
      },
      (resolvedButton): resolvedButton is Locator => Boolean(resolvedButton),
      {
        timeout: 25_000,
        message: `Unable to find function button on home page: ${buttonName}.`,
      },
    );

    if (!resolvedButton) {
      throw new Error(`Unable to find function button on home page: ${buttonName}.`);
    }

    return resolvedButton;
  }

  @step('页面操作：点击更多菜单展开按钮')
  private async openMoreMenu(): Promise<void> {
    if (await this.openDrawerButton.isVisible().catch(() => false)) {
      await this.openDrawerButton.evaluate((el) => {
        (el as HTMLElement).click();
      });
    }
  }

  @step((buttonName: string) => `页面操作：查找当前已显示的 ${buttonName} 功能入口`)
  private async findVisibleFunctionButton(buttonName: string): Promise<Locator | null> {
    const buttons = this.resolveFunctionButtonLocator(buttonName);
    const count = await buttons.count();

    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);

      if (await button.isVisible().catch(() => false)) {
        return button;
      }
    }

    return null;
  }

  private resolveFunctionButtonLocator(buttonName: string): Locator {
    const mappedTestId = this.resolveFunctionButtonTestId(buttonName);

    if (mappedTestId) {
      return this.appFrame.getByTestId(mappedTestId);
    }

    return this.appFrame.getByRole('button', {
      name: buttonName,
      exact: true,
    });
  }

  private resolveFunctionButtonTestId(buttonName: string): string | null {
    switch (buttonName) {
      case 'Dine In':
        return 'pos-ui-function-card-dine_in';
      case 'Delivery':
        return 'pos-ui-function-card-delivery';
      case 'Pick Up':
        return 'pos-ui-function-card-pickup';
      case 'Report':
        return 'pos-ui-function-card-report';
      case 'Admin':
        return 'pos-ui-function-card-admin';
      case 'Recall':
        return 'pos-ui-function-card-recall';
      case 'To Go':
        return 'pos-ui-function-card-togo';
      default:
        return null;
    }
  }
}
