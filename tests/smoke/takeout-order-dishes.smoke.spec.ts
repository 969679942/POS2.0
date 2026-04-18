import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';

test.describe('To Go 点餐冒烟', () => {
  test(
    '应能从主页进入 To Go 点单页（无选桌/人数，对应堂食选桌入单路径）',
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
      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        '11',
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const orderDishesPage = await test.step('从主页进入 To Go 点单页', async () => {
        return await startToGoOrder(loggedInHomePage);
      });

      await test.step('断言：点单页已加载（含 Back/Send/Pay；To Go 无桌号与人数）', async () => {
        await orderDishesPage.expectLoaded();
      });
    },
  );
});
