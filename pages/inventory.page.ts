import { expect, type Locator, type Page } from '@playwright/test';
import { waitUntil } from '../utils/wait';
import { step } from '../utils/step';

export class InventoryPage {
  private readonly root: Locator;
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly resetButton: Locator;
  private readonly backButton: Locator;
  private readonly inventoryDialog: Locator;
  private readonly inventoryDialogTitle: Locator;
  private readonly unlimitedStockRadio: Locator;
  private readonly outOfStockRadio: Locator;
  private readonly limitedStockRadio: Locator;
  private readonly limitedStockInput: Locator;
  private readonly keyboardHideButton: Locator;
  private readonly dialogConfirmButton: Locator;
  private readonly dialogCancelButton: Locator;
  private readonly sharedLimitedStockWarning: Locator;
  private readonly applyToTable: Locator;
  private readonly loadingOverlay: Locator;
  private readonly noDataText: Locator;
  private readonly cards: Locator;
  private readonly treeRoot: Locator;

  constructor(private readonly page: Page) {
    this.root = this.page.locator('#inventory');
    this.searchInput = this.root.locator('#inventoryIpt');
    this.searchButton = this.root
      .getByRole('button', { name: /^(Search|搜索)$/i })
      .or(this.root.getByText(/^Search$/i))
      .or(this.root.locator('[class*="button_search"]'))
      .first();
    this.resetButton = this.root
      .getByRole('button', { name: /^(Reset|重置)$/i })
      .or(this.root.getByText(/^Reset$/i))
      .or(this.root.locator('[class*="button_reset"]'))
      .first();
    this.backButton = this.page
      .locator('#pagingToHomePage:visible')
      .or(this.page.locator('#odBack:visible'))
      .or(this.page.locator('.backtohome:visible'))
      .or(this.page.getByRole('button', { name: 'Back' }))
      .or(this.page.locator('header [role="button"]:visible').last())
      .or(this.page.locator('[class*="back"]:visible'))
      .first();
    this.inventoryDialog = this.page.locator('#inventory-dialog');
    this.inventoryDialogTitle = this.inventoryDialog.getByText(/Inventory of\s+/i);
    this.unlimitedStockRadio = this.inventoryDialog.locator('#iRadio1');
    this.outOfStockRadio = this.inventoryDialog.locator('#iRadio2');
    this.limitedStockRadio = this.inventoryDialog.locator('#iRadiogq');
    this.limitedStockInput = this.inventoryDialog.locator('#gqipt');
    this.keyboardHideButton = this.page
      .locator('span.material-symbols-rounded.mi-32')
      .filter({ hasText: /^keyboard_hide$/i })
      .first();
    this.sharedLimitedStockWarning = this.inventoryDialog.getByText(
      /At Least One Channel Selection Shared Limited Stock/i,
    );
    this.applyToTable = this.inventoryDialog.getByRole('table').or(this.inventoryDialog.locator('table')).first();
    this.loadingOverlay = this.page.getByText(/Loading/i).first();
    this.noDataText = this.root.getByText(/^No Data$/i).first();
    this.dialogConfirmButton = this.inventoryDialog.locator('#inventory-submit');
    this.dialogCancelButton = this.inventoryDialog.locator('#inventory-cancel');
    this.cards = this.root.locator('[class*="card_cardContainer"]');
    this.treeRoot = this.page.locator('body');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private itemCard(itemName: string): Locator {
    return this.cards.filter({
      hasText: new RegExp(this.escapeRegExp(itemName), 'i'),
    }).first();
  }

  private itemStatus(itemName: string): Locator {
    return this.itemCard(itemName).locator('[class*="card_itemstatus"]').first();
  }

  private itemNameText(itemName: string): Locator {
    return this.itemCard(itemName).getByText(new RegExp(this.escapeRegExp(itemName), 'i'));
  }

  private async readVisibleCardTexts(limit = 8): Promise<string[]> {
    const count = await this.cards.count().catch(() => 0);
    const texts: string[] = [];
    for (let index = 0; index < Math.min(count, limit); index += 1) {
      const cardText = await this.cards.nth(index).innerText().catch(() => '');
      if (cardText.trim()) {
        texts.push(cardText.replace(/\s+/g, ' ').trim());
      }
    }
    return texts;
  }

  private async setSearchInputValue(value: string): Promise<void> {
    try {
      await this.searchInput.fill(value);
      return;
    } catch {
      await this.searchInput.evaluate((inputElement, nextValue) => {
        const input = inputElement as HTMLInputElement;
        input.focus();
        input.value = String(nextValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
  }

  private async closeInventoryDialogIfVisible(): Promise<void> {
    if (!(await this.inventoryDialog.isVisible().catch(() => false))) {
      return;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    if (await this.inventoryDialog.isVisible().catch(() => false)) {
      await this.dialogCancelButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.dialogCancelButton.evaluate((buttonElement) => {
        (buttonElement as HTMLElement).click();
      });
    }
    await waitUntil(
      async () => await this.inventoryDialog.isVisible().catch(() => false),
      (visible) => visible === false,
      {
        timeout: 10_000,
        interval: 250,
        message: '库存弹窗未能关闭',
      },
    ).catch(() => {});
  }

  private applyToRows(): Locator {
    return this.applyToTable.getByRole('row');
  }

  private applyToAvailabilityCell(row: Locator): Locator {
    return row.locator('td').nth(1);
  }

  private applyToItemCell(row: Locator): Locator {
    return row.locator('td').nth(4);
  }

  private async readApplyToRowChannelText(row: Locator): Promise<string> {
    return (await row.locator('td, th').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }

  private async findApplyToRowByChannel(channelName: string): Promise<Locator | null> {
    const rows = this.applyToRows();
    const rowCount = await rows.count();
    for (let index = 0; index < rowCount; index += 1) {
      const row = rows.nth(index);
      const rowChannelText = (await this.readApplyToRowChannelText(row)).toLowerCase();
      if (rowChannelText === channelName.toLowerCase()) {
        return row;
      }
    }
    return null;
  }

  private async selectApplyToAvailabilityOption(
    row: Locator,
    optionLabel: string,
    timeoutMs = 10_000,
  ): Promise<boolean> {
    const availabilityCell = this.applyToAvailabilityCell(row);
    const channelText = await this.readApplyToRowChannelText(row);
    const itemCell = this.applyToItemCell(row);
    const itemText = (await itemCell.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (!channelText || !itemText || /No matching item/i.test(itemText)) {
      return false;
    }

    if (await this.keyboardHideButton.isVisible().catch(() => false)) {
      await this.keyboardHideButton.evaluate((buttonElement) => {
        (buttonElement as HTMLElement).click();
      });
    }

    const currentText = (await availabilityCell.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (/^--$/.test(currentText)) {
      return false;
    }

    await availabilityCell.scrollIntoViewIfNeeded().catch(() => {});
    const textTrigger = availabilityCell
      .getByText(new RegExp(this.escapeRegExp(currentText), 'i'))
      .first();
    const selectControl = availabilityCell.locator('select').first();
    const comboboxControl = availabilityCell.getByRole('combobox').first();
    const buttonControl = availabilityCell.getByRole('button').first();
    const control = selectControl.or(comboboxControl).or(buttonControl).first();

    if (await control.isVisible().catch(() => false)) {
      const tagName = await control.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'select') {
        await control.selectOption({ label: optionLabel });
      } else {
        await control.click({ force: true });
        const option = this.page
          .locator('li[role="option"], [role="option"], button, div')
          .filter({ hasText: new RegExp(`^${this.escapeRegExp(optionLabel)}$`, 'i') })
          .first()
          .or(this.page.getByRole('option', { name: new RegExp(this.escapeRegExp(optionLabel), 'i') }).first());
        await expect(option).toBeVisible({ timeout: timeoutMs });
        await option.click();
      }
    } else {
      if (await textTrigger.isVisible().catch(() => false)) {
        await textTrigger.click({ force: true });
      } else {
        await availabilityCell.click({ force: true });
      }
      const option = this.page
        .locator('li[role="option"], [role="option"], button, div')
        .filter({ hasText: new RegExp(`^${this.escapeRegExp(optionLabel)}$`, 'i') })
        .first()
        .or(this.page.getByRole('option', { name: new RegExp(this.escapeRegExp(optionLabel), 'i') }).first());
      await expect(option).toBeVisible({ timeout: timeoutMs });
      await option.click();
    }

    await waitUntil(
      async () => (await availabilityCell.innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
      (text) => new RegExp(this.escapeRegExp(optionLabel), 'i').test(text),
      {
        timeout: timeoutMs,
        interval: 250,
        message: `库存警告弹窗中 ${channelText} 行可用性未切换为 ${optionLabel}`,
      },
    );
    return true;
  }

  @step((optionLabel: string) => `页面操作：将库存警告弹窗中的可用性下拉框统一设为 ${optionLabel}`)
  async setApplyToAvailabilityOptionForVisibleRows(optionLabel: string): Promise<void> {
    await expect(this.applyToTable).toBeVisible({ timeout: 15_000 });
    const posRow = await this.findApplyToRowByChannel('POS');
    if (!posRow) {
      throw new Error(`库存警告弹窗中未找到 POS 行，无法切换为 ${optionLabel}`);
    }

    await this.selectApplyToAvailabilityOption(posRow, optionLabel);
  }

  @step('页面操作：确认库存管理页面已经加载完成')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#inventory/i);
    await expect(this.root).toBeVisible({ timeout: 30_000 });
    await expect(this.searchInput).toBeVisible({ timeout: 15_000 });
  }

  @step((keyword: string) => `页面操作：在库存页搜索菜品关键字 ${keyword}`)
  async searchItem(keyword: string): Promise<void> {
    await this.expectLoaded();
    const searchOnce = async (term: string): Promise<boolean> => {
      if (await this.keyboardHideButton.isVisible().catch(() => false)) {
        await this.keyboardHideButton.evaluate((buttonElement) => {
          (buttonElement as HTMLElement).click();
        });
      }
      await this.setSearchInputValue(term);
      if (await this.searchButton.isVisible().catch(() => false)) {
        await this.searchButton.evaluate((buttonElement) => {
          (buttonElement as HTMLElement).click();
        });
      }
      await waitUntil(
        async () => {
          const cardCount = await this.cards.count().catch(() => 0);
          const noDataVisible = await this.noDataText.isVisible().catch(() => false);
          return cardCount > 0 && !noDataVisible;
        },
        (ok) => ok === true,
        {
          timeout: 20_000,
          interval: 250,
          message: `库存页搜索 ${term} 后未渲染出可见商品卡片`,
        },
      ).catch(() => false);
      await waitUntil(
        async () => await this.loadingOverlay.isVisible().catch(() => false),
        (visible) => visible === false,
        {
          timeout: 20_000,
          interval: 250,
          message: `库存页搜索 ${term} 后仍处于加载中`,
        },
      ).catch(() => {});
      return (await this.cards.count().catch(() => 0)) > 0 && !(await this.noDataText.isVisible().catch(() => false));
    };

    const exactSearchOk = await searchOnce(keyword);
    if (exactSearchOk) {
      return;
    }

    if (await this.resetButton.isVisible().catch(() => false)) {
      await this.resetButton.click();
      await waitUntil(
        async () => await this.loadingOverlay.isVisible().catch(() => false),
        (visible) => visible === false,
        {
          timeout: 20_000,
          interval: 250,
          message: `库存页重置筛选后仍处于加载中`,
        },
      ).catch(() => {});
    }

    const fallbackKeyword = keyword.replace(/\d+$/u, '').trim();
    if (fallbackKeyword && fallbackKeyword !== keyword) {
      const fallbackSearchOk = await searchOnce(fallbackKeyword);
      if (fallbackSearchOk) {
        return;
      }
    }

    await searchOnce(keyword);
  }

  @step('页面操作：重置库存页筛选条件')
  async resetFilters(): Promise<void> {
    await this.expectLoaded();
    if (await this.resetButton.isVisible().catch(() => false)) {
      await this.resetButton.evaluate((buttonElement) => {
        (buttonElement as HTMLElement).click();
      });
      await waitUntil(
        async () => await this.loadingOverlay.isVisible().catch(() => false),
        (visible) => visible === false,
        {
          timeout: 20_000,
          interval: 250,
          message: '库存页重置筛选后仍处于加载中',
        },
      ).catch(() => {});
    }
    await this.setSearchInputValue('').catch(() => {});
  }

  @step((categoryName: string) => `页面操作：在库存页左侧树选择分类 ${categoryName}`)
  async selectCategoryTreeItem(categoryName: string): Promise<void> {
    await this.expectLoaded();
    const categoryButton = this.root
      .getByRole('button', { name: new RegExp(`^${this.escapeRegExp(categoryName)}$`, 'i') })
      .first()
      .or(this.root.getByText(new RegExp(`^${this.escapeRegExp(categoryName)}$`, 'i'), { exact: true }).first());
    await expect(categoryButton).toBeVisible({ timeout: 15_000 });
    await categoryButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    await waitUntil(
      async () => await this.loadingOverlay.isVisible().catch(() => false),
      (visible) => visible === false,
      {
        timeout: 20_000,
        interval: 250,
        message: `选择库存分类 ${categoryName} 后仍处于加载中`,
      },
    ).catch(() => {});
  }

  @step((itemName: string) => `页面读取：确认库存页可见菜品卡片 ${itemName}`)
  async expectItemCardVisible(itemName: string): Promise<void> {
    await waitUntil(
      async () => await this.loadingOverlay.isVisible().catch(() => false),
      (visible) => visible === false,
      {
        timeout: 20_000,
        interval: 250,
        message: `库存页在等待菜品卡片 ${itemName} 时仍处于加载中`,
      },
    ).catch(() => {});
    const targetCard = this.itemCard(itemName);
    if (!(await targetCard.isVisible().catch(() => false))) {
      const visibleCards = await this.readVisibleCardTexts();
      throw new Error(
        `库存页未找到菜品卡片 ${itemName}。当前可见卡片：${visibleCards.length > 0 ? visibleCards.join(' || ') : '无'}`,
      );
    }
    await expect(targetCard).toBeVisible({ timeout: 15_000 });
    await expect(this.itemNameText(itemName)).toBeVisible({ timeout: 15_000 });
  }

  @step((itemName: string) => `页面读取：读取库存页菜品 ${itemName} 当前状态`)
  async readItemStatus(itemName: string): Promise<string> {
    await this.expectItemCardVisible(itemName);
    return (await this.itemStatus(itemName).innerText()).replace(/\s+/g, ' ').trim();
  }

  @step((itemName: string) => `页面读取：读取库存页菜品 ${itemName} 当前库存数量`)
  async readItemStockQuantity(itemName: string): Promise<number | null> {
    const statusText = await this.readItemStatus(itemName);
    const match = statusText.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  }

  @step((itemName: string) => `页面操作：打开库存页菜品 ${itemName} 的编辑弹窗`)
  async openItemDialog(itemName: string): Promise<void> {
    await this.expectItemCardVisible(itemName);
    await this.itemNameText(itemName).click();
    await expect(this.inventoryDialog).toBeVisible({ timeout: 15_000 });
  }

  @step('页面操作：在库存弹窗中选择 In Stock (Unlimited)')
  async selectUnlimitedStock(): Promise<void> {
    await expect(this.inventoryDialog).toBeVisible({ timeout: 15_000 });
    await this.unlimitedStockRadio.check({ force: true });
    await expect(this.unlimitedStockRadio).toBeChecked({ timeout: 5_000 });
  }

  @step('页面操作：在库存弹窗中选择 Out of Stock')
  async selectOutOfStock(): Promise<void> {
    await expect(this.inventoryDialog).toBeVisible({ timeout: 15_000 });
    await this.outOfStockRadio.check({ force: true });
    await expect(this.outOfStockRadio).toBeChecked({ timeout: 5_000 });
  }

  @step((quantity: number) => `页面操作：在库存弹窗中选择 Limited Stock 并填写数量 ${quantity}`)
  async selectLimitedStock(quantity: number): Promise<void> {
    await expect(this.inventoryDialog).toBeVisible({ timeout: 15_000 });
    await this.limitedStockRadio.check({ force: true });
    await expect(this.limitedStockRadio).toBeChecked({ timeout: 5_000 });
    await expect(this.limitedStockInput).toBeVisible({ timeout: 10_000 });
    await this.limitedStockInput.fill(String(quantity));
    await expect(this.limitedStockInput).toHaveValue(String(quantity), { timeout: 5_000 });
    if (await this.keyboardHideButton.isVisible().catch(() => false)) {
      await this.keyboardHideButton.evaluate((buttonElement) => {
        (buttonElement as HTMLElement).click();
      });
      await expect(this.dialogConfirmButton).toBeVisible({ timeout: 10_000 });
    }
  }

  @step('页面读取：判断库存弹窗是否提示当前共有库存为 0 的共享限量警告')
  async isSharedLimitedStockWarningVisible(): Promise<boolean> {
    return await this.sharedLimitedStockWarning.isVisible().catch(() => false);
  }

  @step('页面操作：提交库存弹窗保存修改')
  async confirmDialog(
    options: { fallbackToCancel?: boolean; closeTimeoutMs?: number; waitForClose?: boolean } = {},
  ): Promise<boolean> {
    const { fallbackToCancel = true, closeTimeoutMs = 5_000, waitForClose = true } = options;
    if (!(await this.dialogConfirmButton.isVisible().catch(() => false))) {
      if (await this.keyboardHideButton.isVisible().catch(() => false)) {
        await this.keyboardHideButton.evaluate((buttonElement) => {
          (buttonElement as HTMLElement).click();
        });
      }
    }
    await this.dialogConfirmButton.scrollIntoViewIfNeeded();
    await expect(this.dialogConfirmButton).toBeVisible({ timeout: 15_000 });

    await this.dialogConfirmButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });

    if (!waitForClose) {
      return false;
    }

    const closedNaturally = await waitUntil(
      async () => await this.inventoryDialog.isVisible().catch(() => false),
      (visible) => visible === false,
      {
        timeout: closeTimeoutMs,
        interval: 250,
        message: '库存弹窗在保存后未关闭',
      },
    ).catch(() => false);

    if (!closedNaturally && fallbackToCancel && (await this.inventoryDialog.isVisible().catch(() => false))) {
      await this.dialogCancelButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.dialogCancelButton.evaluate((buttonElement) => {
        (buttonElement as HTMLElement).click();
      });
      await waitUntil(
        async () => await this.inventoryDialog.isVisible().catch(() => false),
        (visible) => visible === false,
        {
          timeout: closeTimeoutMs,
          interval: 250,
          message: '库存弹窗在点击 Cancel 后仍未关闭',
        },
      );
    }

    return closedNaturally;
  }

  @step('页面读取：确认库存弹窗是否仍然打开')
  async isInventoryDialogVisible(): Promise<boolean> {
    return await this.inventoryDialog.isVisible().catch(() => false);
  }

  @step('页面操作：取消库存弹窗修改')
  async cancelDialog(): Promise<void> {
    await expect(this.dialogCancelButton).toBeVisible({ timeout: 15_000 });
    await this.dialogCancelButton.click();
    await expect(this.inventoryDialog).toBeHidden({ timeout: 15_000 });
  }

  @step((itemName: string) => `页面操作：将库存页菜品 ${itemName} 设为 Unlimited`)
  async setUnlimitedStock(itemName: string): Promise<void> {
    await this.openItemDialog(itemName);
    await this.selectUnlimitedStock();
    await this.confirmDialog();
    await expect(this.itemStatus(itemName)).toContainText(/Unlimited/i, { timeout: 15_000 });
  }

  @step((itemName: string) => `页面操作：将库存页菜品 ${itemName} 设为 Out of Stock`)
  async setOutOfStock(itemName: string): Promise<void> {
    await this.openItemDialog(itemName);
    await this.selectOutOfStock();
    await this.confirmDialog();
    await expect(this.itemStatus(itemName)).toContainText(/Out of Stock/i, { timeout: 15_000 });
  }

  @step((itemName: string, quantity: number) => `页面操作：将库存页菜品 ${itemName} 设为 Limited Stock ${quantity}`)
  async setLimitedStock(itemName: string, quantity: number): Promise<void> {
    await this.closeInventoryDialogIfVisible();
    await this.openItemDialog(itemName);
    await this.selectLimitedStock(quantity);

    const firstConfirmClosed = await this.confirmDialog({
      fallbackToCancel: false,
      closeTimeoutMs: 5_000,
    });

    if (!firstConfirmClosed) {
      if (!(await this.inventoryDialog.isVisible().catch(() => false))) {
        return;
      }
      await expect(this.inventoryDialog).toBeVisible({ timeout: 10_000 });
      await expect(this.applyToTable).toBeVisible({ timeout: 10_000 });
      await expect(this.limitedStockRadio).toBeChecked({ timeout: 5_000 });
      await expect(this.limitedStockInput).toHaveValue(String(quantity), { timeout: 5_000 });

      await this.setApplyToAvailabilityOptionForVisibleRows('Shared Limited Stock');

      await this.confirmDialog({
        fallbackToCancel: false,
        closeTimeoutMs: 20_000,
      });
    }
  }

  @step('页面操作：从库存页返回点餐页')
  async backToOrderPage(): Promise<void> {
    await expect(this.backButton).toBeVisible({ timeout: 15_000 });
    await this.backButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    await waitUntil(
      async () => this.page.url(),
      (url) => !/#inventory/i.test(url) && /#order[_-]?dishes/i.test(url),
      {
        timeout: 30_000,
        interval: 250,
        message: '从库存页返回后未回到点餐页',
      },
    );
  }

  @step('页面操作：从库存页直接返回 POS 主页壳')
  async backToHomeShell(): Promise<void> {
    await expect(this.backButton).toBeVisible({ timeout: 15_000 });
    await this.backButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    await waitUntil(
      async () => this.page.url(),
      (url) => !/#inventory/i.test(url) && /myhome\.html/i.test(url),
      {
        timeout: 30_000,
        interval: 250,
        message: '从库存页返回后未回到 POS 主页壳',
      },
    );
  }
}
