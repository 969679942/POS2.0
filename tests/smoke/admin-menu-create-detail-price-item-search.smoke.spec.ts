import { AdminMenuCreateCategoryFlow } from '../../flows/admin-menu-create-category.flow';
import { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import { AdminMenuCreateItemFlow } from '../../flows/admin-menu-create-item.flow';
import { AdminMenuDeleteGroupFlow } from '../../flows/admin-menu-delete-group.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { dineInSpecDishCashSmokeTestData } from '../../test-data/dine-in-spec-dish-smoke';
import { adminMenuCreateCategorySmokeTestData } from '../../test-data/admin-menu-create-category-smoke';
import { selectAnyAvailableTable, selectRandomGuestCountAndEnterOrderDishes } from '../../flows/select-table.flow';
import { ensureLoggedInHomePage, prepareFirstCategoryEditor } from './admin-menu-create-item-smoke.shared';

test.describe('【Admin-Menu-Create Detail Price Item】', () => {
  test(
    'Admin 菜单管理：在首个 Category 中新建 detail price 菜，并在 Dine In 可搜到、To Go 搜不到',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(540_000);

      const createGroupFlow = new AdminMenuCreateGroupFlow();
      const categoryFlow = new AdminMenuCreateCategoryFlow();
      const itemFlow = new AdminMenuCreateItemFlow();
      const deleteFlow = new AdminMenuDeleteGroupFlow();

      const item = itemFlow.buildItemScenario('detailPrice');

      const { adminPage, groupName } = await prepareFirstCategoryEditor({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: dineInSpecDishCashSmokeTestData.employeePassword,
        createGroupFlow,
        categoryFlow,
        itemFlow,
        groupNamePrefix: adminMenuCreateCategorySmokeTestData.groupNamePrefix,
      });

      await test.step('步骤8：CREATE NEW → 新建 detail price 菜，配置两行 detail price 并保存', async () => {
        await itemFlow.stepCreateItemScenarioInCategory(adminPage, item);
      });

      const dineInHomePage = await ensureLoggedInHomePage(
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        dineInSpecDishCashSmokeTestData.employeePassword,
      );

      const dineInOrderDishesPage = await test.step('步骤9：首页进入 Dine In 点单页并搜索 detail price 菜', async () => {
        const selectTablePage = await dineInHomePage.clickDineIn();
        await selectTablePage.expectLoaded();
        const { guestCountDialogPage } = await selectAnyAvailableTable(selectTablePage);
        const { orderDishesPage } = await selectRandomGuestCountAndEnterOrderDishes(guestCountDialogPage, 1, 1);
        await orderDishesPage.openDishSearchPanel();
        await orderDishesPage.applyDishSearchKeyword(item.itemName);
        await orderDishesPage.expectDishSearchResultVisible(item.itemName);
        return orderDishesPage;
      });

      await test.step('断言2：Dine In 点单页可搜索到 detail price 菜', async () => {
        await dineInOrderDishesPage.expectDishSearchResultVisible(item.itemName);
      });

      const toGoHomePage = await ensureLoggedInHomePage(
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        dineInSpecDishCashSmokeTestData.employeePassword,
      );

      const toGoOrderDishesPage = await test.step('步骤10：首页进入 To Go 点单页并搜索 detail price 菜', async () => {
        const odp = await startToGoOrder(toGoHomePage);
        await odp.openDishSearchPanel();
        await odp.applyDishSearchKeyword(item.itemName);
        await odp.expectDishSearchResultHidden(item.itemName);
        return odp;
      });

      await test.step('断言3：To Go 点单页搜索不到 detail price 菜', async () => {
        await toGoOrderDishesPage.expectDishSearchResultHidden(item.itemName);
      });

      const cleanupHomePage = await ensureLoggedInHomePage(
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        dineInSpecDishCashSmokeTestData.employeePassword,
      );

      const cleanupAdminPage = await test.step('后置：重新进入 Admin 准备清理菜单组', async () => {
        return await cleanupHomePage.clickAdmin();
      });

      await createGroupFlow.stepWaitAdminShellReady(cleanupAdminPage);

      await test.step('后置：删除本次新建菜单组并清理数据', async () => {
        await deleteFlow.stepMenuNavAndExpandPosMenuUntilGroupVisible(cleanupAdminPage, groupName);
        await deleteFlow.stepSelectMenuGroupRowCheckbox(cleanupAdminPage, groupName);
        await deleteFlow.stepToolbarDeleteAndConfirmDialog(cleanupAdminPage);
        await deleteFlow.stepAssertDeleteSuccessMessage(cleanupAdminPage);
      });
    },
  );
});
