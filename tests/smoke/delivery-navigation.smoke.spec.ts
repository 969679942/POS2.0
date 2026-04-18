import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { startDeliveryOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { deliveryOrderSmokeCommon, deliverySmokeOrderParams } from '../../test-data/delivery-order-smoke';

test.describe('Delivery 入口冒烟', () => {
  test(
    '应能从主页填写 Delivery 信息并进入点单页',
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
      await startDeliveryOrder(loggedInHomePage, deliverySmokeOrderParams());
    },
  );
});
