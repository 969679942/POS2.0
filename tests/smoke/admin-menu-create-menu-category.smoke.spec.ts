import { AdminMenuCreateCategoryFlow } from '../../flows/admin-menu-create-category.flow';
import { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { adminMenuCreateCategorySmokeTestData } from '../../test-data/admin-menu-create-category-smoke';

test.describe('【Admin-Menu-Create Menu Category】', () => {
  test(
    'Admin 菜单管理：新建菜单组后创建 Category 并在组下检出（冒烟）',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(360_000);

      const createFlow = new AdminMenuCreateGroupFlow();
      const categoryFlow = new AdminMenuCreateCategoryFlow();
      const groupName = createFlow.buildAutotestGroupName(adminMenuCreateCategorySmokeTestData.groupNamePrefix);
      const categoryDisplayName = categoryFlow.buildCategoryDisplayName();

      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        adminMenuCreateCategorySmokeTestData.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const adminPage = await test.step('步骤1：首页点击 Admin 进入后台', async () => {
        return await loggedInHomePage.clickAdmin();
      });

      await createFlow.stepWaitAdminShellReady(adminPage);

      await test.step('前置：创建菜单组', async () => {
        await categoryFlow.stepPrepareMenuGroupViaCreateNewGroupUi(adminPage, createFlow, groupName);
      });

      await test.step('步骤2：进入 Menu，展开 POS Menu 直至出现目标菜单组', async () => {
        await categoryFlow.stepMenuNavAndExpandPosMenu(adminPage, groupName);
      });

      await test.step('步骤3：进入菜单组直至出现 Group name 区', async () => {
        await categoryFlow.stepOpenMenuGroupContext(adminPage, groupName);
      });

      await test.step('步骤4：CREATE NEW → Create New Category，选择菜单组并 OK', async () => {
        await categoryFlow.stepCreateNewCategoryChooseGroupOk(adminPage, groupName);
      });

      await test.step(`步骤5：填写 Category 名称（四类字段均为「${categoryDisplayName}」）`, async () => {
        await categoryFlow.stepFillCategoryNames(adminPage, categoryDisplayName);
      });

      await test.step('步骤6-1：仅保留 tax(3%) 并保存，确认多税弹窗（若有）并等待保存成功提示', async () => {
        await categoryFlow.stepTaxSaveAndConfirmMultipleTaxes(adminPage);
      });

      await test.step('步骤6-2：点击左上角返回（Back to Menu Group 前）回到组内列表', async () => {
        await categoryFlow.stepBackToMenuGroupFromCategoryEditor(adminPage);
      });

      await test.step(`断言1：组下可见新建 Category「${categoryDisplayName}」`, async () => {
        await categoryFlow.stepAssertCategoryVisibleUnderGroup(adminPage, categoryDisplayName);
      });
    },
  );
});
