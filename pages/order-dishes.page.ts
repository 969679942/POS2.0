import { expect, type Frame, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { isMoneyCloseWithinCents, parseUsdStringToNumber } from '../utils/money';
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
    await this.clickComboSectionItemPrimaryButton(sectionName, dishName);
    await this.selectFirstNestedComboOptionIfPresent();

    for (let currentQuantity = 1; currentQuantity < quantity; currentQuantity += 1) {
      const plus = this.resolveComboSectionItemPlusButton(sectionName, dishName);
      if (await plus.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await plus.click();
        continue;
      }
      await this.clickComboSectionItemPrimaryButton(sectionName, dishName);
      await this.selectFirstNestedComboOptionIfPresent();
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

  @step('页面读取：判断套餐弹层是否已显示')
  async isComboDialogVisible(timeout: number = 1_500): Promise<boolean> {
    return await this.comboDialog.isVisible({ timeout }).catch(() => false);
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
      if (tabCount > 0) {
        await tabs.nth(round % tabCount).click();
        const withPrice = this.comboDialog.getByRole('button', { name: /\$/ }).first();
        if (await withPrice.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await withPrice.click();
        }
        continue;
      }

      const sectionBlocks = this.comboDialog
        .locator('div')
        .filter({
          has: this.comboDialog.getByText(/Required|Please select|select at least|Please select \d+~\d+ items/i),
        });
      const sectionCount = await sectionBlocks.count().catch(() => 0);
      if (sectionCount === 0) {
        return;
      }
      const section = sectionBlocks.nth(round % sectionCount);
      const firstOption = section.getByRole('button').first();
      if (await firstOption.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await firstOption.click();
        continue;
      }
      return;
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

  @step('页面操作：在支付弹层选择 Credit Card（Balance due 区单选项或等价按钮）')
  async clickCreditCardPayOption(): Promise<void> {
    const pf = await this.waitForPaymentAppFrame();
    await expect(pf.getByText(/Balance due|应付|待付/i).first()).toBeVisible({ timeout: 20_000 });
    const creditRadio = pf.getByRole('radio', { name: /Credit\s*Card|信用卡/i }).first();
    if (await creditRadio.isVisible().catch(() => false)) {
      await creditRadio.evaluate((el) => {
        (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
        (el as HTMLInputElement).click();
      });
      return;
    }
    const cardFace = pf
      .locator('span[class*="_radio__button_"]')
      .filter({ hasText: /Credit\s*Card|信用卡/i })
      .first();
    if (await cardFace.isVisible().catch(() => false)) {
      await cardFace.click();
      return;
    }
    const cardBtn = pf.getByRole('button', { name: /Credit\s*Card|信用卡/i }).first();
    await expect(cardBtn).toBeVisible({ timeout: 15_000 });
    await cardBtn.click();
  }

  /**
   * 断言 7：入会条常挡在支付层之上（截图中整页变灰 + 顶栏 Skip），仅「读可见性」无法关条；
   * 须主动点击 Skip（多定位）或点遮罩/支付区空白直至 Skip 不可见。
   */
  @step(
    '页面操作：断言7-步骤5-点击 Skip membership 或点遮罩/空白/支付区直至入会提示消失',
  )
  async assert7DismissCustomerJoiningMembershipBySkipOrBlank(): Promise<void> {
    const shellCover = this.page.locator('#floatcover3100, .mycover#floatcover3100').first();

    const isAnySkipMembershipVisible = async (): Promise<boolean> => {
      // 产品常见：`#myalertno.myalerthide` 内文案为 Skip membership，a11y 上不可见但仍挡交互，须用 force 点
      const myalertSkip = this.page.locator('#myalertno').filter({ hasText: /Skip\s*membership/i });
      if ((await myalertSkip.count().catch(() => 0)) > 0) {
        return true;
      }
      const top = this.page.getByText(/Skip\s*membership/i).first();
      if (await top.isVisible().catch(() => false)) {
        return true;
      }
      const count = await this.page.locator('iframe').count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const frame = this.page.locator('iframe').nth(i).contentFrame();
        if (await frame.getByText(/Skip\s*membership/i).first().isVisible().catch(() => false)) {
          return true;
        }
      }
      return false;
    };

    const tryClickAllSkipControls = async (): Promise<void> => {
      await this.clickMyalertnoSkipMembershipIfAttached();
      await this.clickTopShellSkipMembershipPointerIfVisible();
      const strip = this.page
        .locator('div')
        .filter({ hasText: /Customer\s+joining\s+membership/i })
        .filter({ hasText: /Skip\s*membership/i })
        .first();
      if (await strip.isVisible().catch(() => false)) {
        await strip.getByText(/Skip\s*membership/i).first().click({ force: true, timeout: 2_500 }).catch(() => {});
      }
      const plain = this.page.getByText(/Skip\s*membership/i).first();
      if (await plain.isVisible().catch(() => false)) {
        await plain.click({ force: true, timeout: 2_500 }).catch(() => {});
      }
      const roleSkip = this.page.getByRole('button', { name: /Skip\s*membership/i }).first();
      if (await roleSkip.isVisible().catch(() => false)) {
        await roleSkip.click({ force: true, timeout: 2_500 }).catch(() => {});
      }
      const iframeCount = await this.page.locator('iframe').count().catch(() => 0);
      for (let i = 0; i < iframeCount; i += 1) {
        const frame = this.page.locator('iframe').nth(i).contentFrame();
        const inFrame = frame.getByText(/Skip\s*membership/i).first();
        if (await inFrame.isVisible().catch(() => false)) {
          await inFrame.click({ force: true, timeout: 2_500 }).catch(() => {});
        }
      }
    };

    const tryClickBlankToDismissOverlay = async (): Promise<void> => {
      if (await shellCover.isVisible().catch(() => false)) {
        await shellCover.click({ position: { x: 24, y: 24 }, force: true, timeout: 2_500 }).catch(() => {});
        await shellCover.click({ position: { x: 120, y: 280 }, force: true, timeout: 2_500 }).catch(() => {});
      }
      await this.page.keyboard.press('Escape');
      const vp = this.page.viewportSize();
      if (vp) {
        await this.page.mouse.click(Math.round(vp.width * 0.1), Math.round(vp.height * 0.35));
        await this.page.mouse.click(Math.round(vp.width * 0.5), Math.round(vp.height * 0.78));
      }
      const iframeCount = await this.page.locator('iframe').count().catch(() => 0);
      for (let i = 0; i < iframeCount; i += 1) {
        const frame = this.page.locator('iframe').nth(i).contentFrame();
        const pay = frame.getByText(/\bPayment\b/i).first();
        if (!(await pay.isVisible().catch(() => false))) {
          continue;
        }
        await frame.locator('body').click({ position: { x: 36, y: 180 }, timeout: 2_500 }).catch(() => {});
        await pay.click({ position: { x: 4, y: 4 }, timeout: 2_500 }).catch(() => {});
      }
    };

    await waitUntil(
      async () => {
        if (!(await isAnySkipMembershipVisible())) {
          return true;
        }
        await tryClickAllSkipControls();
        await tryClickBlankToDismissOverlay();
        await this.dismissMembershipJoinPromptIfPresent().catch(() => {});
        return !(await isAnySkipMembershipVisible());
      },
      (ok) => ok === true,
      {
        timeout: 22_000,
        interval: 500,
        message: '断言7：Skip membership 仍可见，已尝试多点 Skip、遮罩与支付区空白',
      },
    );
  }

  @step(
    '页面读取：断言8-步骤7-确认支付 iframe 内不再显示顾客签名等待（已 No Signature 或无需签名）',
  )
  async expectCustomerSignatureWaitingNotVisible(): Promise<void> {
    const signaturePendingPattern =
      /Waiting\s+for\s+customer\s+signature|等待.*顾客.*签名|等待顾客签名|请.*签名|顾客签名/i;
    await waitUntil(
      async () => {
        const count = await this.page.locator('iframe').count().catch(() => 0);
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          const sig = await frame
            .getByText(signaturePendingPattern)
            .first()
            .isVisible()
            .catch(() => false);
          if (sig) {
            return false;
          }
        }
        return true;
      },
      (ok) => ok === true,
      {
        timeout: 12_000,
        interval: 280,
        message: '断言8：仍存在顾客签名等待文案，签名步骤未处理完毕',
      },
    );
  }

  @step(
    '页面读取：断言9-步骤6-确认支付弹层出现 Card reader ready 与 Waiting for customer payment（读卡等待）',
  )
  async expectCardReaderPendingMessagesVisible(): Promise<void> {
    await waitUntil(
      async () => {
        const count = await this.page.locator('iframe').count();
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          const body = await frame.locator('body').innerText().catch(() => '');
          const norm = body.replace(/\s+/g, ' ');
          if (
            /Card\s*reader\s*ready/i.test(norm) &&
            /Waiting\s*for\s*customer\s*payment/i.test(norm)
          ) {
            return true;
          }
          // 某些环境不会显示上述固定英文，但会进入「已选 Cards + Credit Card 等待刷卡」态（见 error-context 支付 iframe）
          const hasPayment =
            (await frame.getByText(/^Payment$/i).first().isVisible().catch(() => false)) ||
            (await frame.getByText(/\bPayment\b/i).first().isVisible().catch(() => false));
          if (!hasPayment) {
            continue;
          }
          if (
            /Balance\s+due/i.test(norm) &&
            (/Cards\s*\$[\d,.]+/i.test(norm) || /Cards\s+[\d,.]+/i.test(norm)) &&
            /Credit\s*Card/i.test(norm)
          ) {
            return true;
          }
          const altReader =
            /(reader|读卡|刷卡|读卡器)/i.test(norm) && /(waiting\s+for|等待)/i.test(norm);
          if (altReader && /Balance\s+due/i.test(norm)) {
            return true;
          }
          const cardsChecked = await frame
            .getByRole('radio', { name: /Cards\s*\$[\d,.]+/i })
            .first()
            .isChecked()
            .catch(() => false);
          const creditBtn = frame
            .getByRole('button', { name: /CardIcon\s+Credit\s*Card|Credit\s*Card/i })
            .first();
          const creditButtonActive = await creditBtn
            .evaluate((el) => {
              const ariaPressed = (el as HTMLElement).getAttribute('aria-pressed');
              if (ariaPressed === 'true') {
                return true;
              }
              const className = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
              if (/\bactive\b/i.test(className) || /selected/i.test(className)) {
                return true;
              }
              // Playwright snapshot 里常显示 [active]，部分实现会写成 attribute `active`
              if ((el as HTMLElement).hasAttribute('active')) {
                return true;
              }
              return false;
            })
            .catch(() => false);
          if (cardsChecked && creditButtonActive) {
            return true;
          }
        }
        return false;
      },
      (ok) => ok === true,
      {
        timeout: 30_000,
        interval: 400,
        message:
          '断言9：未在支付 iframe 内检测到读卡等待（英文两句或已选 Cards 且 Credit Card 为 active 等等价态）',
      },
    );
  }

  /** 无界 wujie 支付子应用：`iframe[data-wujie-id="paymentPanel"]`（No Signature 等在此子应用文档内） */
  private paymentPanelIframeLocator(): Locator {
    return this.page.locator('iframe[data-wujie-id="paymentPanel"]').first();
  }

  /**
   * 在 paymentPanel iframe 内点击「No Signature」：先等 iframe 可见，再 `contentFrame()`，
   * 使用 `button[data-testid="button-default"]` 且含文案「No Signature」收窄目标（避免多个 default 按钮误点）。
   */
  private async clickNoSignatureInPaymentPanelIfVisible(): Promise<void> {
    const iframeLocator = this.paymentPanelIframeLocator();
    if ((await iframeLocator.count().catch(() => 0)) === 0) {
      return;
    }
    await iframeLocator.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    if (!(await iframeLocator.isVisible().catch(() => false))) {
      return;
    }
    const frame = iframeLocator.contentFrame();
    if (!frame) {
      throw new Error('无法获取 iframe 内容');
    }
    const button = frame
      .locator('button[data-testid="button-default"]')
      .filter({ has: frame.getByText('No Signature', { exact: true }) })
      .first();
    await button.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    if (await button.isVisible().catch(() => false)) {
      await button.scrollIntoViewIfNeeded().catch(() => {});
      await button.click({ force: true, timeout: 10_000 });
      return;
    }
    const byRole = frame.getByRole('button', { name: 'No Signature' }).first();
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.scrollIntoViewIfNeeded().catch(() => {});
      await byRole.click({ force: true, timeout: 10_000 });
    }
  }

  private async paymentPanelHasVisibleRegex(pattern: RegExp): Promise<boolean> {
    const iframeLocator = this.paymentPanelIframeLocator();
    if ((await iframeLocator.count().catch(() => 0)) === 0) {
      return false;
    }
    const frame = iframeLocator.contentFrame();
    if (!frame) {
      return false;
    }
    return await frame.getByText(pattern).first().isVisible().catch(() => false);
  }

  @step('页面操作：步骤7-若出现 Waiting for customer tips 则点击 No Tips（无小费，纯文案定位）')
  async dismissCustomerTipsIfPresent(): Promise<void> {
    const tipsWaitingPattern = /Waiting\s+for\s+customer\s+tips|等待.*顾客.*小费|等待小费/i;

    await waitUntil(
      async () => {
        const noTipsTop = this.page.getByText('No Tips', { exact: true });
        if (await noTipsTop.isVisible().catch(() => false)) {
          await noTipsTop.click({ force: true });
        }
        const iframeCount = await this.page.locator('iframe').count();
        for (let i = 0; i < iframeCount; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          const noTips = frame.getByText('No Tips', { exact: true });
          if (await noTips.isVisible().catch(() => false)) {
            await noTips.click({ force: true });
          }
        }

        let stillWaiting = false;
        for (let i = 0; i < iframeCount; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          if (
            await frame
              .getByText(tipsWaitingPattern)
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            stillWaiting = true;
            break;
          }
        }
        if (
          !stillWaiting &&
          (await this.page.getByText(tipsWaitingPattern).first().isVisible().catch(() => false))
        ) {
          stillWaiting = true;
        }
        return !stillWaiting;
      },
      (ok) => ok === true,
      {
        timeout: 20_000,
        interval: 350,
        message: '步骤7：仍存在 Waiting for customer tips，且未点到文案「No Tips」',
      },
    );
  }

  @step(
    '页面操作：步骤7-若出现 Waiting for customer signature 则等待 paymentPanel iframe 可见后进入 contentFrame，点击 button[data-testid=button-default]（含 No Signature 文案）或同名 button 角色',
  )
  async dismissCardSignatureIfPresent(): Promise<void> {
    const sigWaitingPattern =
      /Waiting\s+for\s+customer\s+signature|等待.*顾客.*签名|等待顾客签名|请.*签名|顾客签名/i;

    await waitUntil(
      async () => {
        await this.clickNoSignatureInPaymentPanelIfVisible();

        const noSigTop = this.page.getByText('No Signature', { exact: true });
        if (await noSigTop.isVisible().catch(() => false)) {
          await noSigTop.click({ force: true });
        }
        const iframeCount = await this.page.locator('iframe').count();
        for (let i = 0; i < iframeCount; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          const noSig = frame.getByText('No Signature', { exact: true });
          if (await noSig.isVisible().catch(() => false)) {
            await noSig.click({ force: true });
          }
        }

        let stillWaiting = await this.paymentPanelHasVisibleRegex(sigWaitingPattern);
        if (!stillWaiting) {
          for (let i = 0; i < iframeCount; i += 1) {
            const frame = this.page.locator('iframe').nth(i).contentFrame();
            if (
              await frame
                .getByText(sigWaitingPattern)
                .first()
                .isVisible()
                .catch(() => false)
            ) {
              stillWaiting = true;
              break;
            }
          }
        }
        if (
          !stillWaiting &&
          (await this.page.getByText(sigWaitingPattern).first().isVisible().catch(() => false))
        ) {
          stillWaiting = true;
        }
        return !stillWaiting;
      },
      (ok) => ok === true,
      {
        timeout: 28_000,
        interval: 350,
        message: '步骤7：仍存在 Waiting for customer signature，且未点到文案「No Signature」',
      },
    );
  }

  @step(
    (amountHint: string) =>
      `页面读取：断言10-步骤8-确认信用卡支付成功后界面含 √ 且 Balance due 含应付金额（与 Total(Card) 一致：${amountHint}）`,
  )
  async expectCreditCardPaidSuccessWithBalanceDueVisible(expectedTotalCardUsd: string): Promise<void> {
    const expectedNum = parseUsdStringToNumber(expectedTotalCardUsd);
    await waitUntil(
      async () => {
        const count = await this.page.locator('iframe').count();
        for (let i = 0; i < count; i += 1) {
          const frame = this.page.locator('iframe').nth(i).contentFrame();
          const hasMark = await frame
            .locator('body')
            .locator('text=/✓|√/')
            .first()
            .isVisible()
            .catch(() => false);
          const body = await frame.locator('body').innerText().catch(() => '');
          const bd = /Balance\s+due[^\d$]*(\$[\d,.]+)/i.exec(body);
          if (!hasMark || !bd?.[1]) {
            continue;
          }
          const shown = parseUsdStringToNumber(bd[1]);
          if (isMoneyCloseWithinCents(shown, expectedNum)) {
            return true;
          }
        }
        return false;
      },
      (ok) => ok === true,
      {
        timeout: 30_000,
        interval: 500,
        message:
          '未在超时内于支付 iframe 看到 √ 且 Balance due 金额与 Total(Card) 一致（需外接读卡完成或测试环境模拟支付）',
      },
    );
  }

  /**
   * `#myalertno` 常为 `myalerthide`：Playwright `click` 偶发不触发；再发一次 DOM `HTMLElement.click()`。
   * 顶栏另有 `[cursor=pointer]` 的「Skip membership」（与 `#myalertno` 并列，见 error-context e29）。
   */
  private async clickMyalertnoSkipMembershipIfAttached(): Promise<void> {
    const loc = this.page.locator('#myalertno').filter({ hasText: /Skip\s*membership/i });
    if ((await loc.count().catch(() => 0)) === 0) {
      return;
    }
    const first = loc.first();
    await first.click({ force: true, timeout: 3_000 }).catch(() => {});
    // `myalerthide` 时部分环境仅 Playwright click 不触发，再补一层原生 click（不冒泡到支付 iframe）
    await first
      .evaluate((el) => {
        (el as HTMLElement).click();
      })
      .catch(() => {});
  }

  /** 顶栏 toast：与「Customer joining membership」同条的 Skip（error-context e26–e29），避免全局误点其它 pointer */
  private async clickTopShellSkipMembershipPointerIfVisible(): Promise<void> {
    const nearJoin = this.page
      .getByText(/Customer\s+joining\s+membership/i)
      .locator('..')
      .getByText('Skip membership', { exact: true })
      .first();
    if (await nearJoin.isVisible().catch(() => false)) {
      await nearJoin.click({ force: true, timeout: 2_500 }).catch(() => {});
    }
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

  @step(
    '页面操作：若出现会员/入会壳层遮罩则关闭（Skip membership；支付 iframe 内亦可 Escape 或点 Payment 标题旁空白）',
  )
  async dismissMembershipJoinPromptIfPresent(): Promise<void> {
    const waitCoverGone = async (): Promise<void> => {
      await this.page
        .locator('#floatcover3100, .mycover#floatcover3100')
        .first()
        .waitFor({ state: 'hidden', timeout: 4_000 })
        .catch(() => {});
    };

    const waitJoinBannerGoneInFrame = async (frame: FrameLocator): Promise<void> => {
      await waitUntil(
        async () =>
          !(await frame
            .getByText(/Customer\s+joining\s+membership/i)
            .first()
            .isVisible()
            .catch(() => false)),
        (gone) => gone,
        {
          timeout: 4_000,
          interval: 200,
          message: '支付 iframe 内入会条幅未在短超时内消失',
        },
      ).catch(() => {});
    };

    const tryDismissJoinBannerInPaymentFrame = async (frame: FrameLocator): Promise<boolean> => {
      const joinLoc = frame.getByText(/Customer\s+joining\s+membership/i).first();
      const hasJoinTitle = await joinLoc.isVisible().catch(() => false);
      if (!hasJoinTitle) {
        return false;
      }
      const joinBannerVisible = async (): Promise<boolean> =>
        joinLoc.isVisible().catch(() => false);

      const skipInFrame = frame
        .getByRole('button', { name: /Skip\s*membership/i })
        .first()
        .or(frame.getByText(/^Skip membership$/i).first());
      if (await skipInFrame.isVisible().catch(() => false)) {
        await skipInFrame.click();
        await waitCoverGone();
        await waitJoinBannerGoneInFrame(frame);
      }
      if (!(await joinBannerVisible())) {
        return true;
      }
      // 条幅仍在：按用例允许 Escape 或点「空白」（优先点 Payment 标题旁，降低误点快捷金额按钮风险）
      await this.page.keyboard.press('Escape');
      const paymentHeading = frame.getByText(/^Payment$/i).first();
      if (await paymentHeading.isVisible().catch(() => false)) {
        await paymentHeading.click({ position: { x: 4, y: 4 } });
      } else {
        await frame.locator('body').click({ position: { x: 24, y: 120 } });
      }
      await waitJoinBannerGoneInFrame(frame);
      // 仅当该 iframe 内条幅已消失才返回 true，避免误 break 导致后续仍挡在入会层上（表现为「卡在 Skip」）
      return !(await joinBannerVisible());
    };

    const shellCover = this.page.locator('#floatcover3100, .mycover#floatcover3100').first();

    /** 入会提示在 iframe 外、与支付 iframe 并列的顶栏（见 trace：Customer joining membership + Skip membership） */
    const tryDismissTopShellMembershipStrip = async (): Promise<void> => {
      const strip = this.page
        .locator('div')
        .filter({ hasText: /Customer\s+joining\s+membership/i })
        .filter({ hasText: /Skip\s*membership/i })
        .first();
      if (await strip.isVisible().catch(() => false)) {
        await strip.getByText(/Skip\s*membership/i).first().click({ force: true });
        await waitCoverGone();
        return;
      }
      const joinTop = this.page.getByText(/Customer\s+joining\s+membership/i).first();
      const skipTop = this.page.getByText(/Skip\s*membership/i).first();
      if ((await joinTop.isVisible().catch(() => false)) && (await skipTop.isVisible().catch(() => false))) {
        await skipTop.click({ force: true });
        await waitCoverGone();
      }
      await this.clickMyalertnoSkipMembershipIfAttached();
      await this.clickTopShellSkipMembershipPointerIfVisible();
    };

    for (let pass = 0; pass < 3; pass += 1) {
      await tryDismissTopShellMembershipStrip();
      await this.clickMyalertnoSkipMembershipIfAttached();
      await this.clickTopShellSkipMembershipPointerIfVisible();
      if (await shellCover.isVisible().catch(() => false)) {
        await waitCoverGone();
      }
      // 1) 先尝试在支付 iframe 内关闭「Customer joining membership」
      // 部分环境该遮罩出现在支付弹层 iframe，而不是顶层壳层。
      const iframeCount = await this.page.locator('iframe').count().catch(() => 0);
      for (let i = 0; i < iframeCount; i += 1) {
        const frame = this.page.locator('iframe').nth(i).contentFrame();
        const handled = await tryDismissJoinBannerInPaymentFrame(frame);
        if (handled) {
          break;
        }
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
        .or(this.page.getByText(/Skip\s*membership/i))
        .first();
      if (!(await skip.isVisible({ timeout: 1_200 }).catch(() => false))) {
        // 若顶层没找到，仍可能是支付 iframe 内出现遮罩；继续下一轮 pass
        continue;
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
    const labelPattern = new RegExp(this.escapeRegExp(sectionName), 'i');
    const bySectionClass = this.comboDialog
      .locator('div[class*="_sectionName_"]')
      .filter({
        hasText: labelPattern,
      })
      .first()
      .locator('xpath=ancestor::section[1]');
    const byHeadingFallback = this.comboDialog
      .getByText(labelPattern)
      .first()
      .locator('xpath=ancestor::div[.//button][1]');
    return bySectionClass.or(byHeadingFallback);
  }

  private resolveComboSectionItemCardShell(sectionName: string, dishName: string): Locator {
    return this.resolveComboSection(sectionName)
      .locator('span[class*="_itemTitle_"]', {
        hasText: new RegExp(`^${this.escapeRegExp(dishName)}$`, 'i'),
      })
      .locator('xpath=ancestor::div[contains(@class,"_cardShell_")][1]');
  }

  /** 套餐子项主按钮：优先分组内唯一命中，避免不同分组同名菜导致 strict mode。 */
  private async clickComboSectionItemPrimaryButton(
    sectionName: string,
    dishName: string,
  ): Promise<void> {
    const sectionScopedNewRow = this.resolveComboSection(sectionName).getByRole('button', {
      name: new RegExp(`^${this.escapeRegExp(dishName)}(\\s|\\$)`),
    });
    if ((await sectionScopedNewRow.count().catch(() => 0)) === 1) {
      await this.clickLocatorByDom(sectionScopedNewRow.first());
      return;
    }

    const legacy = this.resolveComboSectionItemLegacyPrimary(sectionName, dishName);
    if ((await legacy.count().catch(() => 0)) === 1) {
      await this.clickLocatorByDom(legacy.first());
      return;
    }

    const globalNewRow = this.comboDialog.getByRole('button', {
      name: new RegExp(`^${this.escapeRegExp(dishName)}(\\s|\\$)`),
    });
    if ((await globalNewRow.count().catch(() => 0)) === 1) {
      await this.clickLocatorByDom(globalNewRow.first());
      return;
    }

    await this.clickComboSectionItemPrimaryButtonByDom(sectionName, dishName);
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
    const sectionScopedNearNewRow = this.resolveComboSection(sectionName)
      .getByRole('button', { name: new RegExp(`^${this.escapeRegExp(dishName)}`) })
      .first()
      .locator(
        'xpath=ancestor::div[contains(@class,"_cardShell_")][1]//button[contains(@class,"_counterBtnPlus_")]',
      )
      .first();
    const nearGlobalNewRow = this.comboDialog
      .getByRole('button', { name: new RegExp(`^${this.escapeRegExp(dishName)}`) })
      .first()
      .locator(
        'xpath=ancestor::div[contains(@class,"_cardShell_")][1]//button[contains(@class,"_counterBtnPlus_")]',
      )
      .first();
    return legacyPlus.or(sectionScopedNearNewRow).or(nearGlobalNewRow);
  }

  private async clickComboSectionItemPrimaryButtonByDom(
    sectionName: string,
    dishName: string,
  ): Promise<void> {
    await this.comboDialog.evaluate(
      (root, payload) => {
        const normalize = (text: string | null | undefined): string =>
          (text ?? '').replace(/\s+/g, ' ').trim();
        const firstLine = (text: string | null | undefined): string => {
          const t = normalize(text);
          const head = t.split(/\n+/)[0]?.trim() ?? '';
          return head;
        };
        const startsWithDishName = (text: string): boolean =>
          text === payload.dishName || text.startsWith(`${payload.dishName} `) || text.startsWith(`${payload.dishName} $`);
        const getDepth = (node: Element): number => {
          let depth = 0;
          let current: Element | null = node;
          while (current) {
            depth += 1;
            current = current.parentElement;
          }
          return depth;
        };

        let bestSection: Element | null = null;
        let bestDepth = Number.POSITIVE_INFINITY;
        for (const el of Array.from(root.querySelectorAll('*'))) {
          if (firstLine((el as HTMLElement).innerText) !== payload.sectionName) {
            continue;
          }
          let current: Element | null = el;
          while (current && current !== root) {
            const buttons = Array.from(current.querySelectorAll('button'));
            if (buttons.some((btn) => startsWithDishName(normalize((btn as HTMLElement).innerText)))) {
              const depth = getDepth(current);
              if (depth < bestDepth) {
                bestSection = current;
                bestDepth = depth;
              }
            }
            current = current.parentElement;
          }
        }

        if (!bestSection) {
          throw new Error(`未在套餐弹层 DOM 中定位到分组：${payload.sectionName}`);
        }

        const target = Array.from(bestSection.querySelectorAll('button')).find((btn) =>
          startsWithDishName(normalize((btn as HTMLElement).innerText)),
        ) as HTMLButtonElement | undefined;
        if (!target) {
          throw new Error(
            `未在套餐分组 ${payload.sectionName} 中找到菜品按钮：${payload.dishName}`,
          );
        }
        target.scrollIntoView({ block: 'center', inline: 'center' });
        target.click();
      },
      { sectionName, dishName },
    );
  }

  private async clickLocatorByDom(locator: Locator): Promise<void> {
    await locator.evaluate((el) => {
      const node = el as HTMLElement;
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
    });
  }

  /**
   * 组合套餐子项偶尔会继续弹出二级选择小窗（如 detail price → Small / Mediummmm）。
   * 这里统一在出现时选择首个可见选项，避免流程挂在小窗上。
   */
  private async selectFirstNestedComboOptionIfPresent(): Promise<void> {
    const dialog = await this.findVisibleNestedComboDialogOrNull();
    if (!dialog) {
      return;
    }
    await dialog.evaluate((root) => {
      const normalize = (text: string | null | undefined): string =>
        (text ?? '').replace(/\s+/g, ' ').trim();
      const getDepth = (node: Element): number => {
        let depth = 0;
        let current: Element | null = node;
        while (current) {
          depth += 1;
          current = current.parentElement;
        }
        return depth;
      };

      const candidates = Array.from(root.querySelectorAll('div, button, [role="button"]')).filter(
        (el) => {
          const text = normalize((el as HTMLElement).innerText);
          return text.includes('$') && !/^\$[\d,.]+$/.test(text);
        },
      );
      candidates.sort((a, b) => getDepth(b) - getDepth(a));
      const target = candidates[0] as HTMLElement | undefined;
      if (!target) {
        return;
      }
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
    });
  }

  private async selectNestedComboDialogOptionByText(optionText: string): Promise<void> {
    const dialogOrNull = await waitUntil(
      async () => this.findVisibleNestedComboDialogOrNull(optionText),
      (value) => value !== null,
      {
        timeout: 10_000,
        interval: 200,
        message: `未在组合套餐二级选择小窗中找到可见选项：${optionText}`,
      },
    );
    if (!dialogOrNull) {
      throw new Error(
        `未在组合套餐二级选择小窗中找到可见选项：${optionText}\n${await this.describeFramesForNestedComboDebug()}`,
      );
    }
    const dialog = dialogOrNull;
    const optionCardCandidates = [
      dialog.getByRole('button', {
        name: new RegExp(`^${this.escapeRegExp(optionText)}(\\s|\\$|$)`, 'i'),
      }),
      dialog.getByRole('option', { name: new RegExp(this.escapeRegExp(optionText), 'i') }),
      dialog
        .locator('div, button, [role="button"]')
        .filter({
          has: dialog.getByText(optionText, { exact: true }),
          hasText: /\$\s*[\d.]+/,
        }),
      dialog.getByText(optionText, { exact: true }).locator('xpath=ancestor::*[self::div or self::button][1]'),
      dialog.getByText(optionText, { exact: true }).locator('xpath=ancestor::*[self::div or self::button][2]'),
    ];

    for (const candidates of optionCardCandidates) {
      const count = await candidates.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const target = candidates.nth(index);
        if (!(await target.isVisible({ timeout: 500 }).catch(() => false))) {
          continue;
        }
        await target.scrollIntoViewIfNeeded().catch(() => {});
        await target.click({ force: true }).catch(() => {});
        if (!(await this.findVisibleNestedComboDialogOrNull(optionText))) {
          return;
        }
      }
    }

    await dialog.evaluate(
      (root, option) => {
        const normalize = (text: string | null | undefined): string =>
          (text ?? '').replace(/\s+/g, ' ').trim();
        const label = Array.from(root.querySelectorAll('*')).find(
          (el) => normalize((el as HTMLElement).innerText) === option,
        ) as HTMLElement | undefined;
        if (!label) {
          return;
        }
        let node: HTMLElement | null = label;
        for (let depth = 0; depth < 8 && node; depth += 1) {
          const t = normalize(node.innerText);
          if (t.startsWith(option) && /\$\s*[\d.]+/.test(t)) {
            node.scrollIntoView({ block: 'center', inline: 'center' });
            (node as HTMLElement).click();
            return;
          }
          node = node.parentElement;
        }
      },
      optionText,
    );
    if (!(await this.findVisibleNestedComboDialogOrNull(optionText))) {
      return;
    }

    const rowForPointer = dialog
      .locator('div, button, [role="button"]')
      .filter({ hasText: new RegExp(`${this.escapeRegExp(optionText)}`, 'i') })
      .filter({ hasText: /\$\s*[\d.,]+/ })
      .first();
    const rowHandle = await rowForPointer.elementHandle().catch(() => null);
    const ownerFrame = rowHandle ? await rowHandle.ownerFrame().catch(() => null) : null;
    if (ownerFrame && !ownerFrame.isDetached()) {
      const pointerOk = await this.pointerActivateNestedDetailOptionInFrame(ownerFrame, optionText);
      if (pointerOk && !(await this.findVisibleNestedComboDialogOrNull(optionText))) {
        return;
      }
    }

    const label = dialog.getByText(optionText, { exact: true }).first();
    if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
      await label.focus().catch(() => {});
      await this.page.keyboard.press('Enter').catch(() => {});
      if (!(await this.findVisibleNestedComboDialogOrNull(optionText))) {
        return;
      }
    }

    await waitUntil(
      async () => this.findVisibleNestedComboDialogOrNull(optionText),
      (value) => value === null,
      {
        timeout: 10_000,
        interval: 200,
        message: `组合套餐二级选择小窗在点击 ${optionText} 后仍未关闭\n${await this.describeFramesForNestedComboDebug()}`,
      },
    );
  }

  /**
   * 在真实 Frame 文档内派发指针序列，命中「选项名 + 金额」同一卡片（适配部分环境 listen pointer 而非 click）。
   */
  private async pointerActivateNestedDetailOptionInFrame(frame: Frame, optionText: string): Promise<boolean> {
    return await frame.evaluate((option) => {
      const normalize = (text: string | null | undefined): string =>
        (text ?? '').replace(/\s+/g, ' ').trim();
      const roots = Array.from(document.querySelectorAll('[role="dialog"]'));
      for (const root of roots) {
        const body = normalize((root as HTMLElement).innerText);
        if (!body.includes(option) || body.includes('组合套餐')) {
          continue;
        }
        let target: HTMLElement | null = null;
        for (const el of Array.from(root.querySelectorAll('div, button, [role="button"]'))) {
          const line = normalize((el as HTMLElement).innerText);
          if (!line || line.length > 120) {
            continue;
          }
          if (line.startsWith(option) && /\$\s*[\d.,]+/.test(line)) {
            target = el as HTMLElement;
            break;
          }
        }
        if (!target) {
          continue;
        }
        target.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const mouseInit: MouseEventInit = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
        const pointerInit: PointerEventInit = {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          view: window,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: 1,
        };
        target.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
        target.dispatchEvent(new MouseEvent('mousedown', mouseInit));
        target.dispatchEvent(new PointerEvent('pointerup', pointerInit));
        target.dispatchEvent(new MouseEvent('mouseup', mouseInit));
        target.dispatchEvent(new MouseEvent('click', mouseInit));
        return true;
      }
      return false;
    }, optionText);
  }

  private async findVisibleNestedComboDialogOrNull(optionText?: string): Promise<Locator | null> {
    for (const frame of this.page.frames()) {
      if (frame.isDetached()) {
        continue;
      }
      const fromRuntime = await this.findVisibleNestedPricePickerDialogInFrameOrNull(frame, optionText);
      if (fromRuntime) {
        return fromRuntime;
      }
    }

    const directDialog = await this.findVisibleNestedComboDialogInScopeOrNull(this.appFrame, optionText);
    if (directDialog) {
      return directDialog;
    }

    const nestedFrames = this.appFrame.locator('iframe');
    const nestedCount = await nestedFrames.count().catch(() => 0);
    for (let frameIndex = 0; frameIndex < nestedCount; frameIndex += 1) {
      const nestedFrame = nestedFrames.nth(frameIndex).contentFrame();
      const nestedDialog = await this.findVisibleNestedComboDialogInScopeOrNull(nestedFrame, optionText);
      if (nestedDialog) {
        return nestedDialog;
      }
    }
    return null;
  }

  /**
   * 运行时枚举：在真实 Frame 上找「规格价二级小窗」（含 Small 等选项，且不是外层组合套餐主面板）。
   */
  private async findVisibleNestedPricePickerDialogInFrameOrNull(
    frame: Frame,
    optionText?: string,
  ): Promise<Locator | null> {
    const dialogs = frame.locator('[role="dialog"]');
    const count = await dialogs.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index -= 1) {
      const dialog = dialogs.nth(index);
      if (!(await dialog.isVisible({ timeout: 200 }).catch(() => false))) {
        continue;
      }
      const body = (await dialog.textContent().catch(() => '')) ?? '';
      if (body.includes('组合套餐')) {
        continue;
      }
      if (!optionText) {
        if (/\$\s*[\d.]+/.test(body) && /Small|Mediummmm|Medium/i.test(body)) {
          return dialog;
        }
        continue;
      }
      if (!(await dialog.getByText(optionText, { exact: true }).isVisible().catch(() => false))) {
        continue;
      }
      return dialog;
    }
    return null;
  }

  private async describeFramesForNestedComboDebug(): Promise<string> {
    const lines: string[] = ['运行时 iframe 采样：'];
    for (const frame of this.page.frames()) {
      if (frame.isDetached()) {
        continue;
      }
      const dialogCount = await frame.locator('[role="dialog"]').count().catch(() => 0);
      lines.push(`- url=${frame.url()} name=${frame.name() || '(empty)'} dialogs=${dialogCount}`);
    }
    return lines.join('\n');
  }

  private async findVisibleNestedComboDialogInScopeOrNull(
    scope: FrameLocator,
    optionText?: string,
  ): Promise<Locator | null> {
    let dialogs = scope.getByRole('dialog').filter({
      hasNot: scope.getByRole('button', { name: /^(Confirm|确认|Cancel)$/i }),
    });
    if (optionText) {
      dialogs = dialogs.filter({
        has: scope.getByText(optionText, { exact: true }),
      });
    }
    const count = await dialogs.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index -= 1) {
      const dialog = dialogs.nth(index);
      if (await dialog.isVisible({ timeout: 200 }).catch(() => false)) {
        return dialog;
      }
    }
    return null;
  }

  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
