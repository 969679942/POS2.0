import { expect, type Locator, type Page } from '@playwright/test';
import { GuestCountDialogPage } from './guest-count-dialog.page';
import { step } from '../utils/step';

export type SelectedTableRecord = {
  areaName: string;
  tableNumber: string;
};

export class SelectTablePage {
  private readonly backButton: Locator;
  private readonly areaRadios: Locator;
  private readonly tableNodes: Locator;
  private readonly availableTableNodes: Locator;
  /** List 视图：桌台为 button，内含 Seat2Icon；勿用 role name 匹配（img alt 可能不计入 button 可访问名） */
  private readonly listViewTableButtons: Locator;

  constructor(private readonly page: Page) {
    this.backButton = this.page.getByRole('button', { name: 'Back' });
    this.areaRadios = this.page.getByRole('radio');
    this.tableNodes = this.page.locator('article.table-node[role="button"]');
    this.availableTableNodes = this.page.locator(
      'article.table-node.table-node-available:not([class*="table-node-order-"])',
    );
    this.listViewTableButtons = this.page.getByRole('button').filter({
      has: this.page.getByRole('img', { name: /Seat2Icon/i }),
    });
  }

  @step('页面操作：确认选桌页面已经加载完成')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#tableV2/);
    await expect(this.backButton).toBeVisible();
  }

  @step('页面操作：读取当前区域下所有空桌')
  async getAvailableTables(): Promise<Locator[]> {
    await this.expectLoaded();

    const availableTableCount = await this.availableTableNodes.count();
    const availableTables: Locator[] = [];

    for (let index = 0; index < availableTableCount; index += 1) {
      availableTables.push(this.availableTableNodes.nth(index));
    }

    if (availableTables.length > 0) {
      return availableTables;
    }

    const listCount = await this.listViewTableButtons.count();
    for (let index = 0; index < listCount; index += 1) {
      const row = this.listViewTableButtons.nth(index);
      if (await row.isVisible()) {
        availableTables.push(row);
      }
    }

    return availableTables;
  }

  @step((areaName: string) => `页面操作：切换到区域 ${areaName}`)
  async selectArea(areaName: string): Promise<void> {
    const areaRadio = this.page.getByRole('radio', {
      name: areaName,
      exact: true,
    });

    await expect(areaRadio).toBeVisible();

    if ((await areaRadio.getAttribute('aria-checked')) !== 'true') {
      await areaRadio.click();
    }
  }

  @step('页面操作：读取当前选中的区域名称')
  async getCurrentAreaName(): Promise<string> {
    const selectedArea = this.page.locator('button[aria-pressed="true"]');

    await expect(selectedArea).toBeVisible();

    const areaName = (await selectedArea.textContent())?.trim();

    if (!areaName) {
      throw new Error('Unable to determine the current selected area on the select-table page.');
    }

    return areaName;
  }

  @step((tableNumber: string) => `页面操作：在当前区域中查找桌号为 ${tableNumber} 的桌台`)
  async findTableByNumber(tableNumber: string): Promise<Locator> {
    const escapedTableNumber = tableNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const table = this.tableNodes.filter({
      has: this.page.locator('.table-node-title', {
        hasText: new RegExp(`^${escapedTableNumber}$`),
      }),
    });

    if ((await table.count()) > 0) {
      await expect(table.first()).toBeVisible();
      return table.first();
    }

    const listRow = this.listViewTableButtons.filter({
      has: this.page.getByText(new RegExp(`^${escapedTableNumber}$`)),
    });
    await expect(listRow.first()).toBeVisible();
    return listRow.first();
  }

  @step('页面操作：点击指定桌台卡片并弹出人数选择框')
  async clickTable(table: Locator): Promise<GuestCountDialogPage> {
    await expect(table).toBeVisible();
    await table.click();
    return new GuestCountDialogPage(this.page);
  }

  @step('页面操作：读取桌台卡片中的桌号')
  async readTableNumber(table: Locator): Promise<string> {
    const fromCard = (await table.locator('.table-node-title').textContent())?.trim();
    if (fromCard) {
      return fromCard;
    }

    const fromListRow = (
      await table.locator(':scope > *').first().locator(':scope > *').first().textContent()
    )?.trim();
    if (fromListRow) {
      return fromListRow;
    }

    throw new Error('Unable to read the table number from the table card or list row.');
  }
}
