import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { addComboDish, addRegularDish } from '../../flows/order-dishes.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { startDeliveryOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { deliveryOrderSmokeCommon, deliverySmokeOrderParams } from '../../test-data/delivery-order-smoke';

test.describe('Delivery 点餐冒烟测试', () => {
  test(
    '应能进入 Delivery 点单页并添加普通菜与带数量的套餐子菜到购物车',
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
      const orderDishesPage = await startDeliveryOrder(loggedInHomePage, deliverySmokeOrderParams());

      await addRegularDish(orderDishesPage, 'test', 3);
      await addComboDish(
        orderDishesPage,
        '普通套餐',
        {
          common: {
            普通菜1: 1,
            普通菜2: 2,
          },
        },
        1,
      );
      await orderDishesPage.saveOrder();
    },
  );
});
