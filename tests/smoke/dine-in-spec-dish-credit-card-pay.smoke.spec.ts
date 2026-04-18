import { expect } from '@playwright/test';
import { DineInSpecDishCreditCardPayFlow } from '../../flows/dine-in-spec-dish-credit-card-pay.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { addSpecDish } from '../../flows/order-dishes.flow';
import {
  selectAnyAvailableTable,
  selectRandomGuestCountAndEnterOrderDishes,
} from '../../flows/select-table.flow';
import { test } from '../../fixtures/test.fixture';
import { creditCardSurchargeRateDecimal, salesTaxRateDecimal } from '../../test-data/pricing';
import { dineInSpecDishCashSmokeTestData } from '../../test-data/dine-in-spec-dish-smoke';
import { isMoneyCloseWithinCents, parseUsdStringToNumber, roundMoneyToCents } from '../../utils/money';

function firstSummaryEntry(
  summary: Record<string, string>,
  keyPredicate: (label: string) => boolean,
): string | undefined {
  const hit = Object.entries(summary).find(([label]) => keyPredicate(label));
  return hit?.[1];
}

test.describe('【Dine In-购买规格菜-点单页Credit Card付款】', () => {
  test(
    '堂食随机人数后搜索规格菜、随机规格并以信用卡读卡支付，点单页汇总与支付成功页 Balance due 一致',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-46667',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      // 断言9/10（读卡等待、支付成功）在 `OrderDishesPage` 内各 30s 轮询上限；此处为整例总超时（含登录选桌）。
      test.setTimeout(240_000);

      const creditPayFlow = new DineInSpecDishCreditCardPayFlow();

      const specLabels = [...dineInSpecDishCashSmokeTestData.specSizeLabels];
      const chosenSpec = specLabels[Math.floor(Math.random() * specLabels.length)];

      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        dineInSpecDishCashSmokeTestData.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();
      const selectTablePage = await loggedInHomePage.clickDineIn();
      await selectTablePage.expectLoaded();

      const { guestCountDialogPage, selectedTable } = await selectAnyAvailableTable(selectTablePage);

      const { orderDishesPage, guestCount } = await selectRandomGuestCountAndEnterOrderDishes(
        guestCountDialogPage,
        1,
        14,
      );

      await orderDishesPage.expectTableNumber(selectedTable.tableNumber);
      await orderDishesPage.expectGuestCount(guestCount);

      await orderDishesPage.openDishSearchPanel();
      await orderDishesPage.applyDishSearchKeyword(dineInSpecDishCashSmokeTestData.specDishSearchKeyword);

      await test.step('断言1：搜索结果中可见规格菜', async () => {
        await orderDishesPage.expectDishSearchResultVisible(
          dineInSpecDishCashSmokeTestData.specDishSearchKeyword,
        );
      });

      await addSpecDish(
        orderDishesPage,
        dineInSpecDishCashSmokeTestData.specDishSearchKeyword,
        [chosenSpec],
        1,
      );

      const summary = await orderDishesPage.readPriceSummaryLabelAmountMap();
      const cartQtySum = await orderDishesPage.readCartDishQuantitySumFromLines();
      const cartPriceSum = await orderDishesPage.readCartMainDishLinePricesSumUsd();

      const countText =
        summary.Count ??
        summary['数量'] ??
        firstSummaryEntry(summary, (label) => /^(Count|数量)$/i.test(label.trim()));
      const subtotalText =
        summary.Subtotal ??
        summary['小计'] ??
        firstSummaryEntry(
          summary,
          (label) => /Subtotal|小计/i.test(label) && !/Tax/i.test(label),
        );
      const taxText =
        summary.Tax ??
        firstSummaryEntry(
          summary,
          (label) =>
            (/\bTax\b|税/i.test(label) || /^Sales Tax$/i.test(label.trim())) &&
            !/Subtotal|^Total|Before Tips|税前/i.test(label),
        );
      const totalCashText =
        summary['Total(Cash)'] ??
        firstSummaryEntry(
          summary,
          (label) => /Total\s*\(\s*Cash\s*\)/i.test(label) || /^Total\s+Cash$/i.test(label.trim()),
        );
      const totalCardText =
        summary['Total(Card)'] ??
        firstSummaryEntry(
          summary,
          (label) => /Total\s*\(\s*Card\s*\)/i.test(label) || /^Total\s+Card$/i.test(label.trim()),
        );

      expect(countText, '价格汇总中应有 Count/数量').toBeTruthy();
      expect(subtotalText, '价格汇总中应有 Subtotal').toBeTruthy();
      expect(taxText, '价格汇总中应有 Tax').toBeTruthy();
      expect(totalCashText, '价格汇总中应有 Total(Cash)').toBeTruthy();
      expect(totalCardText, '价格汇总中应有 Total(Card)').toBeTruthy();

      await test.step('步骤3 后断言：Count / Subtotal / Tax / Total(Cash) / Total(Card)', async () => {
        await test.step('断言2：Count 与已选菜品份数一致', async () => {
          const countNum = Number(String(countText).replace(/[^\d]/g, ''));
          expect(Number.isFinite(countNum)).toBe(true);
          expect(countNum).toBe(cartQtySum);
        });

        await test.step('断言3：Subtotal 与购物车行主价格之和一致', async () => {
          const subtotalNum = parseUsdStringToNumber(subtotalText!);
          expect(isMoneyCloseWithinCents(subtotalNum, cartPriceSum)).toBe(true);
        });

        await test.step('断言4：Tax 等于 Subtotal 按配置税率计算', async () => {
          const subtotalNum = parseUsdStringToNumber(subtotalText!);
          const taxNum = parseUsdStringToNumber(taxText!);
          const expectedTax = roundMoneyToCents(subtotalNum * salesTaxRateDecimal);
          expect(isMoneyCloseWithinCents(taxNum, expectedTax)).toBe(true);
        });

        await test.step('断言5：Total(Cash) 等于 Subtotal + Tax', async () => {
          const subtotalNum = parseUsdStringToNumber(subtotalText!);
          const taxNum = parseUsdStringToNumber(taxText!);
          const totalCashNum = parseUsdStringToNumber(totalCashText!);
          const expected = roundMoneyToCents(subtotalNum + taxNum);
          expect(isMoneyCloseWithinCents(totalCashNum, expected)).toBe(true);
        });

        await test.step(
          '断言6：Total(Card) 等于 Subtotal + Tax + 信用卡加收率 × Subtotal（加收基数为小计）',
          async () => {
            const subtotalNum = parseUsdStringToNumber(subtotalText!);
            const taxNum = parseUsdStringToNumber(taxText!);
            const totalCardNum = parseUsdStringToNumber(totalCardText!);
            const cardSurcharge = roundMoneyToCents(subtotalNum * creditCardSurchargeRateDecimal);
            const expected = roundMoneyToCents(subtotalNum + taxNum + cardSurcharge);
            expect(isMoneyCloseWithinCents(totalCardNum, expected)).toBe(true);
          },
        );
      });

      const totalCardForPayment = totalCardText!;

      await creditPayFlow.stepClickPay(orderDishesPage);
      await creditPayFlow.stepSkipMembershipIfPresentThenCreditCard(orderDishesPage);
      await creditPayFlow.stepExpectCardReaderWaiting(orderDishesPage);
      await creditPayFlow.stepExpectCreditPaidSuccess(orderDishesPage, totalCardForPayment);
    },
  );
});
