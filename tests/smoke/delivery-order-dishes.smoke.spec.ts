import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { startDeliveryOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { deliveryOrderSmokeCommon, deliverySmokeOrderParams } from '../../test-data/delivery-order-smoke';

test.describe('Delivery 点餐冒烟', () => {
  test(
    '应能从主页经 Delivery 填单进入点单页（无选桌/人数，对应堂食选桌入单路径）',
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
        deliveryOrderSmokeCommon.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const orderDishesPage = await test.step('从主页进入 Delivery 并打开点单页', async () => {
        return await startDeliveryOrder(loggedInHomePage, deliverySmokeOrderParams());
      });

      await test.step('断言：点单页已加载（含 Back/Send/Pay；Delivery 无桌号与人数）', async () => {
        await orderDishesPage.expectLoaded();
      });
    },
  );
});
