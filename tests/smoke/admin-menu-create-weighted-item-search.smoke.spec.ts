import { AdminMenuCreateCategoryFlow } from '../../flows/admin-menu-create-category.flow';
import { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import { AdminMenuCreateItemFlow } from '../../flows/admin-menu-create-item.flow';
import { AdminMenuDeleteGroupFlow } from '../../flows/admin-menu-delete-group.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { selectAnyAvailableTable, selectRandomGuestCountAndEnterOrderDishes } from '../../flows/select-table.flow';
import { adminMenuCreateCategorySmokeTestData } from '../../test-data/admin-menu-create-category-smoke';
import { ensureLoggedInHomePage, prepareFirstCategoryEditor } from './admin-menu-create-item-smoke.shared';

test.describe('【Admin-Menu-Create Weighted Item】', () => {
  test(
    'Admin 菜单管理：在首个 Category 中新建称重菜并可在 To Go 搜索到',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(480_000);

      const createGroupFlow = new AdminMenuCreateGroupFlow();
      const categoryFlow = new AdminMenuCreateCategoryFlow();
      const itemFlow = new AdminMenuCreateItemFlow();
      const deleteFlow = new AdminMenuDeleteGroupFlow();

      const item = itemFlow.buildItemScenario('weighted');

      const { adminPage, groupName } = await prepareFirstCategoryEditor({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: adminMenuCreateCategorySmokeTestData.employeePassword,
        createGroupFlow,
        categoryFlow,
        itemFlow,
        groupNamePrefix: adminMenuCreateCategorySmokeTestData.groupNamePrefix,
      });

      await test.step('步骤8：CREATE NEW → 新建称重菜，勾选 Unit Price Item 并保存', async () => {
        await itemFlow.stepCreateItemScenarioInCategory(adminPage, item);
      });

      const toGoHomePage = await ensureLoggedInHomePage(
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        adminMenuCreateCategorySmokeTestData.employeePassword,
      );

      const orderDishesPage = await test.step('步骤9：首页进入 To Go 点单页并搜索新建称重菜', async () => {
        const odp = await startToGoOrder(toGoHomePage);
        await odp.openDishSearchPanel();
        await odp.applyDishSearchKeyword(item.itemName);
        await odp.expectDishSearchResultVisible(item.itemName);
        return odp;
      });

      await test.step('断言2：To Go 点单页可搜索到新建称重菜', async () => {
        await orderDishesPage.expectDishSearchResultVisible(item.itemName);
      });

      const cleanupHomePage = await ensureLoggedInHomePage(
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        adminMenuCreateCategorySmokeTestData.employeePassword,
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
