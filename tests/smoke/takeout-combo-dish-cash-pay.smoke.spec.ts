import { expect } from '@playwright/test';
import { DineInSpecDishCashPayFlow } from '../../flows/dine-in-spec-dish-cash-pay.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { addComboDish } from '../../flows/order-dishes.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { HomePage } from '../../pages/home.page';
import { creditCardSurchargeRateDecimal, salesTaxRateDecimal } from '../../test-data/pricing';
import { takeOutComboDishCashSmokeTestData } from '../../test-data/takeout-combo-dish-smoke';
import { isMoneyCloseWithinCents, parseUsdStringToNumber, roundMoneyToCents } from '../../utils/money';

function firstSummaryEntry(
  summary: Record<string, string>,
  keyPredicate: (label: string) => boolean,
): string | undefined {
  const hit = Object.entries(summary).find(([label]) => keyPredicate(label));
  return hit?.[1];
}

test.describe('【To Go-购买套餐菜-点单页现金付款】', () => {
  test(
    '应能完成 To Go 套餐菜点单与点单页现金支付，价格汇总与税率及信用卡加收一致',
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

      const cashPayFlow = new DineInSpecDishCashPayFlow();

      await test.step('前置：从首页进入；若有 License 选择页则选用可用 License', async () => {
        await openHome(homePage);
        if (await licenseSelectionPage.isVisible(10_000)) {
          await enterWithAvailableLicense(licenseSelectionPage, homePage);
        }
      });

      const loggedInHomePage = await test.step('前置：员工口令登录进入 POS 主页', async () => {
        return await enterWithEmployeePassword(
          employeeLoginPage,
          homePage,
          takeOutComboDishCashSmokeTestData.employeePassword,
        );
      });

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const orderDishesPage = await test.step('步骤1：首页进入 To Go 点单页并搜索套餐菜', async () => {
        const odp = await startToGoOrder(loggedInHomePage);
        await odp.openDishSearchPanel();
        await odp.applyDishSearchKeyword(takeOutComboDishCashSmokeTestData.comboDishSearchKeyword);
        await odp.expectDishSearchResultVisible(takeOutComboDishCashSmokeTestData.comboDishSearchKeyword);
        return odp;
      });

      await test.step('步骤2：点选套餐菜并完成分组子项选择', async () => {
        await addComboDish(
          orderDishesPage,
          takeOutComboDishCashSmokeTestData.comboDishSearchKeyword,
          takeOutComboDishCashSmokeTestData.comboSelections,
          1,
        );
      });

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

      await test.step('步骤3：校验左侧 Count / Subtotal / Tax / Total(Cash) / Total(Card) 后点击 Pay', async () => {
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

        await orderDishesPage.clickPay();
      });

      await test.step('步骤4：在支付弹窗选择 Cash 金额行，并在数字键盘点选与 Cash 行一致金额', async () => {
        await cashPayFlow.applyCashLineAndMatchingKeypadAmount(orderDishesPage);
      });

      await test.step('步骤5：确认现金支付；按需关闭入会弹窗', async () => {
        await orderDishesPage.confirmCashTenderInPaymentFrame();
        await orderDishesPage.dismissMembershipJoinPromptIfPresent();
      });

      await test.step('步骤6：支付成功页展示√与 No Receipt，选择 No receipt 回到首页', async () => {
        await orderDishesPage.expectCashPaidSuccessWithNoReceiptOffered();
        await orderDishesPage.clickNoReceipt();
        await orderDishesPage.expectNavigatedAwayFromOrderDishes();
        const home = new HomePage(page);
        await home.expectPrimaryFunctionCardsVisible();
      });
    },
  );
});
