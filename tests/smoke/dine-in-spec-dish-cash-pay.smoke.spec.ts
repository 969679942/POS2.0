import { expect } from '@playwright/test';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { payWithCashSkipMembershipAndNoReceipt } from '../../flows/dine-in-spec-dish-cash-pay.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { addSpecDish } from '../../flows/order-dishes.flow';
import {
  selectAnyAvailableTable,
  selectRandomGuestCountAndEnterOrderDishes,
} from '../../flows/select-table.flow';
import { test } from '../../fixtures/test.fixture';
import { HomePage } from '../../pages/home.page';
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

test.describe('Dine In 规格菜现金付款冒烟', () => {
  test(
    '堂食随机人数后搜索规格菜、随机规格并现金支付，价格汇总与税率及信用卡加收一致',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-46667',
        },
      ],
    },
    async ({ page, homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(120_000);
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

      await test.step('断言：搜索结果中可见规格菜', async () => {
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

      await test.step('断言：Count 与已选菜品份数一致', async () => {
        const countNum = Number(String(countText).replace(/[^\d]/g, ''));
        expect(Number.isFinite(countNum)).toBe(true);
        expect(countNum).toBe(cartQtySum);
      });

      await test.step('断言：Subtotal 与购物车行主价格之和一致', async () => {
        const subtotalNum = parseUsdStringToNumber(subtotalText!);
        expect(isMoneyCloseWithinCents(subtotalNum, cartPriceSum)).toBe(true);
      });

      await test.step('断言：Tax 等于 Subtotal 按配置税率计算', async () => {
        const subtotalNum = parseUsdStringToNumber(subtotalText!);
        const taxNum = parseUsdStringToNumber(taxText!);
        const expectedTax = roundMoneyToCents(subtotalNum * salesTaxRateDecimal);
        expect(isMoneyCloseWithinCents(taxNum, expectedTax)).toBe(true);
      });

      await test.step('断言：Total(Cash) 等于 Subtotal + Tax', async () => {
        const subtotalNum = parseUsdStringToNumber(subtotalText!);
        const taxNum = parseUsdStringToNumber(taxText!);
        const totalCashNum = parseUsdStringToNumber(totalCashText!);
        const expected = roundMoneyToCents(subtotalNum + taxNum);
        expect(isMoneyCloseWithinCents(totalCashNum, expected)).toBe(true);
      });

      await test.step(
        '断言：Total(Card) 等于 Subtotal + Tax + 信用卡加收率 ×（Subtotal + Tax）（当前 POS 在含税合计上加收；与纯 Subtotal 基数不同）',
        async () => {
          const subtotalNum = parseUsdStringToNumber(subtotalText!);
          const taxNum = parseUsdStringToNumber(taxText!);
          const totalCardNum = parseUsdStringToNumber(totalCardText!);
          const taxableBaseForCard = roundMoneyToCents(subtotalNum + taxNum);
          const cardSurcharge = roundMoneyToCents(
            taxableBaseForCard * creditCardSurchargeRateDecimal,
          );
          const expected = roundMoneyToCents(subtotalNum + taxNum + cardSurcharge);
          expect(isMoneyCloseWithinCents(totalCardNum, expected)).toBe(true);
        },
      );

      await payWithCashSkipMembershipAndNoReceipt(orderDishesPage);

      await test.step('断言：支付完成后回到首页主功能区', async () => {
        const home = new HomePage(page);
        await home.expectPrimaryFunctionCardsVisible();
      });
    },
  );
});
