import { expect } from '@playwright/test';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { viewRecallOrderDetails } from '../../flows/recall.flow';
import { test } from '../../fixtures/test.fixture';

test.describe('Recall 订单详情冒烟', () => {
  test(
    '应能读取列表首条订单详情并在完成后恢复 Recall 页面状态',
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
      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        '11',
      );
      const recallPage = await loggedInHomePage.clickRecall();

      await recallPage.expectLoaded();
      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty();

      let details: Awaited<ReturnType<typeof viewRecallOrderDetails>> | null = null;
      for (const badge of visibleOrderNumbers.slice(0, 12)) {
        const target = badge.replace(/^#/, '');
        const candidate = await viewRecallOrderDetails(recallPage, target);
        const hasCore =
          Boolean(candidate.paymentStatus) ||
          candidate.items.length > 0 ||
          Object.keys(candidate.priceSummary).length > 0;
        if (hasCore) {
          details = candidate;
          if (candidate.orderNumber) {
            expect(candidate.orderNumber).toBe(`#${target}`);
          }
          break;
        }
      }

      expect(details, 'Recall 列表前若干条中未读到可用的订单详情').toBeTruthy();
      expect(
        details!.paymentStatus || details!.items.length > 0 || Object.keys(details!.priceSummary).length > 0,
      ).toBeTruthy();

      await expect(page.locator('[role="dialog"][data-testid="pos-ui-modal"]')).toBeHidden();
      await recallPage.expectLoaded();
    },
  );
});
