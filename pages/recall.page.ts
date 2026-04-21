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
import { waitUntil } from '../utils/wait';

export type RecallCustomerInfo = {
  name: string;
  phone: string;
  address: string | null;
  note: string | null;
};

export type RecallMemberInfo = {
  entries: string[];
};

export type RecallOrderContext = {
  orderType: string | null;
  tableName: string | null;
  guestCount: string | null;
  serverName: string | null;
};

export type RecallOrderPaymentRecord = {
  method: string;
  amount: string | null;
  details: Record<string, string>;
};

export type RecallOrderItemAddition = {
  name: string;
  price?: string;
};

export type RecallOrderItem = {
  seat: string | null;
  sentTime: string | null;
  quantity: string | null;
  name: string;
  price: string | null;
  additions: RecallOrderItemAddition[];
};

export type RecallOrderDetails = {
  orderNumber: string;
  paymentStatus: string | null;
  customerInfo: RecallCustomerInfo | null;
  memberInfo: RecallMemberInfo | null;
  orderContext: RecallOrderContext;
  payments: RecallOrderPaymentRecord[];
  items: RecallOrderItem[];
  priceSummary: Record<string, string>;
};

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
  private readonly orderListContainer: Locator;
  private readonly orderDetailsDialog: Locator;
  private readonly orderDetailsMoreActionsButton: Locator;
  private readonly partialVoidButton: Locator;
  private readonly voidAllButton: Locator;
  private readonly voidReasonInput: Locator;
  private readonly restoreInventoryCheckbox: Locator;
  private readonly voidSubmitButton: Locator;
  private readonly recallExitButton: Locator;

  constructor(private readonly page: Page) {
    this.newOrderButton = this.page.getByTestId('recall2-header-new-order');
    this.pagingButton = this.page.getByTestId('recall2-header-paging');
    /** 同 testid 可能出现双行筛选；Playwright 匹配顺序里前者常为隐藏占位，取最后一个可见实例 */
    this.paymentStatusButton = this.page
      .locator('button[data-testid="recall2-filter-dropdown-paymentStatus"]')
      .last();
    this.orderStatusButton = this.page
      .locator('button[data-testid="recall2-filter-dropdown-orderStatus"]')
      .last();
    this.orderTypesButton = this.page
      .locator('button[data-testid="recall2-filter-dropdown-orderType"]')
      .last();
    this.paymentTypesButton = this.page
      .locator('button[data-testid="recall2-filter-dropdown-paymentType"]')
      .last();
    this.productLineButton = this.page
      .locator('button[data-testid="recall2-filter-dropdown-productLine"]')
      .last();
    this.moreFiltersButton = this.page
      .getByTestId('icon-button-More Filters')
      .or(this.page.getByRole('button', { name: /^More Filters$/i }));
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
    this.orderListContainer = this.page.getByTestId('recall2-order-list-container');
    this.orderDetailsDialog = this.page.locator('[role="dialog"][data-testid="pos-ui-modal"]');
    this.orderDetailsMoreActionsButton = this.orderDetailsDialog
      .getByRole('button', { name: /^More$/i })
      .or(this.page.locator('#odsmymoreicon'))
      .or(this.orderDetailsDialog.getByText(/^More$/i))
      .first();
    this.partialVoidButton = this.orderDetailsDialog
      .locator('#pvoidod')
      .or(this.page.getByRole('button', { name: /^Void All$/i }))
      .or(this.page.getByRole('button', { name: /^Void$/i }))
      .or(this.page.getByText(/Void All|Void|Partial Void|退菜/i))
      .first();
    this.voidAllButton = this.orderDetailsDialog
      .getByRole('button', { name: /^Void All$/i })
      .or(this.page.getByRole('button', { name: /^Void All$/i }))
      .or(this.orderDetailsDialog.getByText(/^Void All$/i))
      .or(this.page.getByText(/^Void All$/i))
      .first();
    this.voidReasonInput = this.page.locator('#void-note-input:visible');
    this.restoreInventoryCheckbox = this.page
      .getByLabel(/Restore inventory for items sent to kitchen/i)
      .first();
    this.voidSubmitButton = this.page
      .getByTestId('shared-void-dialog-confirm')
      .or(this.page.locator('[data-testid="button-default"][data-test-id="shared-void-dialog-confirm"]'))
      .or(this.page.getByRole('button', { name: /^Void$/i }))
      .first();
    this.recallExitButton = this.page
      .locator('.rcreturnbx_bth_exit')
      .or(this.page.locator('.rcreturnbx_bth.ghost.rcreturnbx_bth_exit'))
      .or(this.page.getByRole('button', { name: /^(Back|Exit|返回|关闭)$/i }))
      .first();
  }

  @step('页面操作：确认 Recall 页面已经加载完成')
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#recall/);
    await expect(this.newOrderButton).toBeVisible({ timeout: 15_000 });
    await expect(this.pagingButton).toBeVisible({ timeout: 15_000 });
    await expect(this.paymentStatusButton).toBeVisible({ timeout: 15_000 });
    /** 新版 Recall 可能仅展示「Search orders」入口，输入框在弹层内，故以触发器为壳加载信号 */
    await expect(this.searchTriggerButton).toBeVisible({ timeout: 35_000 });
    await expect(this.moreFiltersButton).toBeVisible({ timeout: 15_000 });
  }

  @step('页面操作：确认 Recall 基础壳已经加载完成')
  async expectShellLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/#recall/);
    await expect(this.pagingButton).toBeVisible({ timeout: 15_000 });
    await expect(this.searchTriggerButton).toBeVisible({ timeout: 35_000 });
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

  @step((productLine: string) => `页面操作：按产品线筛选 ${productLine}`)
  async selectProductLine(productLine: RecallProductLine): Promise<void> {
    await this.selectTopDropdownOption(this.productLineButton, productLine);
  }

  @step('页面操作：打开手动输入搜索弹窗')
  async openManualSearchDialog(): Promise<void> {
    await this.searchTriggerButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
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

  @step('页面操作：提交手动搜索条件')
  async submitManualSearch(): Promise<void> {
    await expect(this.searchDialog).toBeVisible();
    await this.searchDialogSubmitButton.click();
    await expect(this.searchDialog).toBeHidden();
  }

  @step('页面操作：关闭手动搜索弹窗')
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

  @step('页面读取：读取当前可见订单号列表')
  async readVisibleOrderNumbers(): Promise<string[]> {
    const orderNumbers = await this.orderNumberBadges.allTextContents();
    return orderNumbers.map((orderNumber) => orderNumber.trim()).filter(Boolean);
  }

  @step('页面读取：轮询直到 Recall 列表渲染出至少一个订单号后返回列表')
  async readVisibleOrderNumbersWhenNonEmpty(
    options: { timeout?: number; interval?: number } = {},
  ): Promise<string[]> {
    const { timeout = 25_000, interval = 400 } = options;
    return await waitUntil(
      async () => await this.readVisibleOrderNumbers(),
      (nums) => nums.length > 0,
      {
        timeout,
        interval,
        message: 'Recall 订单列表未在预期时间内渲染出至少一个订单号',
      },
    );
  }

  @step('页面读取：读取当前手动搜索关键字')
  async readManualSearchKeyword(): Promise<string> {
    const inline = this.page.getByTestId('recall2-search-input').first();
    if ((await inline.count()) > 0 && (await inline.isVisible().catch(() => false))) {
      return await inline.inputValue();
    }
    return '';
  }

  @step('页面读取：读取当前激活的筛选条件')
  async readActiveFilterTexts(): Promise<string[]> {
    const filterTexts = await this.activeFilterTags.allTextContents();
    return filterTexts.map((filterText) => filterText.trim()).filter(Boolean);
  }

  @step((orderNumber: string) => `页面操作：打开订单 ${orderNumber} 的详情弹窗`)
  async openOrderDetails(orderNumber: string): Promise<void> {
    const normalizedOrderNumber = this.normalizeOrderNumber(orderNumber);

    await this.closeOrderDetailsDialog();
    await expect(this.orderListContainer).toBeVisible();
    await this.orderListContainer.getByText(normalizedOrderNumber, { exact: true }).first().evaluate((element) => {
      (element as HTMLElement).click();
    });
    await this.waitForOrderDetailsDialogReady();
  }

  @step('页面读取：读取订单详情中的客户信息')
  async readOrderCustomerInfo(): Promise<RecallCustomerInfo | null> {
    return (await this.readOrderDetailsSnapshot()).customerInfo;
  }

  @step('页面读取：读取订单详情中的会员信息')
  async readOrderMemberInfo(): Promise<RecallMemberInfo | null> {
    return (await this.readOrderDetailsSnapshot()).memberInfo;
  }

  @step('页面读取：读取订单详情中的支付状态')
  async readOrderPaymentStatus(): Promise<string | null> {
    return (await this.readOrderDetailsSnapshot()).paymentStatus;
  }

  @step('页面读取：读取订单详情中的菜品明细')
  async readOrderItems(): Promise<RecallOrderItem[]> {
    return (await this.readOrderDetailsSnapshot()).items;
  }

  @step('页面读取：读取订单详情中的价格汇总')
  async readOrderPriceSummary(): Promise<Record<string, string>> {
    return (await this.readOrderDetailsSnapshot()).priceSummary;
  }

  @step('页面读取：读取订单详情中的订单类型、桌号、人数与服务员信息')
  async readOrderContext(): Promise<RecallOrderContext> {
    return (await this.readOrderDetailsSnapshot()).orderContext;
  }

  @step('页面读取：读取订单详情中的支付记录')
  async readOrderPayments(): Promise<RecallOrderPaymentRecord[]> {
    return (await this.readOrderDetailsSnapshot()).payments;
  }

  @step('页面读取：读取当前详情弹窗中的完整订单信息')
  async readOrderDetailsSnapshot(): Promise<RecallOrderDetails> {
    await this.waitForOrderDetailsDialogReady();

    return await this.orderDetailsDialog.evaluate((dialogElement) => {
      const cleanText = (value: string | null | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';
      const normalizeOptionalText = (value: string | null | undefined): string | null => {
        const normalized = cleanText(value);
        return normalized && normalized !== '-' ? normalized : null;
      };
      const selectText = (scope: Element, selector: string): string | null =>
        normalizeOptionalText(scope.querySelector(selector)?.textContent);
      const readTexts = (scope: Element, selector: string): string[] =>
        Array.from(scope.querySelectorAll(selector))
          .map((node) => cleanText(node.textContent))
          .filter(Boolean);
      const dedupeElements = <T extends Element>(elements: T[]): T[] => {
        const uniqueElements: T[] = [];

        for (const element of elements) {
          if (!uniqueElements.includes(element)) {
            uniqueElements.push(element);
          }
        }

        return uniqueElements;
      };
      const getSection = (title: string): Element | null => {
        const normalizedTitle = title.toUpperCase();
        const headings = Array.from(dialogElement.querySelectorAll('h1,h2,h3,h4,h5,h6'));
        const heading = headings.find((node) => cleanText(node.textContent).toUpperCase() === normalizedTitle);
        return heading?.closest('[class*="_section_"]') ?? heading?.parentElement?.parentElement ?? null;
      };
      const uniqueValues = (values: string[]): string[] => {
        const uniqueTexts: string[] = [];

        for (const value of values) {
          if (value && !uniqueTexts.includes(value)) {
            uniqueTexts.push(value);
          }
        }

        return uniqueTexts;
      };
      const isOrderTypeText = (text: string): boolean =>
        /^(dine in|delivery|pick up|pickup|take out|to go|togo|bar|drive thru|drive-thru|online delivery|online pickup)$/i.test(
          text,
        );
      const parseTableAndGuestCount = (
        text: string,
      ): {
        tableName: string;
        guestCount: string;
      } | null => {
        const matchedGroups = text.match(/^(\d+)\((\d+)\)$/);

        if (!matchedGroups) {
          return null;
        }

        return {
          tableName: matchedGroups[1],
          guestCount: matchedGroups[2],
        };
      };
      const isGuestCountText = (text: string): boolean => /^\d+(?:\(\d+\))?$/.test(text);
      const isTableText = (text: string): boolean =>
        /\b(table|tbl|tab|booth|room|patio|bar seat)\b/i.test(text);
      const findSeatHeader = (dishElement: Element): Element | null => {
        let currentAncestor: Element | null = dishElement.parentElement;

        while (currentAncestor && currentAncestor !== dialogElement) {
          const seatHeader =
            currentAncestor.querySelector('[data-test-id^="shared-order-seat-dish-list-seat-header-"]') ??
            currentAncestor.querySelector('[data-testid^="shared-order-seat-dish-list-seat-header-"]') ??
            currentAncestor.querySelector('[class*="_seatHeader_"]');

          if (seatHeader) {
            return seatHeader;
          }

          currentAncestor = currentAncestor.parentElement;
        }

        return null;
      };
      const readDishName = (
        dishElement: Element,
        sentTime: string | null,
        quantity: string | null,
        price: string | null,
      ): string | null => {
        const explicitName =
          selectText(dishElement, '[data-testid="dish-item-name"]') ??
          selectText(dishElement, '[data-test-id="dish-item-name"]') ??
          selectText(dishElement, '[class*="_dishName_"]');

        if (explicitName) {
          return explicitName;
        }

        const directChildren = Array.from(dishElement.children);
        const mainRow =
          directChildren.find((childElement) => {
            const childText = cleanText(childElement.textContent);

            if (!childText || childText === sentTime) {
              return false;
            }

            return Boolean((price && childText.includes(price)) || (quantity && childText.includes(quantity)));
          }) ?? directChildren[0] ?? null;

        if (!mainRow) {
          return null;
        }

        const spanTexts = uniqueValues(
          Array.from(mainRow.querySelectorAll('span'))
            .map((node) => cleanText(node.textContent))
            .filter(Boolean),
        );

        return (
          spanTexts.find(
            (text) =>
              text !== sentTime &&
              text !== quantity &&
              text !== price &&
              !/^\$[\d,.]+$/.test(text) &&
              !/^\d+$/.test(text),
          ) ?? null
        );
      };

      const orderNumber =
        selectText(dialogElement, '[class*="_number_"]') ??
        normalizeOptionalText(dialogElement.textContent?.match(/#\d+/)?.[0]) ??
        '';
      let paymentStatus =
        selectText(dialogElement, '[class*="_statusTag_"]') ?? selectText(dialogElement, '[class*="_statusTag"]');
      const statusRegion = dialogElement.querySelector('[class*="_status_"]');
      if (!paymentStatus && statusRegion) {
        paymentStatus =
          selectText(statusRegion, 'span') ?? normalizeOptionalText(statusRegion.textContent?.replace(/\s+/g, ' '));
      }
      if (!paymentStatus) {
        const statusMatch = dialogElement.textContent?.match(
          /\b(Unpaid|Paid|Semi-Paid|Semi Paid|Pending|Offline Payment)\b/i,
        );
        paymentStatus = statusMatch ? statusMatch[1] : null;
      }

      const headerChipTexts = uniqueValues(
        Array.from(
          dialogElement.querySelectorAll('[class*="_header_"] button, [class*="_actionButtons_"] button'),
        )
          .map((button) => cleanText(button.textContent))
          .filter(Boolean),
      );

      let orderType: string | null = null;
      let tableName: string | null = null;
      let guestCount: string | null = null;
      let serverName: string | null = null;

      for (const chipText of headerChipTexts) {
        const parsedTableAndGuestCount = parseTableAndGuestCount(chipText);

        if (parsedTableAndGuestCount) {
          tableName ??= parsedTableAndGuestCount.tableName;
          guestCount ??= parsedTableAndGuestCount.guestCount;
          continue;
        }

        if (!orderType && isOrderTypeText(chipText)) {
          orderType = chipText;
          continue;
        }

        if (!guestCount && isGuestCountText(chipText)) {
          guestCount = chipText;
          continue;
        }

        if (!tableName && isTableText(chipText)) {
          tableName = chipText;
          continue;
        }

        if (!serverName) {
          serverName = chipText;
        }
      }

      const customerSection = getSection('CUSTOMER INFO');
      const customerPrimaryTexts = customerSection
        ? Array.from(customerSection.querySelectorAll('[class*="_customerPrimaryText_"]'))
            .map((node) => cleanText(node.textContent))
            .filter(Boolean)
        : [];
      const customerAddress = customerSection
        ? selectText(customerSection, '[class*="_customerAddressText_"]')
        : null;
      const customerNote = customerSection ? selectText(customerSection, '[class*="_customerNoteText_"]') : null;
      const customerName = normalizeOptionalText(customerPrimaryTexts[0]);
      const customerPhone = normalizeOptionalText(customerPrimaryTexts[1]);
      const customerInfo =
        customerName || customerPhone || customerAddress || customerNote
          ? {
              name: customerName ?? '',
              phone: customerPhone ?? '',
              address: customerAddress,
              note: customerNote,
            }
          : null;

      const memberSection = getSection('MEMBER INFO');
      const memberEntries = memberSection
        ? Array.from(memberSection.querySelectorAll('[class*="_memberInfoText_"]'))
            .map((node) => cleanText(node.textContent))
            .filter(Boolean)
        : [];
      const memberInfo = memberEntries.length > 0 ? { entries: memberEntries } : null;

      const paymentSection = getSection('PAYMENT');
      const payments = paymentSection
        ? dedupeElements(
            Array.from(
              paymentSection.querySelectorAll('[class*="_methodLabel_"], [class*="_paymentText_"]'),
            ).map(
              (methodElement) =>
                methodElement.closest('[class*="_card_"]') ??
                methodElement.parentElement?.parentElement ??
                methodElement.parentElement,
            ).filter((cardElement): cardElement is Element => Boolean(cardElement)),
          ).reduce<RecallOrderPaymentRecord[]>((records, cardElement) => {
              const method =
                selectText(cardElement, '[class*="_methodLabel_"]') ??
                selectText(cardElement, '[class*="_paymentText_"]');
              const amount = selectText(cardElement, '[class*="_amount_"]');
              const details = Array.from(cardElement.querySelectorAll('[class*="_contentItem_"]')).reduce<Record<string, string>>(
                (detailMap, detailRow) => {
                  const label = normalizeOptionalText(
                    detailRow.querySelector('[class*="_detailLabel_"]')?.textContent?.replace(/:\s*$/, ''),
                  );
                  const value = selectText(detailRow, '[class*="_detailAmount_"]');

                  if (label && value) {
                    detailMap[label] = value;
                  }

                  return detailMap;
                },
                {},
              );

              if (method) {
                records.push({ method, amount, details });
              }

              return records;
            }, [])
        : [];

      const dishRoots = dedupeElements(
        Array.from(
          dialogElement.querySelectorAll('[data-testid="pos-ui-dish-item"], [class*="_dishItem_"]'),
        ),
      );
      const items = dishRoots.reduce<RecallOrderItem[]>(
        (records, dishElement) => {
          const sentTime =
            selectText(dishElement, '[class*="_sentText_"]') ??
            readTexts(dishElement, 'span').find((text) => /^Sent in /i.test(text)) ??
            null;
          const quantity =
            selectText(dishElement, '[class*="_quantity_"]') ??
            readTexts(dishElement, 'span').find((text) => /^\d+$/.test(text)) ??
            null;
          const price =
            selectText(dishElement, '[class*="_dishPrice_"]') ??
            readTexts(dishElement, 'span').find((text) => /^\$[\d,.]+$/.test(text)) ??
            null;
          const seatHeader = findSeatHeader(dishElement);
          const seat =
            (seatHeader ? selectText(seatHeader, '[class*="_seatTitle_"]') : null) ??
            normalizeOptionalText(seatHeader?.textContent);
          const name = readDishName(dishElement, sentTime, quantity, price);

          if (!name) {
            return records;
          }

          const additions = dedupeElements(
            Array.from(
              dishElement.querySelectorAll(
                '[class*="_extraItem_"], [data-testid^="dish-item-subitem-"], [data-test-id^="dish-item-subitem-"]',
              ),
            ),
          ).reduce<
            RecallOrderItemAddition[]
          >((lines, extraElement) => {
            const rawAdditionText = normalizeOptionalText(extraElement.textContent);
            const additionPrice =
              selectText(extraElement, '[class*="_optionPrice_"]') ??
              rawAdditionText?.match(/\$[\d,.]+$/)?.[0] ??
              null;
            const additionName =
              selectText(extraElement, '[class*="_extraText_"]') ??
              (rawAdditionText && additionPrice
                ? normalizeOptionalText(rawAdditionText.replace(new RegExp(`\\s*${additionPrice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), ''))
                : rawAdditionText);

            if (additionName) {
              lines.push(additionPrice ? { name: additionName, price: additionPrice } : { name: additionName });
            }

            return lines;
          }, []);

          records.push({
            seat,
            sentTime,
            quantity,
            name,
            price,
            additions,
          });

          return records;
        },
        [],
      );

      const priceSummaryContainer =
        dialogElement.querySelector('[data-test-id="shared-order-price-summary-toggle"]') ??
        dialogElement.querySelector('[data-testid="shared-order-price-summary-toggle"]') ??
        dialogElement.querySelector('[class*="_container_1jzox_"]') ??
        dialogElement.querySelector('[class*="_container_"][class*="1jzox"]');
      const mergePriceSummaryFallback = (container: Element, summary: Record<string, string>): void => {
        const labelValueRows = Array.from(
          container.querySelectorAll('[class*="_row_"], [class*="_label_"]'),
        ).map((node) => node.closest('[class*="_row_"]') ?? node.parentElement ?? node);

        for (const rowElement of dedupeElements(labelValueRows)) {
          const spanTexts = Array.from(rowElement.querySelectorAll('span'))
            .map((node) => cleanText(node.textContent))
            .filter(Boolean);
          const label =
            spanTexts[0] ??
            selectText(rowElement, '[class*="_label_"]') ??
            selectText(rowElement, '[class*="_totalLabel_"]');
          const value =
            spanTexts.length > 1
              ? spanTexts[spanTexts.length - 1]
              : (selectText(rowElement, '[class*="_value_"]') ?? null);

          if (label && value && label !== value) {
            summary[label] = value;
          }
        }

        const inner = cleanText((container as HTMLElement).innerText ?? '');
        for (const line of inner.split(/\r?\n/)) {
          const trimmed = line.trim();
          const matched = trimmed.match(/^(.+?)\s+(\$[\d,.]+)$/u);
          if (!matched) {
            continue;
          }
          const labelKey = matched[1].replace(/:\s*$/, '').trim();
          if (!labelKey || labelKey.startsWith('#') || labelKey.length > 64) {
            continue;
          }
          if (!summary[labelKey] && labelKey !== matched[2]) {
            summary[labelKey] = matched[2];
          }
        }

        const totalStrict =
          /(?:^|[\n\r])\s*(?:Total|总计|合计)\s*(\$[\d,.]+)/im.exec(inner) ??
          /\b(?:Total|总计|合计)\s*(\$[\d,.]+)/im.exec(inner);
        const totalBeforeTips =
          /(?:^|[\n\r])\s*(?:Total Before Tips|合计（税前）|税前合计)\s*(\$[\d,.]+)/im.exec(inner) ??
          /\b(?:Total Before Tips|合计（税前）|税前合计)\s*(\$[\d,.]+)/im.exec(inner);
        if (totalStrict?.[1] && !summary.Total && !summary['total']) {
          summary.Total = totalStrict[1];
        }
        if (totalBeforeTips?.[1] && !summary['Total Before Tips']) {
          summary['Total Before Tips'] = totalBeforeTips[1];
        }
      };

      const priceSummary: Record<string, string> =
        priceSummaryContainer === null
          ? {}
          : Array.from(priceSummaryContainer.children).reduce<Record<string, string>>((summary, rowElement) => {
              const spanTexts = Array.from(rowElement.querySelectorAll('span'))
                .map((node) => cleanText(node.textContent))
                .filter(Boolean);
              const label =
                spanTexts[0] ??
                selectText(rowElement, '[class*="_label_1jzox_"]') ??
                selectText(rowElement, '[class*="_totalLabel_1jzox_"]');
              const value =
                spanTexts.length > 1
                  ? spanTexts[spanTexts.length - 1]
                  : (selectText(rowElement, '[class*="_value_1jzox_"]') ?? null);

              if (label && value && label !== value) {
                summary[label] = value;
              }

              return summary;
            }, {});

      if (priceSummaryContainer) {
        mergePriceSummaryFallback(priceSummaryContainer, priceSummary);
      }

      return {
        orderNumber,
        paymentStatus,
        customerInfo,
        memberInfo,
        orderContext: {
          orderType,
          tableName,
          guestCount,
          serverName,
        },
        payments,
        items,
        priceSummary,
      };
    });
  }

  @step('页面操作：关闭当前订单详情弹窗')
  async closeOrderDetailsDialog(): Promise<void> {
    if (!(await this.orderDetailsDialog.isVisible().catch(() => false))) {
      return;
    }

    await this.page.keyboard.press('Escape');
    await expect(this.orderDetailsDialog).toBeHidden({ timeout: 5_000 });
  }

  @step('页面操作：在 Recall 订单详情中打开更多操作菜单')
  async openOrderDetailsMoreActions(): Promise<void> {
    await expect(this.orderDetailsMoreActionsButton).toBeVisible({ timeout: 15_000 });
    await this.orderDetailsMoreActionsButton.click();
  }

  @step('页面操作：在 Recall 订单详情中点击部分退菜')
  async startPartialVoidCurrentOrder(): Promise<void> {
    await this.openOrderDetailsMoreActions();
    await expect(this.partialVoidButton).toBeVisible({ timeout: 10_000 });
    await this.partialVoidButton.click();
  }

  @step('页面操作：在 Recall 订单详情中点击 Void All')
  async startVoidAllCurrentOrder(): Promise<void> {
    await this.openOrderDetailsMoreActions();
    await expect(this.voidAllButton).toBeVisible({ timeout: 10_000 });
    await this.voidAllButton.click();
  }

  @step((reason: string) => `页面操作：在 Recall 退菜弹窗中填写原因 ${reason}`)
  async fillVoidReason(reason: string): Promise<void> {
    const reasonButton = this.page
      .getByRole('button', { name: reason, exact: true })
      .or(this.page.getByText(reason, { exact: true }))
      .first();
    await expect(reasonButton).toBeVisible({ timeout: 15_000 });
    await reasonButton.click();
    if (await this.voidReasonInput.isVisible().catch(() => false)) {
      await expect(this.voidReasonInput).toHaveValue(reason, { timeout: 10_000 });
    }
  }

  @step('页面操作：提交 Recall 退菜原因')
  async submitVoidReason(): Promise<void> {
    if (await this.page.getByTestId('pos-keyboard-button-{close}').isVisible().catch(() => false)) {
      await this.page.getByTestId('pos-keyboard-button-{close}').evaluate((closeButton) => {
        (closeButton as HTMLElement).click();
      });
    }
    if (await this.restoreInventoryCheckbox.isVisible().catch(() => false)) {
      if (!(await this.restoreInventoryCheckbox.isChecked().catch(() => false))) {
        await this.restoreInventoryCheckbox.check().catch(async () => {
          await this.restoreInventoryCheckbox.evaluate((checkboxElement) => {
            (checkboxElement as HTMLElement).click();
          });
        });
      }
    }
    await expect(this.voidSubmitButton).toBeVisible({ timeout: 15_000 });
    await this.voidSubmitButton.click();
  }

  @step('页面操作：退出 Recall 页面回到上一层')
  async exitRecallPage(): Promise<void> {
    if (!(await this.recallExitButton.isVisible().catch(() => false))) {
      return;
    }
    await this.recallExitButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    await waitUntil(
      async () => this.page.url(),
      (url) => !/#recall/i.test(url),
      {
        timeout: 10_000,
        message: '点击 Back 后仍停留在 Recall 页面',
      },
    ).catch(() => {});
  }

  @step((_filterButton: Locator, optionName: string) => `页面操作：从顶部筛选下拉菜单中选择 ${optionName}`)
  private async selectTopDropdownOption(filterButton: Locator, optionName: string): Promise<void> {
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
    const inline = this.page.getByTestId('recall2-search-input').first();
    const currentKeyword =
      (await inline.count()) > 0 && (await inline.isVisible().catch(() => false))
        ? await inline.inputValue().catch(() => '')
        : '';

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
    if ((await inline.count()) > 0) {
      await inline.evaluate((inputElement) => {
        const input = inputElement as HTMLInputElement;
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await expect(inline).toHaveValue('');
    }
  }

  private async waitForOrderDetailsDialogReady(): Promise<void> {
    await expect(this.orderDetailsDialog).toBeVisible({ timeout: 10_000 });
    await waitUntil(
      async () => (await this.orderDetailsDialog.textContent())?.trim() ?? '',
      (dialogText) => !/^loading\.\.\.$/i.test(dialogText) && !/^loading$/i.test(dialogText),
      {
        timeout: 10_000,
        message: 'Order details dialog did not finish loading in time.',
      },
    );
    /** 详情区常为异步渲染；在读到快照前等待出现订单号与金额，避免 evaluate 落在空壳 DOM 上 */
    await waitUntil(
      async () =>
        this.orderDetailsDialog.evaluate((root) => {
          const text = (root as HTMLElement).innerText ?? '';
          return /#\d+/.test(text) && /\$[\d,.]+/.test(text);
        }),
      (ready) => ready === true,
      {
        timeout: 20_000,
        interval: 350,
        message: '订单详情弹窗未在预期时间内渲染出订单号与金额信息',
      },
    );
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

  private normalizeOrderNumber(orderNumber: string): string {
    const normalizedOrderNumber = orderNumber.trim().replace(/^#/, '');
    return `#${normalizedOrderNumber}`;
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
