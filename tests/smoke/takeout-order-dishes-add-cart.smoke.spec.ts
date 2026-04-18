import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { addComboDish, addRegularDish } from '../../flows/order-dishes.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';

test.describe('To Go 点餐冒烟测试', () => {
  test(
    '应能进入 To Go 点单页并添加普通菜与带数量的套餐子菜到购物车',
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
      const orderDishesPage = await startToGoOrder(loggedInHomePage);

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
