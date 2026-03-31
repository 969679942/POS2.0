import { expect, test } from '@playwright/test';
import { RecallPage } from '../../pages/recall.page';
import {
  RecallManualSearchTags,
  RecallOrderStatuses,
  RecallOrderTypes,
  RecallPaymentStatuses,
  RecallPaymentTypes,
  RecallProductLines,
} from '../../test-data/recall-search-options';

const recallFixtureHtml = String.raw`
<!DOCTYPE html>
<html lang="en">
  <body>
    <button type="button" data-testid="recall2-header-new-order"></button>
    <button type="button" data-testid="recall2-header-paging"></button>
    <input data-testid="recall2-search-input" value="" />

    <div data-testid="recall2-filter-bar">
      <button type="button" data-testid="recall2-filter-dropdown-paymentStatus"></button>
      <button type="button" data-testid="recall2-filter-dropdown-orderStatus"></button>
      <button type="button" data-testid="recall2-filter-dropdown-orderType"></button>
      <button type="button" data-testid="recall2-filter-dropdown-paymentType"></button>
      <button type="button" data-testid="recall2-filter-dropdown-productLine"></button>
      <button type="button" data-testid="icon-button-More Filters"></button>
      <button type="button" data-testid="recall2-search-trigger"></button>
    </div>

    <div id="dropdown-options" hidden>
      <button type="button" data-testid="recall2-filter-option-paymentStatus-PAID">Paid</button>
      <button type="button" data-testid="recall2-filter-option-orderStatus-PAID">Paid</button>
      <button type="button" data-testid="recall2-filter-option-orderType-DINE_IN">Dine-in</button>
      <button type="button" data-testid="recall2-filter-option-paymentType-CARD">Card</button>
      <button type="button" data-testid="recall2-filter-option-productLine-MEALKEYWAY">MealKeyway</button>
    </div>

    <div data-testid="recall2-active-filter-bar"></div>
    <div data-testid="recall2-order-list-container">
      <span>#1001</span>
    </div>

    <div role="dialog" aria-modal="true" data-testid="recall2-search-modal" hidden>
      <h2 data-testid="recall2-search-modal-title">Search orders</h2>
      <button type="button" data-testid="recall2-search-type-option-orderNo"></button>
      <button type="button" data-testid="recall2-search-type-option-phoneNo"></button>
      <input data-testid="recall2-search-modal-input-default" value="" />
      <button type="button" data-testid="recall2-search-modal-input-default-clear"></button>
      <button type="button" data-testid="recall2-search-modal-search-button">Search</button>
      <button type="button" data-testid="pos-keyboard-button-{close}"></button>
    </div>

    <script>
      (() => {
        const dropdownOptions = document.querySelector('#dropdown-options');
        const activeFilterBar = document.querySelector('[data-testid="recall2-active-filter-bar"]');
        const topSearchInput = document.querySelector('[data-testid="recall2-search-input"]');
        const searchTrigger = document.querySelector('[data-testid="recall2-search-trigger"]');
        const searchModal = document.querySelector('[data-testid="recall2-search-modal"]');
        const modalInput = document.querySelector('[data-testid="recall2-search-modal-input-default"]');
        const clearSearchButton = document.querySelector('[data-testid="recall2-search-modal-input-default-clear"]');
        const submitSearchButton = document.querySelector('[data-testid="recall2-search-modal-search-button"]');
        const closeKeyboardButton = document.querySelector('[data-testid="pos-keyboard-button-{close}"]');

        const filterConfigs = [
          { trigger: 'recall2-filter-dropdown-paymentStatus', tag: 'paymentStatus', label: 'Payment Status' },
          { trigger: 'recall2-filter-dropdown-orderStatus', tag: 'orderStatus', label: 'Order Status' },
          { trigger: 'recall2-filter-dropdown-orderType', tag: 'orderType', label: 'Order Type' },
          { trigger: 'recall2-filter-dropdown-paymentType', tag: 'paymentType', label: 'Payment Type' },
          { trigger: 'recall2-filter-dropdown-productLine', tag: 'productLine', label: 'Product Line' },
        ];

        let activeFilterType = '';

        const renderTag = (tag, label, value) => {
          const tagButton = document.createElement('button');
          tagButton.type = 'button';
          tagButton.dataset.testid = 'recall2-filter-tag-' + tag;
          tagButton.setAttribute('aria-label', 'Remove filter: ' + label + ' ' + value);
          tagButton.textContent = label + ': ' + value;
          tagButton.addEventListener('click', () => {
            tagButton.remove();
          });
          activeFilterBar.appendChild(tagButton);
        };

        for (const config of filterConfigs) {
          const trigger = document.querySelector('[data-testid="' + config.trigger + '"]');
          trigger?.addEventListener('click', () => {
            activeFilterType = config.tag;
            dropdownOptions.hidden = false;
          });
        }

        for (const option of dropdownOptions.querySelectorAll('button')) {
          option.addEventListener('click', () => {
            dropdownOptions.hidden = true;
            if (!activeFilterType) return;
            const filterConfig = filterConfigs.find((item) => item.tag === activeFilterType);
            if (!filterConfig) return;
            renderTag(activeFilterType, filterConfig.label, option.textContent.trim());
          });
        }

        searchTrigger?.addEventListener('click', () => {
          searchModal.hidden = false;
        });

        clearSearchButton?.addEventListener('click', () => {
          modalInput.value = '';
        });

        submitSearchButton?.addEventListener('click', () => {
          topSearchInput.value = modalInput.value;
          searchModal.hidden = true;
        });

        closeKeyboardButton?.addEventListener('click', () => {
          searchModal.hidden = true;
        });
      })();
    </script>
  </body>
</html>
`;

test.describe('Recall 页面选择器契约', () => {
  test(
    '应能通过筛选与搜索相关的 data-testid 完成 Recall 页面操作',
    {},
    async ({ page }) => {
      const recallPage = new RecallPage(page);

      await test.step('准备仅暴露 data-testid 的 Recall 页面骨架', async () => {
        await page.setContent(recallFixtureHtml);
      });

      await test.step('使用顶部筛选的 data-testid 选择各类筛选条件', async () => {
        await recallPage.selectPaymentStatus(RecallPaymentStatuses.paid);
        await recallPage.selectOrderStatus(RecallOrderStatuses.paid);
        await recallPage.selectOrderType(RecallOrderTypes.dineIn);
        await recallPage.selectPaymentType(RecallPaymentTypes.card);
        await recallPage.selectProductLine(RecallProductLines.mealKeyway);

        await expect(page.getByTestId('recall2-filter-tag-paymentStatus')).toContainText('Paid');
        await expect(page.getByTestId('recall2-filter-tag-orderStatus')).toContainText('Paid');
        await expect(page.getByTestId('recall2-filter-tag-orderType')).toContainText('Dine-in');
        await expect(page.getByTestId('recall2-filter-tag-paymentType')).toContainText('Card');
        await expect(page.getByTestId('recall2-filter-tag-productLine')).toContainText('MealKeyway');
      });

      await test.step('使用搜索弹窗相关的 data-testid 提交并清空手动搜索', async () => {
        await recallPage.openManualSearchDialog();
        await recallPage.selectManualSearchTag(RecallManualSearchTags.orderNumber);
        await recallPage.fillManualSearchKeyword('1001');
        await recallPage.submitManualSearch();

        await expect.poll(async () => await recallPage.readManualSearchKeyword()).toBe('1001');

        await recallPage.clearAllSearchConditions();

        await expect.poll(async () => await recallPage.readManualSearchKeyword()).toBe('');
        await expect(page.getByTestId('recall2-active-filter-bar').locator('button')).toHaveCount(0);
      });
    },
  );
});
