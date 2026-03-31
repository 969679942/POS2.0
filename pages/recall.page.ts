import { expect, type Locator, type Page } from '@playwright/test';
import {
  type RecallManualSearchTag,
  type RecallOrderStatus,
  type RecallOrderType,
  type RecallPaymentStatus,
  type RecallPaymentType,
  type RecallProductLine,
} from '../test-data/recall-search-options';
import { step } from '../utils/step';

export class RecallPage {
  private readonly newOrderButton: Locator;
  private readonly pagingButton: Locator;
  private readonly paymentStatusButton: Locator;
  private readonly orderStatusButton: Locator;
  private readonly orderTypesButton: Locator;
  private readonly paymentTypesButton: Locator;
  private readonly productLineButton: Locator;
  private readonly moreFiltersButton: Locator;
  private readonly searchTriggerButton: Locator;
  private readonly topSearchInput: Locator;
  private readonly orderNumberBadges: Locator;
  private readonly searchDialog: Locator;
  private readonly searchDialogDefaultInput: Locator;
  private readonly searchDialogNumberInput: Locator;
  private readonly searchDialogAmountInput: Locator;
  private readonly searchDialogDefaultInputClearButton: Locator;
  private readonly searchDialogNumberInputClearButton: Locator;
  private readonly searchDialogAmountInputClearButton: Locator;
  private readonly searchDialogSubmitButton: Locator;
  private readonly searchDialogKeyboardCloseButton: Locator;
  private readonly activeFilterTags: Locator;

  constructor(private readonly page: Page) {
    this.newOrderButton = this.page.getByTestId('recall2-header-new-order');
    this.pagingButton = this.page.getByTestId('recall2-header-paging');
    this.paymentStatusButton = this.page.getByTestId('recall2-filter-dropdown-paymentStatus');
    this.orderStatusButton = this.page.getByTestId('recall2-filter-dropdown-orderStatus');
    this.orderTypesButton = this.page.getByTestId('recall2-filter-dropdown-orderType');
    this.paymentTypesButton = this.page.getByTestId('recall2-filter-dropdown-paymentType');
    this.productLineButton = this.page.getByTestId('recall2-filter-dropdown-productLine');
    this.moreFiltersButton = this.page.getByTestId('icon-button-More Filters');
    this.searchTriggerButton = this.page.getByTestId('recall2-search-trigger');
    this.topSearchInput = this.page.getByTestId('recall2-search-input');
    this.orderNumberBadges = this.page.getByText(/^#\d+$/);
    this.searchDialog = this.page.getByTestId('recall2-search-modal');
    this.searchDialogDefaultInput = this.searchDialog.getByTestId('recall2-search-modal-input-default');
    this.searchDialogNumberInput = this.searchDialog.getByTestId('recall2-search-modal-input-number');
    this.searchDialogAmountInput = this.searchDialog.getByTestId('recall2-search-modal-input-amount');
    this.searchDialogDefaultInputClearButton = this.searchDialog.getByTestId(
      'recall2-search-modal-input-default-clear',
    );
    this.searchDialogNumberInputClearButton = this.searchDialog.getByTestId(
      'recall2-search-modal-input-number-clear',
    );
    this.searchDialogAmountInputClearButton = this.searchDialog.getByTestId(
      'recall2-search-modal-input-amount-clear',
    );
    this.searchDialogSubmitButton = this.searchDialog.getByTestId('recall2-search-modal-search-button');
    this.searchDialogKeyboardCloseButton = this.page.getByTestId('pos-keyboard-button-{close}');
    this.activeFilterTags = this.page.getByTestId(/^recall2-filter-tag-(?!label|value).+$/);
  }

  @step('页面操作：确认 Recall 页面已经加载完成')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#recall/);
    await expect(this.newOrderButton).toBeVisible({ timeout: 15_000 });
    await expect(this.pagingButton).toBeVisible({ timeout: 15_000 });
    await expect(this.paymentStatusButton).toBeVisible({ timeout: 15_000 });
    await expect(this.topSearchInput).toBeVisible({ timeout: 15_000 });
    await expect(this.moreFiltersButton).toBeVisible({ timeout: 15_000 });
  }

  @step((paymentStatus: string) => `页面操作：按支付状态筛选 ${paymentStatus}`)
  async selectPaymentStatus(paymentStatus: RecallPaymentStatus): Promise<void> {
    await this.selectTopDropdownOption(this.paymentStatusButton, paymentStatus);
  }

  @step((orderStatus: string) => `页面操作：按订单状态筛选 ${orderStatus}`)
  async selectOrderStatus(orderStatus: RecallOrderStatus): Promise<void> {
    await this.selectTopDropdownOption(this.orderStatusButton, orderStatus);
  }

  @step((orderType: string) => `页面操作：按订单类型筛选 ${orderType}`)
  async selectOrderType(orderType: RecallOrderType): Promise<void> {
    await this.selectTopDropdownOption(this.orderTypesButton, orderType);
  }

  @step((paymentType: string) => `页面操作：按支付方式筛选 ${paymentType}`)
  async selectPaymentType(paymentType: RecallPaymentType): Promise<void> {
    await this.selectTopDropdownOption(this.paymentTypesButton, paymentType);
  }

  @step((productLine: string) => `页面操作：按产品类型筛选 ${productLine}`)
  async selectProductLine(productLine: RecallProductLine): Promise<void> {
    await this.selectTopDropdownOption(this.productLineButton, productLine);
  }

  @step('页面操作：打开手动输入搜索弹窗')
  async openManualSearchDialog(): Promise<void> {
    await this.searchTriggerButton.click();
    await expect(this.searchDialog).toBeVisible();
  }

  @step((tag: RecallManualSearchTag) => `页面操作：选择手动输入搜索标签 ${tag}`)
  async selectManualSearchTag(tag: RecallManualSearchTag): Promise<void> {
    await expect(this.searchDialog).toBeVisible();
    await this.searchDialog.getByTestId(this.resolveManualSearchTagTestId(tag)).click();
  }

  @step((keyword: string) => `页面操作：输入手动搜索关键字 ${keyword}`)
  async fillManualSearchKeyword(keyword: string): Promise<void> {
    await expect(this.searchDialog).toBeVisible();
    await (await this.resolveVisibleSearchDialogInput()).fill(keyword);
  }

  @step('页面操作：提交手动输入搜索条件')
  async submitManualSearch(): Promise<void> {
    await expect(this.searchDialog).toBeVisible();
    await this.searchDialogSubmitButton.click();
    await expect(this.searchDialog).toBeHidden();
  }

  @step('页面操作：关闭手动输入搜索弹窗')
  async closeManualSearchDialog(): Promise<void> {
    if (await this.searchDialog.isVisible().catch(() => false)) {
      if (await this.searchDialogKeyboardCloseButton.isVisible().catch(() => false)) {
        await this.searchDialogKeyboardCloseButton.evaluate((closeButton) => {
          (closeButton as HTMLElement).click();
        });
      }

      if (await this.searchDialog.isVisible().catch(() => false)) {
        await this.page.keyboard.press('Escape');
      }

      await expect(this.searchDialog).toBeHidden({ timeout: 2_000 });
    }
  }

  @step('页面操作：清空当前所有搜索条件')
  async clearAllSearchConditions(): Promise<void> {
    await this.clearManualSearchConditionIfNeeded();

    while (await this.activeFilterTags.count()) {
      await this.activeFilterTags.first().click();
    }
  }

  @step('页面操作：读取当前可见订单号列表')
  async readVisibleOrderNumbers(): Promise<string[]> {
    const orderNumbers = await this.orderNumberBadges.allTextContents();
    return orderNumbers.map((orderNumber) => orderNumber.trim()).filter(Boolean);
  }

  @step('页面操作：读取当前手动搜索关键字')
  async readManualSearchKeyword(): Promise<string> {
    return await this.topSearchInput.inputValue();
  }

  @step('页面操作：读取当前激活的筛选条件')
  async readActiveFilterTexts(): Promise<string[]> {
    const filterTexts = await this.activeFilterTags.allTextContents();
    return filterTexts.map((filterText) => filterText.trim()).filter(Boolean);
  }

  @step((_filterButton: Locator, optionName: string) => `页面操作：从顶部筛选下拉菜单中选择 ${optionName}`)
  private async selectTopDropdownOption(
    filterButton: Locator,
    optionName: string,
  ): Promise<void> {
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await this.page
      .getByTestId(/^recall2-filter-option-.+$/)
      .filter({ hasText: optionName })
      .first()
      .click();
  }

  @step('页面操作：如有手动搜索关键字则重置 Recall 页面状态')
  private async clearManualSearchConditionIfNeeded(): Promise<void> {
    const currentKeyword = await this.topSearchInput.inputValue().catch(() => '');

    if (!currentKeyword) {
      return;
    }

    await this.openManualSearchDialog();

    const visibleClearButton = await this.resolveVisibleSearchDialogClearButton();

    if (visibleClearButton) {
      await visibleClearButton.evaluate((clearButton) => {
        (clearButton as HTMLElement).click();
      });
    } else {
      await (await this.resolveVisibleSearchDialogInput()).fill('');
    }

    await expect(await this.resolveVisibleSearchDialogInput()).toHaveValue('');
    await this.closeManualSearchDialog();
    await this.topSearchInput.evaluate((inputElement) => {
      const input = inputElement as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(this.topSearchInput).toHaveValue('');
  }

  private async resolveVisibleSearchDialogInput(): Promise<Locator> {
    const inputCandidates = [
      this.searchDialogDefaultInput,
      this.searchDialogNumberInput,
      this.searchDialogAmountInput,
    ];

    for (const inputCandidate of inputCandidates) {
      if (await inputCandidate.isVisible().catch(() => false)) {
        return inputCandidate;
      }
    }

    throw new Error('Unable to find a visible manual search input in the Recall search dialog.');
  }

  private async resolveVisibleSearchDialogClearButton(): Promise<Locator | null> {
    const clearButtonCandidates = [
      this.searchDialogDefaultInputClearButton,
      this.searchDialogNumberInputClearButton,
      this.searchDialogAmountInputClearButton,
    ];

    for (const clearButtonCandidate of clearButtonCandidates) {
      if (await clearButtonCandidate.isVisible().catch(() => false)) {
        return clearButtonCandidate;
      }
    }

    return null;
  }

  private resolveManualSearchTagTestId(tag: RecallManualSearchTag): string {
    switch (tag) {
      case 'Order No.':
        return 'recall2-search-type-option-orderNo';
      case 'Linked Order No.':
        return 'recall2-search-type-option-linkedNo';
      case 'Phone No.':
        return 'recall2-search-type-option-phoneNo';
      case 'Last 4 Digits':
        return 'recall2-search-type-option-last4Digts';
      case 'Payment Amount':
        return 'recall2-search-type-option-total';
      case 'Card Holder':
        return 'recall2-search-type-option-cardHolder';
      case 'Item Name':
        return 'recall2-search-type-option-itemName';
      case 'Table Name':
        return 'recall2-search-type-option-tableName';
      default:
        throw new Error(`Unsupported Recall manual search tag: ${tag}`);
    }
  }
}
