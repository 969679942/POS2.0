import { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import { AdminMenuDeleteGroupFlow } from '../../flows/admin-menu-delete-group.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { adminMenuDeleteGroupSmokeTestData } from '../../test-data/admin-menu-delete-group-smoke';

test.describe('【Admin-Menu-Delete Menu Group】', () => {
  test(
    'Admin 菜单管理：新建菜单组后删除并校验 Delete Success（冒烟）',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(300_000);

      const createFlow = new AdminMenuCreateGroupFlow();
      const deleteFlow = new AdminMenuDeleteGroupFlow();
      const groupName = createFlow.buildAutotestGroupName(adminMenuDeleteGroupSmokeTestData.groupNamePrefix);

      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        adminMenuDeleteGroupSmokeTestData.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const adminPage = await test.step('步骤1：首页点击 Admin 进入后台', async () => {
        return await loggedInHomePage.clickAdmin();
      });

      await createFlow.stepWaitAdminShellReady(adminPage);

      await test.step('前置：创建待删除的菜单组', async () => {
        await deleteFlow.stepPrepareMenuGroupViaCreateNewGroupUi(adminPage, createFlow, groupName);
      });

      await test.step('步骤2：进入 Menu，点击 POS Menu 前 add 展开直至出现目标菜单组', async () => {
        await deleteFlow.stepMenuNavAndExpandPosMenuUntilGroupVisible(adminPage, groupName);
      });

      await test.step(`步骤3：选中菜单组「${groupName}」所在行复选框`, async () => {
        await deleteFlow.stepSelectMenuGroupRowCheckbox(adminPage, groupName);
      });

      await test.step('步骤5：点击 DELETE，在确认弹窗中点击 Delete', async () => {
        await deleteFlow.stepToolbarDeleteAndConfirmDialog(adminPage);
      });

      await test.step('断言1：界面出现 Delete Success 成功提示', async () => {
        await deleteFlow.stepAssertDeleteSuccessMessage(adminPage);
      });
    },
  );
});
