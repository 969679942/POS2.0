import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '../utils/step';
import { waitUntil } from '../utils/wait';
import { HomePage } from './home.page';

export class OrderDishesPage {
  private readonly appFrame: ReturnType<Page['frameLocator']>;
  private readonly backButton: Locator;
  private readonly sendButton: Locator;
  private readonly payButton: Locator;
  private readonly countButton: Locator;
  private readonly firstAvailableDishButton: Locator;
  private readonly countDialog: Locator;
  private readonly countDialogInput: Locator;
  private readonly countDialogConfirmButton: Locator;
  private readonly priceDialog: Locator;
  private readonly priceInput: Locator;
  private readonly priceConfirmButton: Locator;
  private readonly specificationDialog: Locator;
  private readonly specificationConfirmButton: Locator;
  private readonly comboDialog: Locator;
  private readonly comboConfirmButton: Locator;
  private readonly cartButton: Locator;
  private readonly cartBadge: Locator;
  private readonly saveOrderButton: Locator;
  private readonly priceSummaryToggle: Locator;

  constructor(private readonly page: Page) {
    this.appFrame = this.page.frameLocator('iframe[data-wujie-id="orderDishes"]');
    this.backButton = this.appFrame.getByRole('button', { name: 'Back' });
    this.sendButton = this.appFrame.getByRole('button', { name: 'Send' });
    this.payButton = this.appFrame.getByRole('button', { name: 'Pay' });
    this.countButton = this.appFrame.getByRole('button', { name: /^(Count|数量)$/ });
    this.firstAvailableDishButton = this.appFrame.locator(
      'button:not([name*="Back"]):not([name*="Cart"]):not([name*="Send"]):not([name*="Pay"])',
    ).first();
    this.countDialog = this.appFrame.locator(
      '[data-testid="dish-count-modal"], [data-testid="option-count-modal"]',
    );
    this.countDialogInput = this.countDialog.locator('input').first();
    this.countDialogConfirmButton = this.countDialog.getByRole('button', {
      name: /^(Confirm|确认)$/,
    });
    this.priceDialog = this.appFrame.getByRole('dialog', { name: 'Enter Price' });
    this.priceInput = this.priceDialog.getByRole('textbox', { name: 'Price' });
    this.priceConfirmButton = this.priceDialog.getByRole('button', { name: 'Confirm' });
    this.specificationDialog = this.appFrame.getByRole('dialog', {
      name: 'Select Specifications',
    });
    this.specificationConfirmButton = this.specificationDialog.getByRole('button', {
      name: 'Confirm',
    });
    this.comboDialog = this.appFrame.locator('aside[class*="_panel_"]').filter({
      has: this.appFrame.getByRole('button', { name: 'Cancel', exact: true }),
    }).first();
    this.comboConfirmButton = this.comboDialog.locator('button', {
      hasText: /^(Confirm|确认)$/,
    }).first();
    this.cartButton = this.appFrame.getByRole('button', { name: 'Cart' });
    this.cartBadge = this.appFrame.locator('[data-testid="cart-badge"]');
    this.saveOrderButton = this.appFrame.locator('[data-testid="bottom-button-saveOrderBtn"]');
    this.priceSummaryToggle = this.appFrame.locator(
      '[data-test-id="shared-order-price-summary-toggle"], [data-testid="shared-order-price-summary-toggle"]',
    );
  }

  @step('页面操作：确认点餐页已加载')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#orderDishes/);
    await expect(this.backButton).toBeVisible();
    await expect(this.sendButton).toBeVisible();
    await expect(this.payButton).toBeVisible();
  }

  @step((tableNumber: string) => `页面操作：确认点餐页顶部桌号为 ${tableNumber}`)
  async expectTableNumber(tableNumber: string): Promise<void> {
    await expect(this.resolveTableNumberButton(tableNumber)).toBeVisible();
  }

  @step((guestCount: number) => `页面操作：确认点餐页顶部人数为 ${guestCount}`)
  async expectGuestCount(guestCount: number): Promise<void> {
    await expect(this.resolveGuestCountButton(guestCount)).toBeVisible();
  }

  @step((dishName: string) => `页面操作：点击菜品 ${dishName}`)
  async clickDish(dishName: string): Promise<void> {
    await this.expectLoaded();
    await this.resolveDishButton(dishName).click();
  }

  @step((quantity: number) => `页面操作：通过 Count 按钮将待点菜数量修改为 ${quantity}`)
  async changeDishCount(quantity: number): Promise<void> {
    await this.expectLoaded();
    await this.countButton.click();
    await expect(this.countDialog).toBeVisible();

    if (await this.countDialogInput.isVisible().catch(() => false)) {
      await this.countDialogInput.fill(String(quantity)).catch(async () => {
        await this.countDialogInput.evaluate((inputElement, nextValue) => {
          const input = inputElement as HTMLInputElement;
          input.value = String(nextValue);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, String(quantity));
      });
    } else {
      for (const digit of String(quantity)) {
        await this.resolveCountDialogNumberButton(digit).click();
      }
    }

    await this.countDialogConfirmButton.click();
    await expect(this.countDialog).toBeHidden();
  }

  @step('页面操作：点击第一个可用菜品')
  async clickFirstAvailableDish(): Promise<void> {
    await this.expectLoaded();
    await this.firstAvailableDishButton.click();
  }

  @step('页面操作：确认重量输入弹窗可见')
  async expectWeightDialogVisible(): Promise<void> {
    await expect(this.resolveWeightDialog()).toBeVisible({ timeout: 15_000 });
  }

  @step((weight: number) => `页面操作：输入重量 ${weight}`)
  async enterWeight(weight: number): Promise<void> {
    await this.enterWeightInDialog(weight);
  }

  /**
   * 称重弹窗：先聚焦重量输入框再填写，避免未激活输入导致填值失败。
   */
  @step((weight: number) => `页面操作：在称重弹窗中点击重量输入并填写 ${weight}`)
  async enterWeightInDialog(weight: number): Promise<void> {
    await this.expectWeightDialogVisible();
    const input = this.resolveWeightInput();
    await input.click();
    await input.fill(String(weight));
  }

  @step('页面操作：确认重量输入')
  async confirmWeightDialog(): Promise<void> {
    await this.expectWeightDialogVisible();
    await this.resolveWeightConfirmButton().click();
    await expect(this.resolveWeightDialog()).toBeHidden({ timeout: 15_000 });
  }

  @step('页面操作：确认价格输入弹窗可见')
  async expectPriceDialogVisible(): Promise<void> {
    await expect(this.priceDialog).toBeVisible();
  }

  @step((price: number) => `页面操作：输入价格 ${price}`)
  async enterPrice(price: number): Promise<void> {
    await this.expectPriceDialogVisible();
    await this.priceInput.fill(String(price));
  }

  @step('页面操作：确认价格输入')
  async confirmPriceDialog(): Promise<void> {
    await this.expectPriceDialogVisible();
    await this.priceConfirmButton.click();
  }

  @step('页面操作：确认规格选择弹窗可见')
  async expectSpecificationDialogVisible(): Promise<void> {
    await expect(this.specificationDialog).toBeVisible();
  }

  @step('页面操作：检查规格选择弹窗是否可见')
  async isSpecificationDialogVisible(): Promise<boolean> {
    return await this.specificationDialog.isVisible();
  }

  @step((spec: string) => `页面操作：选择规格 ${spec}`)
  async selectSpecification(spec: string): Promise<void> {
    await this.expectSpecificationDialogVisible();
    await this.resolveSpecificationButton(spec).click();
  }

  @step('页面操作：确认规格选择')
  async confirmSpecificationDialog(): Promise<void> {
    await this.expectSpecificationDialogVisible();
    await this.specificationConfirmButton.click();
  }

  @step(
    (sectionName: string, dishName: string, quantity: number = 1) =>
      quantity === 1
        ? `页面操作：在套餐区域 ${sectionName} 选择菜品 ${dishName}`
        : `页面操作：在套餐区域 ${sectionName} 选择菜品 ${dishName} 共 ${quantity} 份`,
  )
  async selectComboSectionItem(
    sectionName: string,
    dishName: string,
    quantity: number = 1,
  ): Promise<void> {
    if (quantity < 1) {
      return;
    }

    await this.resolveComboSectionItemButton(sectionName, dishName).click();

    for (let currentQuantity = 1; currentQuantity < quantity; currentQuantity += 1) {
      await this.resolveComboSectionItemPlusButton(sectionName, dishName).click();
    }
  }

  @step('页面操作：确认套餐选择')
  async confirmComboDialog(): Promise<void> {
    await this.comboConfirmButton.click();
  }

  @step('页面操作：确认购物车中有菜品')
  async expectCartHasItems(): Promise<void> {
    await expect(this.cartButton).toBeVisible();

    if (await this.cartBadge.isVisible()) {
      const count = await this.cartBadge.textContent();
      expect(Number(count)).toBeGreaterThan(0);
    }
  }

  @step('页面操作：保存订单')
  async saveOrder(): Promise<HomePage> {
    await this.saveOrderButton.scrollIntoViewIfNeeded();
    await this.saveOrderButton.click();
    await waitUntil(
      async () => this.page.url(),
      (url) => !/#orderDishes/.test(url),
      {
        timeout: 30_000,
        interval: 200,
        message:
          '保存订单后页面仍停留在点餐（URL 仍含 #orderDishes）。请确认 Save 已生效、无未关弹窗或阻塞提示。',
      },
    );
    return new HomePage(this.page);
  }

  @step('页面读取：读取点餐页价格汇总中的 Total 金额文本')
  async readPriceSummaryTotalText(): Promise<string> {
    await this.expectLoaded();

    const summaryRoot = this.priceSummaryToggle.first();
    await expect(summaryRoot).toBeVisible({ timeout: 15_000 });

    const dollarCell = summaryRoot.getByText(/^\$[\d,.]+$/);
    if (!(await dollarCell.first().isVisible().catch(() => false))) {
      await summaryRoot.click();
    }

    const directRows = summaryRoot.locator(':scope > div');
    const rowCount = await directRows.count();

    for (let index = 0; index < rowCount; index += 1) {
      const row = directRows.nth(index);
      const labelText = (await row.locator('span').first().textContent())?.trim();

      if (labelText === 'Total') {
        const valueText = (await row.locator('span').nth(1).textContent())?.trim() ?? '';

        if (!valueText) {
          throw new Error('点餐页价格汇总中 Total 对应金额为空');
        }

        return valueText;
      }
    }

    throw new Error('未在点餐页价格汇总区域解析到 Total 行');
  }

  /**
   * 称重弹窗：不同环境 accessible name / 根节点不同（`role="dialog"` 或 `pos-ui-modal`），在此集中兼容。
   */
  private resolveWeightDialog(): Locator {
    // 实际产品弹窗名为「Weight」（见 trace），旧版为「Enter Weight」；中文环境见注释内模式。
    const titlePattern = /^(Enter\s*)?Weight$|Enter\s*Weight|输入重量|称重|重量输入/i;

    return this.appFrame
      .getByRole('dialog', { name: titlePattern })
      .or(this.appFrame.locator('[data-testid="pos-ui-modal"]').filter({ hasText: titlePattern }))
      .or(
        this.appFrame
          .locator('[role="dialog"]')
          .filter({ hasNot: this.countDialog })
          .filter({ hasText: titlePattern })
          .first(),
      );
  }

  private resolveWeightInput(): Locator {
    const root = this.resolveWeightDialog();
    // 当前 POS 称重弹窗内 textbox 的 accessible name 为当前值（如「0」），非「Weight」。
    return root
      .getByRole('textbox')
      .first()
      .or(root.getByRole('textbox', { name: 'Weight' }))
      .or(root.getByRole('textbox', { name: /重量|Weight/i }))
      .or(root.getByPlaceholder(/weight|重量|lb|lbs|磅/i))
      .or(root.locator('input[type="text"], input[type="tel"], input[type="number"]').first());
  }

  private resolveWeightConfirmButton(): Locator {
    const root = this.resolveWeightDialog();
    return root
      .getByRole('button', { name: /^Confirm$/i })
      .or(root.getByRole('button', { name: /^确认$/ }))
      .or(root.getByRole('button', { name: /Confirm|确认/ }));
  }

  private resolveTableNumberButton(tableNumber: string): Locator {
    return this.appFrame.getByRole('button', {
      name: new RegExp(`TableIcon\\s*${tableNumber}`),
    });
  }

  private resolveGuestCountButton(guestCount: number): Locator {
    return this.appFrame.getByRole('button', {
      name: new RegExp(`SeatIcon\\s*${guestCount}`),
    });
  }

  private resolveDishButton(dishName: string): Locator {
    return this.appFrame.getByRole('button', { name: dishName, exact: true });
  }

  private resolveCountDialogNumberButton(digit: string): Locator {
    return this.countDialog.getByRole('button', { name: digit, exact: true });
  }

  private resolveSpecificationButton(spec: string): Locator {
    return this.specificationDialog.getByRole('button', { name: spec, exact: true });
  }

  private resolveComboSection(sectionName: string): Locator {
    return this.comboDialog
      .locator('div[class*="_sectionName_"]')
      .filter({
        hasText: new RegExp(`^${this.escapeRegExp(sectionName)}$`),
      })
      .first()
      .locator('xpath=ancestor::section[1]');
  }

  private resolveComboSectionItemCardShell(sectionName: string, dishName: string): Locator {
    return this.resolveComboSection(sectionName)
      .locator('span[class*="_itemTitle_"]', {
        hasText: new RegExp(`^${this.escapeRegExp(dishName)}$`),
      })
      .locator('xpath=ancestor::div[contains(@class,"_cardShell_")][1]');
  }

  private resolveComboSectionItemButton(sectionName: string, dishName: string): Locator {
    return this.resolveComboSectionItemCardShell(sectionName, dishName)
      .locator('xpath=.//button[not(contains(@class, "_counterBtn_"))][1]');
  }

  private resolveComboSectionItemPlusButton(sectionName: string, dishName: string): Locator {
    return this.resolveComboSectionItemCardShell(sectionName, dishName)
      .locator('button[class*="_counterBtnPlus_"]')
      .first();
  }

  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
