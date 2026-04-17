import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { parseUsdStringToNumber } from '../utils/money';
import { parsePriceSummaryToggleInnerText } from '../utils/price-summary';
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
  private readonly dishSearchOpenButton: Locator;

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
    this.dishSearchOpenButton = this.appFrame
      .getByRole('button', { name: /Search menu|搜索菜单/i })
      .or(this.appFrame.getByRole('button', { name: /^Search$/i }))
      .or(this.appFrame.getByRole('button', { name: /^搜索$/ }))
      .or(this.appFrame.locator('[aria-label="Search"]'))
      .or(this.appFrame.locator('[aria-label="搜索"]'));
  }

  @step('页面操作：确认点餐页已加载')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#order[_-]?dishes/i);
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
    await this.countButton.scrollIntoViewIfNeeded();
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
    const tag = await input.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'input' || tag === 'textarea') {
      await input.fill(String(weight));
      return;
    }
    await input.press('Control+a').catch(() => {});
    await input.pressSequentially(String(weight), { delay: 25 });
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

    await expect(this.comboDialog).toBeVisible({ timeout: 30_000 });
    await this.ensureComboSectionTabSelected(sectionName);
    await this.resolveComboSectionItemPrimaryButton(sectionName, dishName).click();

    for (let currentQuantity = 1; currentQuantity < quantity; currentQuantity += 1) {
      await this.resolveComboSectionItemPlusButton(sectionName, dishName).click();
    }
  }

  @step('页面操作：确认套餐选择')
  async confirmComboDialog(): Promise<void> {
    await waitUntil(
      async () => this.comboConfirmButton.isEnabled().catch(() => false),
      (ok) => ok,
      {
        timeout: 30_000,
        message: '套餐 Confirm 在超时内未变为可点，请检查必选分组是否已全部选择',
      },
    );
    await this.comboConfirmButton.click();
    await expect(this.comboDialog).toBeHidden({ timeout: 20_000 });
  }

  @step('页面操作：在套餐弹层中补齐 Selection* 等必选分组直至 Confirm 可点')
  async satisfyMandatoryComboSelectionsIfNeeded(): Promise<void> {
    const confirm = this.comboConfirmButton;
    for (let round = 0; round < 16; round++) {
      if (await confirm.isEnabled().catch(() => false)) {
        return;
      }
      const tabs = this.comboDialog.getByRole('button', { name: /^Selection/i });
      const tabCount = await tabs.count();
      if (tabCount === 0) {
        return;
      }
      await tabs.nth(round % tabCount).click();
      const withPrice = this.comboDialog.getByRole('button', { name: /\$/ }).first();
      if (await withPrice.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await withPrice.click();
      }
    }
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
      (url) => !/#order[_-]?dishes/i.test(url),
      {
        timeout: 30_000,
        interval: 200,
        message:
          '保存订单后页面仍停留在点餐（URL 仍含 #orderDishes / #order_dishes）。请确认 Save 已生效、无未关弹窗或阻塞提示。',
      },
    );
    return new HomePage(this.page);
  }

  @step('页面读取：读取点餐页价格汇总中的 Total 金额文本')
  async readPriceSummaryTotalText(): Promise<string> {
    await this.expectLoaded();

    const summaryRoot = this.priceSummaryToggle.first();
    await expect(summaryRoot).toBeVisible({ timeout: 15_000 });

    return await waitUntil(
      async () => {
        await summaryRoot.click().catch(() => {});

        const parsed = await summaryRoot.evaluate((root) => {
          const text = (root as HTMLElement).innerText ?? '';
          const strict =
            /(?:^|[\n\r])\s*(?:Total|总计|合计)\s*(\$[\d,.]+)/im.exec(text) ??
            /\b(?:Total|总计|合计)\s*(\$[\d,.]+)/im.exec(text);
          if (strict) {
            return strict[1];
          }
          const fb =
            /(?:^|[\n\r])\s*(?:Total Before Tips|合计（税前）|税前合计)\s*(\$[\d,.]+)/im.exec(text) ??
            /\b(?:Total Before Tips|合计（税前）|税前合计)\s*(\$[\d,.]+)/im.exec(text);
          return fb ? fb[1] : '';
        });

        return parsed;
      },
      (text) => Boolean(text),
      {
        timeout: 20_000,
        interval: 350,
        message: '未在点餐页价格汇总解析到 Total 或 Total Before Tips 金额',
      },
    );
  }

  @step('页面操作：打开点单页菜品搜索入口')
  async openDishSearchPanel(): Promise<void> {
    await this.expectLoaded();
    await expect(this.dishSearchOpenButton).toBeVisible({ timeout: 15_000 });
    await this.dishSearchOpenButton.click();
  }

  @step((keyword: string) => `页面操作：在点单页搜索菜品关键字 ${keyword}`)
  async applyDishSearchKeyword(keyword: string): Promise<void> {
    const input = this.resolveDishSearchTextInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(keyword);
    await input.press('Enter').catch(async () => {
      await this.appFrame.getByRole('button', { name: /^Search$/i }).click();
    });
  }

  @step((dishName: string) => `页面读取：确认搜索结果中可见菜品 ${dishName}`)
  async expectDishSearchResultVisible(dishName: string): Promise<void> {
    await expect(this.resolveDishButton(dishName)).toBeVisible({ timeout: 20_000 });
  }

  @step('页面读取：展开价格汇总并读取左侧标签到金额或数量的映射')
  async readPriceSummaryLabelAmountMap(): Promise<Record<string, string>> {
    await this.expectLoaded();
    const summaryRoot = this.priceSummaryToggle.first();
    await expect(summaryRoot).toBeVisible({ timeout: 15_000 });

    const mergedText = await waitUntil(
      async () => {
        const combined = await summaryRoot.evaluate((root) => {
          const el = root as HTMLElement;
          const btn = (el.closest('button') ?? el) as HTMLElement;
          return [btn.innerText, btn.getAttribute('aria-label'), el.getAttribute('aria-label')]
            .filter((part): part is string => Boolean(part && part.trim()))
            .join(' | ');
        });
        const parsed = parsePriceSummaryToggleInnerText(combined);
        if (parsed.Count && parsed.Subtotal) {
          return combined;
        }
        await summaryRoot.click().catch(() => {});
        return await summaryRoot.evaluate((root) => {
          const el = root as HTMLElement;
          const btn = (el.closest('button') ?? el) as HTMLElement;
          return [btn.innerText, btn.getAttribute('aria-label'), el.getAttribute('aria-label')]
            .filter((part): part is string => Boolean(part && part.trim()))
            .join(' | ');
        });
      },
      (combined) => {
        const parsed = parsePriceSummaryToggleInnerText(combined);
        return Boolean(parsed.Count && parsed.Subtotal);
      },
      {
        timeout: 18_000,
        interval: 450,
        message:
          '点餐页价格汇总未出现可解析的 Count 与 Subtotal（请尝试展开汇总区域或检查 aria-label）',
      },
    );

    return parsePriceSummaryToggleInnerText(mergedText);
  }

  @step('页面读取：汇总左侧已选菜品行上的份数')
  async readCartDishQuantitySumFromLines(): Promise<number> {
    await this.expectLoaded();
    const fromDetailItems = await this.appFrame.locator('body').evaluate(() => {
      let total = 0;
      for (const item of Array.from(document.querySelectorAll('[data-testid="pos-ui-dish-item"]'))) {
        const mainRow =
          item.querySelector('[class*="_mainRow_"]') ??
          item.querySelector('div[class*="mainRow"]') ??
          item;
        const spans = mainRow.querySelectorAll(':scope > div > span, :scope > span');
        const firstText = (spans[0]?.textContent ?? '').trim();
        const asNum = Number(firstText);
        total += Number.isFinite(asNum) && asNum > 0 ? asNum : 1;
      }
      return total;
    });
    if (fromDetailItems > 0) {
      return fromDetailItems;
    }
    return await this.readSeatDishLineButtonQuantitySum();
  }

  @step('页面读取：汇总左侧已选菜品行主价格（不含子项加价行）')
  async readCartMainDishLinePricesSumUsd(): Promise<number> {
    await this.expectLoaded();
    const fromDetailItems = await this.appFrame.locator('body').evaluate(() => {
      const items = document.querySelectorAll('[data-testid="pos-ui-dish-item"]');
      let sum = 0;
      for (const item of Array.from(items)) {
        const mainRow =
          item.querySelector('[class*="_mainRow_"]') ??
          item.querySelector('div[class*="mainRow"]') ??
          item;
        const text = (mainRow as HTMLElement).innerText ?? '';
        const amounts = [...text.matchAll(/\$[\d,.]+/g)].map((m) => m[0]);
        if (amounts.length === 0) {
          continue;
        }
        // 套餐行会把子项价格拼在主行后面，首个金额才是主套餐价格。
        const first = amounts[0].replace(/\$/g, '').replace(/,/g, '');
        sum += Number(first);
      }
      return sum;
    });
    if (fromDetailItems > 0) {
      return fromDetailItems;
    }
    return await this.readSeatDishLineButtonPricesSumUsd();
  }

  @step('页面读取：从座位区「份数 菜名 金额」行按钮回退解析份数之和')
  private async readSeatDishLineButtonQuantitySum(): Promise<number> {
    return await this.appFrame.locator('body').evaluate(() => {
      let total = 0;
      for (const btn of Array.from(document.querySelectorAll('button'))) {
        const text = ((btn as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim();
        if (!/^\d+\s+.+\$[\d,.]+/.test(text)) {
          continue;
        }
        if (/^Share For Whole Table$/i.test(text)) {
          continue;
        }
        const m = /^(\d+)\s/.exec(text);
        if (m) {
          total += Number(m[1]);
        }
      }
      return total;
    });
  }

  @step('页面读取：从座位区「份数 菜名 金额」行按钮回退解析主价格之和')
  private async readSeatDishLineButtonPricesSumUsd(): Promise<number> {
    return await this.appFrame.locator('body').evaluate(() => {
      let sum = 0;
      for (const btn of Array.from(document.querySelectorAll('button'))) {
        const text = ((btn as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim();
        if (!/^\d+\s+.+\$[\d,.]+/.test(text)) {
          continue;
        }
        if (/^Share For Whole Table$/i.test(text)) {
          continue;
        }
        const amounts = [...text.matchAll(/\$[\d,.]+/g)].map((m) => m[0]);
        if (amounts.length === 0) {
          continue;
        }
        // 形如「1 套餐 $169.78 子项A $10.00 子项B $5.89」时主价格是首个金额。
        const first = amounts[0].replace(/\$/g, '').replace(/,/g, '');
        sum += Number(first);
      }
      return sum;
    });
  }

  @step('页面操作：点击左下角 Pay 打开支付相关界面')
  async clickPay(): Promise<void> {
    await this.expectLoaded();
    await this.payButton.scrollIntoViewIfNeeded();
    await this.payButton.click();
  }

  /**
   * 步骤 5a：先点 Balance due 区 Cash 单选项（产品为 `span._radio__button_*` 内 Cash + $Price，与快捷金额一致）。
   * 金额仍从 radio 的 label/aria 解析，避免点到「save」等其它含 $ 的文案。
   */
  @step('页面操作：在支付弹层选择 Cash 单选项并读取该行应付现金金额')
  async clickCashPayOptionRow(): Promise<string> {
    const pf = await this.waitForPaymentAppFrame();
    await expect(pf.getByText(/Balance due|应付|待付/i).first()).toBeVisible({ timeout: 20_000 });

    const cashRadio = pf.getByRole('radio', { name: /Cash/i }).first();
    await expect(cashRadio).toBeAttached({ timeout: 20_000 });

    let labelText = await cashRadio.evaluate((el) => {
      const input = el as HTMLInputElement;
      return Array.from(input.labels ?? [])
        .map((label) => label.innerText)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    });
    if (!labelText) {
      labelText =
        (await cashRadio.getAttribute('aria-label')) ??
        (await cashRadio.getAttribute('title')) ??
        '';
    }

    const afterCash = /Cash\s*[^\d$]*(\$[\d,.]+)/i.exec(labelText);
    const priceToken = afterCash?.[1] ?? labelText.match(/\$[\d,.]+/)?.[0];
    if (!priceToken) {
      throw new Error(`未能从 Cash 单选项关联文案解析应付金额，label 文本: ${labelText || '(空)'}`);
    }

    const trimmedPrice = priceToken.trim();
    const radioButtonFace = pf
      .locator('span[class*="_radio__button_"]')
      .filter({ hasText: /Cash/i })
      .filter({ hasText: trimmedPrice });
    if (await radioButtonFace.first().isVisible().catch(() => false)) {
      const target = radioButtonFace.first();
      await target.scrollIntoViewIfNeeded();
      await target.click();
    } else {
      await cashRadio.evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        for (let depth = 0; depth < 12 && node; depth += 1) {
          node.scrollIntoView({ block: 'center', inline: 'center' });
          node = node.parentElement;
        }
        (el as HTMLInputElement).click();
      });
    }

    return trimmedPrice;
  }

  @step((amountText: string) => `页面操作：在支付数字键盘点击与 Cash 行一致的快捷金额 ${amountText}`)
  async tapKeypadQuickPayAmountIfPresent(amountText: string): Promise<void> {
    const pf = await this.waitForPaymentAppFrame();
    const candidates = this.buildKeypadAmountButtonCandidates(amountText);
    const needleDigits = amountText.replace(/[^\d]/g, '');
    await waitUntil(
      async () => {
        for (let index = 0; index < 16; index += 1) {
          const byTestId = pf.getByTestId(`payment-panel-quick-amounts-${index}`);
          if (!(await byTestId.isVisible().catch(() => false))) {
            continue;
          }
          const inner = await byTestId.innerText().catch(() => '');
          const rowDigits = inner.replace(/[^\d]/g, '');
          if (rowDigits.length > 0 && rowDigits === needleDigits) {
            await byTestId.scrollIntoViewIfNeeded();
            await byTestId.click();
            return true;
          }
        }
        for (const candidate of candidates) {
          const btn = pf.getByRole('button', { name: candidate, exact: true }).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click();
            return true;
          }
        }
        return false;
      },
      (ok) => ok === true,
      {
        timeout: 20_000,
        interval: 350,
        message: `未在支付 iframe 键盘区找到与 Cash 行一致的快捷金额（testid payment-panel-quick-amounts-* 或按钮文案，已尝试：${candidates.join(' | ')}）`,
      },
    );
  }

  @step('页面操作：若出现会员/入会壳层遮罩则关闭（Skip membership 及壳层按钮）')
  async dismissMembershipJoinPromptIfPresent(): Promise<void> {
    const waitCoverGone = async (): Promise<void> => {
      await this.page
        .locator('#floatcover3100, .mycover#floatcover3100')
        .first()
        .waitFor({ state: 'hidden', timeout: 4_000 })
        .catch(() => {});
    };

    const shellCover = this.page.locator('#floatcover3100, .mycover#floatcover3100').first();

    for (let pass = 0; pass < 3; pass += 1) {
      const coverVisible = await shellCover.isVisible().catch(() => false);
      const myalertnoSkip = this.page.locator('#myalertno').filter({ hasText: /Skip membership/i });
      const skipNoVisible = await myalertnoSkip.first().isVisible().catch(() => false);
      if (skipNoVisible) {
        await myalertnoSkip.first().click();
        await waitCoverGone();
        return;
      }
      // DOM 残留 `#myalertno` 时误点会跳离支付；仅在有遮罩挡点击时再 force。
      if (coverVisible && (await myalertnoSkip.count().catch(() => 0)) > 0) {
        await myalertnoSkip.first().click({ force: true });
        await waitCoverGone();
        return;
      }
      const shellButton = this.page
        .locator('#myalert, .myalert, .myalertBxBox')
        .locator('button, [role="button"]')
        .filter({ hasText: /Skip membership|Not now|Maybe later|No thanks|Later|Close|关闭|跳过|暂不/i })
        .first();
      const named = this.page
        .getByRole('button', {
          name: /Skip membership|Not now|Maybe later|No thanks|Later|暂不加入|跳过入会/i,
        })
        .first();
      const skip = named
        .or(shellButton)
        .or(this.page.getByText(/^Skip membership$/i))
        .first();
      if (!(await skip.isVisible({ timeout: 1_200 }).catch(() => false))) {
        return;
      }
      await skip.click();
      await waitCoverGone();
    }
  }

  @step((amountFragment: string) => `页面读取：等待支付页 Amount tendered 含 ${amountFragment}`)
  async expectPaymentAmountTenderedContains(amountFragment: string): Promise<void> {
    await this.waitForPaymentAppFrameForTenderAssertion();
    const needleDigits = amountFragment.replace(/[^\d]/g, '');
    await waitUntil(
      async () => {
        const pf = await this.findPaymentAppFrameForTenderAssertionOrNull();
        if (!pf) {
          return '';
        }
        return await pf.locator('body').evaluate(() => {
          const text = document.body.innerText ?? '';
          let lastTendered = '';
          const tenderedRe = /Amount\s*tendered[^\d$]*(\$[\d,.]+)/gi;
          let m: RegExpExecArray | null;
          while ((m = tenderedRe.exec(text)) !== null) {
            lastTendered = m[1]?.trim() ?? '';
          }
          if (lastTendered) {
            return lastTendered;
          }
          const cn1 = /实收[^\d$]*(\$[\d,.]+)/i.exec(text);
          if (cn1?.[1]) {
            return cn1[1].trim();
          }
          const cn2 = /收款金额[^\d$]*(\$[\d,.]+)/i.exec(text);
          return cn2?.[1]?.trim() ?? '';
        });
      },
      (shown) => {
        const shownDigits = shown.replace(/[^\d]/g, '');
        return shownDigits.length > 0 && shownDigits === needleDigits;
      },
      {
        timeout: 22_000,
        interval: 350,
        message: `支付页 Amount tendered 未在超时内变为 ${amountFragment}`,
      },
    );
  }

  @step('页面操作：步骤6-在支付 iframe 点击 Cash 主按钮完成现金收款')
  async confirmCashTenderInPaymentFrame(): Promise<void> {
    await this.dismissMembershipJoinPromptIfPresent();
    const alreadySuccess = await this.isAnyIframeShowingCashPaidSuccessChrome();
    if (alreadySuccess) {
      return;
    }
    await waitUntil(
      async () => {
        await this.dismissMembershipJoinPromptIfPresent();
        const pf = await this.findPaymentAppFrameForCashMainSubmitOrNull();
        if (!pf) {
          if (await this.isAnyIframeShowingCashPaidSuccessChrome()) {
            return true;
          }
          return false;
        }
        const byTestId = pf.getByTestId('payment-panel-btn-cash');
        const byRole = pf.getByRole('button', { name: /CashIcon\s+Cash/i });
        const cashSubmit = (await byTestId.count()) > 0 ? byTestId.first() : byRole.first();
        try {
          await expect(cashSubmit).toBeAttached({ timeout: 6_000 });
          const disabled = await cashSubmit.getAttribute('disabled');
          const ariaDisabled = await cashSubmit.getAttribute('aria-disabled');
          if (disabled !== null || ariaDisabled === 'true') {
            return false;
          }
          await cashSubmit.evaluate((el) => {
            const node = el as HTMLElement;
            node.scrollIntoView({ block: 'center', inline: 'center' });
            (node as HTMLButtonElement).click();
          });
          return true;
        } catch {
          return false;
        }
      },
      (ok) => ok === true,
      {
        timeout: 36_000,
        interval: 450,
        message:
          '步骤6：未找到带 Payment 且含 Cash 主按钮（payment-panel-btn-cash）的支付 iframe，或按钮仍为 disabled；若产品已在步骤5关单，请确认成功页是否出现',
      },
    );
  }

  @step('页面读取：确认现金支付成功界面（无小票/Continue 等）')
  async expectCashPaidSuccessWithNoReceiptOffered(): Promise<void> {
    const receiptPattern = /No receipt|不要小票|跳过小票|无需小票/i;
    await waitUntil(
      async () => {
        if (this.page.isClosed()) {
          return false;
        }
        if (await this.isPostCashSuccessDismissControlVisibleOnPage(this.page)) {
          return true;
        }
        const count = await this.page.locator('iframe').count().catch(() => 0);
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          if (await this.isPostCashSuccessDismissControlVisibleInFrame(frame)) {
            return true;
          }
        }
        return false;
      },
      (ok) => ok,
      {
        timeout: 45_000,
        interval: 400,
        message:
          '未在页面或任一 iframe 中看到支付成功后的操作按钮（No receipt / 不要小票 / 纯 Continue 等）',
      },
    );
    const mark = this.page.locator('body').locator('text=/✓|√/').first();
    if (await mark.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(mark).toBeVisible({ timeout: 8_000 });
    }
  }

  @step('页面操作：在支付成功弹窗点击无需小票（No receipt 或等价 Continue）')
  async clickNoReceipt(): Promise<void> {
    const receiptPattern = this.noReceiptDismissNamePattern;
    const tryClickInFrame = async (frame: FrameLocator): Promise<boolean> => {
      const inner = frame.getByRole('button', { name: receiptPattern }).first();
      if (await inner.isVisible().catch(() => false)) {
        await inner.click();
        return true;
      }
      const innerContinue = frame.getByRole('button', { name: 'Continue', exact: true }).first();
      if (
        (await innerContinue.isVisible().catch(() => false)) &&
        !(await this.isPaymentFrameAwaitingCashTenderAmount(frame)) &&
        (await this.frameShowsCashPaidSuccessChrome(frame))
      ) {
        await innerContinue.click();
        return true;
      }
      return false;
    };

    const top = this.page.getByRole('button', { name: receiptPattern }).first();
    if (await top.isVisible().catch(() => false)) {
      await top.click();
      return;
    }
    const activeFrames = this.page.locator('iframe[active]');
    const activeCount = await activeFrames.count().catch(() => 0);
    for (let i = 0; i < activeCount; i += 1) {
      const frame = activeFrames.nth(i).contentFrame();
      if (await tryClickInFrame(frame)) {
        return;
      }
    }
    const count = await this.page.locator('iframe').count();
    for (let j = 0; j < count; j += 1) {
      const frame = this.page.locator('iframe').nth(j).contentFrame();
      if (await tryClickInFrame(frame)) {
        return;
      }
    }
    throw new Error('未找到 No receipt，或未在带成功标识的弹层中找到纯 Continue 按钮');
  }

  private readonly noReceiptDismissNamePattern = /No receipt|不要小票|跳过小票|无需小票/i;

  /**
   * 仅「Continue」会与点餐页其它流程按钮撞车；成功页通常有 Continue & Receipt、Remaining Amount Due，
   * 或与 Payment 同屏的完成勾（点餐 iframe 里也可能有 ✓ 文案，故 ✓ 必须配合 Payment 标题）。
   */
  private async frameShowsCashPaidSuccessChrome(frame: FrameLocator | Page): Promise<boolean> {
    if (
      await frame
        .getByRole('button', { name: /Continue\s*&\s*Receipt/i })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    if (await frame.getByText(/Remaining\s+Amount\s+Due/i).first().isVisible().catch(() => false)) {
      return true;
    }
    const hasPaymentHeading = await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false);
    if (hasPaymentHeading && (await frame.locator('body').locator('text=/✓|√/').first().isVisible().catch(() => false))) {
      return true;
    }
    return false;
  }

  /** Payment 键盘区仍打开且 Amount tendered 为 0：仍在「待输入现金」阶段，禁止当作支付成功。 */
  private async isPaymentFrameAwaitingCashTenderAmount(frame: FrameLocator): Promise<boolean> {
    const hasPaymentHeading = await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false);
    if (!hasPaymentHeading) {
      return false;
    }
    const keypad1 = await frame
      .getByRole('button', { name: '1', exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (!keypad1) {
      return false;
    }
    const tenderText =
      (await frame
        .locator('body')
        .evaluate(() => {
          const bodyText = document.body.innerText ?? '';
          const match =
            /Amount\s*tendered[^\d$]*(\$[\d,.]+)/i.exec(bodyText) ??
            /实收[^\d$]*(\$[\d,.]+)/i.exec(bodyText);
          return match?.[1]?.trim() ?? '';
        })
        .catch(() => '')) ?? '';
    const digits = tenderText.replace(/[^\d]/g, '');
    return digits.length === 0 || /^0+$/.test(digits);
  }

  private async isPostCashSuccessDismissControlVisibleOnPage(page: Page): Promise<boolean> {
    if (
      await page
        .getByRole('button', { name: this.noReceiptDismissNamePattern })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    return false;
  }

  private async isPostCashSuccessDismissControlVisibleInFrame(frame: FrameLocator): Promise<boolean> {
    if (
      await frame
        .getByRole('button', { name: this.noReceiptDismissNamePattern })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    const continuePlain = frame.getByRole('button', { name: 'Continue', exact: true }).first();
    if (!(await continuePlain.isVisible().catch(() => false))) {
      return false;
    }
    if (await this.isPaymentFrameAwaitingCashTenderAmount(frame)) {
      return false;
    }
    return this.frameShowsCashPaidSuccessChrome(frame);
  }

  @step('页面读取：等待主路由离开点单页（#orderDishes）')
  async expectNavigatedAwayFromOrderDishes(): Promise<void> {
    await waitUntil(
      async () => this.page.url(),
      (url) => !/#order[_-]?dishes/i.test(url),
      {
        timeout: 40_000,
        interval: 250,
        message: '完成支付后主 URL 仍停留在 #orderDishes，请确认 No receipt 已生效',
      },
    );
  }

  private resolveDishSearchTextInput(): Locator {
    return this.appFrame
      .getByPlaceholder(/search|搜索|Search dish|菜品/i)
      .or(this.appFrame.locator('input[type="search"]'))
      .or(this.appFrame.getByRole('textbox', { name: /search|搜索/i }));
  }

  private async isActivePaymentFrame(frame: FrameLocator): Promise<boolean> {
    const hasPaymentHeading = await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false);
    if (!hasPaymentHeading) {
      return false;
    }
    const hasBalanceDue = await frame.getByText(/Balance due|应付|待付/i).first().isVisible().catch(() => false);
    if (!hasBalanceDue) {
      return false;
    }
    const hasNumericKeypad = await frame
      .getByRole('button', { name: '1', exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasNumericKeypad) {
      return false;
    }
    const cashLabel = frame
      .locator('label')
      .filter({ hasText: /Cash/i })
      .filter({ hasText: /\$/ })
      .first();
    if (await cashLabel.isVisible().catch(() => false)) {
      return true;
    }
    const cashLine = frame.getByText(/Cash\s*\$[\d,.]+/i).first();
    return await cashLine.isVisible().catch(() => false);
  }

  /** 与 POS 键盘快捷按钮 accessible name 对齐（千分位、Intl 格式等） */
  private buildKeypadAmountButtonCandidates(primary: string): string[] {
    const unique = new Set<string>();
    const trimmed = primary.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
    try {
      const normalized = trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
      const n = parseUsdStringToNumber(normalized);
      unique.add(
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n),
      );
      unique.add(
        `$${n.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      );
      unique.add(`$${n.toFixed(2)}`);
    } catch {
      // 仅使用原始字符串
    }
    return [...unique];
  }

  private async findPaymentAppFrameOrNull(): Promise<FrameLocator | null> {
    const count = await this.page.locator('iframe').count();
    for (let index = 0; index < count; index += 1) {
      const frame = this.page.locator('iframe').nth(index).contentFrame();
      if (await this.isActivePaymentFrame(frame)) {
        return frame;
      }
    }
    return null;
  }

  /**
   * 步骤 6：输入金额后 UI 可能收起数字键盘，但仍保留 Payment 与 Cash 主按钮；
   * 与 `isActivePaymentFrame`（要求可见「1」键）区分，避免找不到支付 iframe。
   * Cash 主按钮以 **已挂载** 为准（部分布局下 a11y 树不可见但仍可 DOM 点击）。
   */
  private async isPaymentFrameForCashMainSubmit(frame: FrameLocator): Promise<boolean> {
    if (!(await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false))) {
      return false;
    }
    const byTestId = frame.getByTestId('payment-panel-btn-cash');
    if ((await byTestId.count()) > 0) {
      return true;
    }
    return (await frame.getByRole('button', { name: /CashIcon\s+Cash/i }).count()) > 0;
  }

  private async findPaymentAppFrameForCashMainSubmitOrNull(): Promise<FrameLocator | null> {
    const count = await this.page.locator('iframe').count();
    for (let index = 0; index < count; index += 1) {
      const frame = this.page.locator('iframe').nth(index).contentFrame();
      if (await this.isPaymentFrameForCashMainSubmit(frame)) {
        return frame;
      }
    }
    return null;
  }

  private async isAnyIframeShowingCashPaidSuccessChrome(): Promise<boolean> {
    const count = await this.page.locator('iframe').count();
    for (let i = 0; i < count; i += 1) {
      const frame = this.page.locator('iframe').nth(i).contentFrame();
      if (await this.frameShowsCashPaidSuccessChrome(frame)) {
        return true;
      }
      if (
        await frame
          .getByRole('button', { name: this.noReceiptDismissNamePattern })
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
    }
    return false;
  }

  /** 步骤 5 末尾：Skip 后键盘可能收起，仍应能读到 Amount tendered。 */
  private async isPaymentFrameForTenderAssertion(frame: FrameLocator): Promise<boolean> {
    if (await this.isActivePaymentFrame(frame)) {
      return true;
    }
    if (!(await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false))) {
      return false;
    }
    return await frame.getByText(/Amount\s*tendered|实收|收款金额/i).first().isVisible().catch(() => false);
  }

  private async waitForPaymentAppFrameForTenderAssertion(): Promise<FrameLocator> {
    const index = await waitUntil(
      async () => {
        const count = await this.page.locator('iframe').count();
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          if (await this.isPaymentFrameForTenderAssertion(frame)) {
            return i;
          }
        }
        return -1;
      },
      (i) => i >= 0,
      {
        timeout: 28_000,
        interval: 400,
        message:
          '步骤5：未找到支付 iframe（含 Payment 与 Amount tendered，或仍含数字键盘的完整支付页）',
      },
    );
    return this.page.locator('iframe').nth(index).contentFrame();
  }

  private async findPaymentAppFrameForTenderAssertionOrNull(): Promise<FrameLocator | null> {
    const count = await this.page.locator('iframe').count();
    for (let i = 0; i < count; i += 1) {
      const frame = this.page.locator('iframe').nth(i).contentFrame();
      if (await this.isPaymentFrameForTenderAssertion(frame)) {
        return frame;
      }
    }
    return null;
  }

  private async waitForPaymentAppFrame(): Promise<FrameLocator> {
    const index = await waitUntil(
      async () => {
        const count = await this.page.locator('iframe').count();
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          if (await this.isActivePaymentFrame(frame)) {
            return i;
          }
        }
        return -1;
      },
      (i) => i >= 0,
      {
        timeout: 28_000,
        interval: 400,
        message: '点击 Pay 后未在任一 iframe 中找到可见的支付页（Payment 标题与 Cash 金额行）',
      },
    );
    return this.page.locator('iframe').nth(index).contentFrame();
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
    // 新版称重区为 `role="textbox"` 的 div（非原生 input），优先稳定 testid
    return root
      .getByTestId('weight-input-modal-numeric-input-input-input')
      .or(root.getByRole('textbox').first())
      .or(root.getByRole('textbox', { name: 'Weight' }))
      .or(root.getByRole('textbox', { name: /重量|Weight/i }))
      .or(root.getByPlaceholder(/weight|重量|lb|lbs|磅/i))
      .or(root.locator('input[type="text"], input[type="tel"], input[type="number"]').first());
  }

  @step('页面操作：从误打开的未结账单点餐页返回主壳（Back 可能回主页而非选桌）')
  async exitResumedOrderToHomeShell(): Promise<void> {
    if (!/#order[_-]?dishes/i.test(this.page.url())) {
      return;
    }
    await expect(this.backButton).toBeVisible({ timeout: 15_000 });
    await this.backButton.click();
    await waitUntil(
      async () => !/#order[_-]?dishes/i.test(this.page.url()),
      (ok) => ok,
      { timeout: 25_000, message: '从点餐页返回后主 URL 仍含 #orderDishes' },
    );
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

  /** 新版套餐弹层：分组名为横向 Tab（如 common），需先点 Tab 再点菜品行 */
  private async ensureComboSectionTabSelected(sectionName: string): Promise<void> {
    const tab = this.comboDialog.getByRole('button', {
      name: new RegExp(`^${this.escapeRegExp(sectionName)}$`, 'i'),
    });
    if (await tab.first().isVisible().catch(() => false)) {
      await tab.first().click();
    }
  }

  private resolveComboSection(sectionName: string): Locator {
    return this.comboDialog
      .locator('div[class*="_sectionName_"]')
      .filter({
        hasText: new RegExp(`^${this.escapeRegExp(sectionName)}$`, 'i'),
      })
      .first()
      .locator('xpath=ancestor::section[1]');
  }

  private resolveComboSectionItemCardShell(sectionName: string, dishName: string): Locator {
    return this.resolveComboSection(sectionName)
      .locator('span[class*="_itemTitle_"]', {
        hasText: new RegExp(`^${this.escapeRegExp(dishName)}$`, 'i'),
      })
      .locator('xpath=ancestor::div[contains(@class,"_cardShell_")][1]');
  }

  /** 套餐子项主按钮：优先新版「菜名 $价」行按钮，回退旧版卡片内首颗操作键 */
  private resolveComboSectionItemPrimaryButton(sectionName: string, dishName: string): Locator {
    const newRow = this.comboDialog.getByRole('button', {
      name: new RegExp(`^${this.escapeRegExp(dishName)}(\\s|\\$)`),
    });
    return newRow.first().or(this.resolveComboSectionItemLegacyPrimary(sectionName, dishName));
  }

  private resolveComboSectionItemLegacyPrimary(sectionName: string, dishName: string): Locator {
    return this.resolveComboSectionItemCardShell(sectionName, dishName).locator(
      'xpath=.//button[not(contains(@class, "_counterBtn_"))][1]',
    );
  }

  private resolveComboSectionItemPlusButton(sectionName: string, dishName: string): Locator {
    const legacyPlus = this.resolveComboSectionItemCardShell(sectionName, dishName)
      .locator('button[class*="_counterBtnPlus_"]')
      .first();
    const nearNewRow = this.comboDialog
      .getByRole('button', { name: new RegExp(`^${this.escapeRegExp(dishName)}`) })
      .first()
      .locator(
        'xpath=ancestor::div[contains(@class,"_cardShell_")][1]//button[contains(@class,"_counterBtnPlus_")]',
      )
      .first();
    return legacyPlus.or(nearNewRow);
  }

  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
