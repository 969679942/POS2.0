import { expect, type Locator, type Page } from '@playwright/test';
import { AdminPage } from './admin.page';
import { DeliveryPage } from './delivery.page';
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

  constructor(private readonly page: Page) {
    this.appFrame = this.page.frameLocator('#newLoginContainer iframe');
    this.openDrawerButton = this.appFrame.getByRole('button', { name: 'Open drawer' });
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

  @step('页面操作：确认主页的核心功能入口已经可用')
  async expectPrimaryFunctionCardsVisible(): Promise<void> {
    await expect(this.resolveFunctionButton('Dine In')).resolves.toBeDefined();
    await expect(this.resolveFunctionButton('Delivery')).resolves.toBeDefined();
    await expect(this.resolveFunctionButton('Pick Up')).resolves.toBeDefined();
    await expect(this.resolveFunctionButton('Report')).resolves.toBeDefined();
    await expect(this.resolveFunctionButton('Admin')).resolves.toBeDefined();
    await expect(this.resolveFunctionButton('Recall')).resolves.toBeDefined();
  }

  @step('页面操作：点击 Dine In 入口并进入选桌页')
  async clickDineIn(): Promise<SelectTablePage> {
    await this.clickFunctionButton('Dine In');
    return new SelectTablePage(this.page);
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
    await this.clickFunctionButton('Recall');
    return new RecallPage(this.page);
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
        timeout: 10_000,
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
      await this.openDrawerButton.click();
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
