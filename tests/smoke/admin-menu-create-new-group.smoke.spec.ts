import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { adminMenuCreateGroupSmokeTestData } from '../../test-data/admin-menu-create-group-smoke';

test.describe('【Admin-Menu-Create New Group】', () => {
  test(
    'Admin 菜单管理：新建菜单组并可在 POS Menu 下检出（冒烟）',
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
      test.setTimeout(180_000);

      const flow = new AdminMenuCreateGroupFlow();
      const groupName = flow.buildAutotestGroupName(adminMenuCreateGroupSmokeTestData.groupNamePrefix);

      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        adminMenuCreateGroupSmokeTestData.employeePassword,
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const adminPage = await test.step('步骤1：首页点击 Admin 进入后台', async () => {
        return await loggedInHomePage.clickAdmin();
      });

      await flow.stepWaitAdminShellReady(adminPage);

      await test.step('步骤2：进入 Menu 并点击 CREATE NEW', async () => {
        await adminPage.clickMenuNav();
        await adminPage.clickCreateNewMenu();
      });

      await test.step('断言1：步骤2-可见 Menu、CREATE NEW 与 Create New Group', async () => {
        await adminPage.expectMenuNavAndCreateNewGroupEntryVisible();
      });

      await test.step('步骤2：点击 Create New Group 进入新建分组表单', async () => {
        await adminPage.clickCreateNewGroupMenuItem();
      });

      await test.step('步骤3：点击 POS Menu 所属下拉（mdc-select）', async () => {
        await flow.stepOpenPosMenuSelect(adminPage);
      });

      await test.step('断言2：步骤3-仍可见 CREATE NEW 相关文案', async () => {
        await flow.stepAssertCreateNewContext(adminPage);
      });

      await test.step('步骤4：下拉中选择 POS Menu 并点击 OK', async () => {
        await flow.stepChoosePosMenuAndOk(adminPage);
      });

      await test.step(`步骤5：填写 Group name：${groupName}`, async () => {
        await flow.stepFillGroupName(adminPage, groupName);
      });

      await test.step('步骤6：勾选 All Day 前复选框', async () => {
        await flow.stepCheckAllDay(adminPage);
      });

      await test.step('步骤7：点击 SAVE', async () => {
        await adminPage.clickSaveNewGroup();
      });

      await test.step('断言3：步骤7-弹出 Successfully saved', async () => {
        await adminPage.expectSuccessfullySavedMessageVisible();
      });

      await test.step('步骤7：点击 BACK TO LIST', async () => {
        await adminPage.clickBackToList();
      });

      await test.step('步骤8：在 POS Menu 行点击 add 图标并校验新建组', async () => {
        await adminPage.clickAddIconNearPosMenuRow();
      });

      await test.step(`断言4：步骤8-POS Menu 组下可见新建菜单组「${groupName}」`, async () => {
        await flow.stepAssertNewGroupUnderPosMenu(adminPage, groupName);
      });
    },
  );
});
