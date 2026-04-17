import { expect } from '@playwright/test';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { addRegularDish, addWeightedDish } from '../../flows/order-dishes.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { searchRecallOrders, viewRecallOrderDetails } from '../../flows/recall.flow';
import type { RecallOrderDetails } from '../../pages/recall.page';
import {
  selectAnyAvailableTable,
  selectGuestCountAndEnterOrderDishes,
} from '../../flows/select-table.flow';
import { test } from '../../fixtures/test.fixture';
import { dineInRecallOrderTestData } from '../../test-data/dine-in-recall-order';
import {
  RecallManualSearchTags,
  RecallOrderTypes,
  RecallPaymentStatuses,
} from '../../test-data/recall-search-options';
import { waitUntil } from '../../utils/wait';

function stripMoneyFormat(value: string | null | undefined): string {
  return (value ?? '').replace(/[$,\s]/g, '').trim();
}

function moneyValuesEqual(a: string, b: string): boolean {
  const na = Number.parseFloat(stripMoneyFormat(a));
  const nb = Number.parseFloat(stripMoneyFormat(b));
  return Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) < 0.02;
}

function orderDetailTotalMatchesOrderPage(
  details: RecallOrderDetails,
  orderTotalText: string,
): boolean {
  const preferred =
    details.priceSummary.Total ??
    details.priceSummary['total'] ??
    details.priceSummary['TOTAL'];

  if (preferred && moneyValuesEqual(preferred, orderTotalText)) {
    return true;
  }

  return Object.values(details.priceSummary).some(
    (value) => value && moneyValuesEqual(value, orderTotalText),
  );
}

test.describe('堂食点餐后在 Recall 按桌号检索', () => {
  test(
    '应能在需要 License 时完成授权后经员工口令完成堂食点餐保存后在 Recall 按桌号找到订单并核对合计金额',
    {},
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(120_000);

      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        dineInRecallOrderTestData.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();
      const selectTablePage = await loggedInHomePage.clickDineIn();
      await selectTablePage.expectLoaded();

      const { guestCountDialogPage, selectedTable } = await selectAnyAvailableTable(selectTablePage);
      const orderDishesPage = await selectGuestCountAndEnterOrderDishes(
        guestCountDialogPage,
        dineInRecallOrderTestData.guestCount,
      );

      const randomWeight = 1 + Math.floor(Math.random() * 9);
      await addWeightedDish(
        orderDishesPage,
        dineInRecallOrderTestData.weightedDishName,
        randomWeight,
      );
      await addRegularDish(orderDishesPage, dineInRecallOrderTestData.regularDishName, 1);

      const orderTotalText = await orderDishesPage.readPriceSummaryTotalText();
      expect(orderTotalText).toMatch(/\$/);

      const recallPage = await test.step('点击 Save、等待回到主壳并进入 Recall', async () => {
        const homeAfterSave = await orderDishesPage.saveOrder();
        await homeAfterSave.expectPrimaryFunctionCardsVisible();
        return await homeAfterSave.clickRecall();
      });
      await recallPage.expectLoaded();

      await test.step(
        `在 Recall 按桌号 ${selectedTable.tableNumber} 搜索（未支付、堂食）`,
        async () => {
          await searchRecallOrders(recallPage, {
            paymentStatus: RecallPaymentStatuses.unpaid,
            orderType: RecallOrderTypes.dineIn,
            manualSearch: {
              tag: RecallManualSearchTags.tableName,
              keyword: selectedTable.tableNumber,
            },
          });
        },
      );

      const matchedDetails = await waitUntil(
        async () => {
          const numbers = await recallPage.readVisibleOrderNumbers();
          if (numbers.length === 0) {
            return null;
          }
          for (const rawOrderNumber of numbers) {
            const details = await viewRecallOrderDetails(
              recallPage,
              rawOrderNumber.replace(/^#/, ''),
            );
            if (orderDetailTotalMatchesOrderPage(details, orderTotalText)) {
              return details;
            }
          }
          return null;
        },
        (details): details is RecallOrderDetails => Boolean(details),
        {
          timeout: 45_000,
          interval: 2_000,
          message: 'Recall 列表中未找到与点餐页合计金额一致的订单（已按当前桌号过滤，含重试）',
        },
      );
    },
  );
});
