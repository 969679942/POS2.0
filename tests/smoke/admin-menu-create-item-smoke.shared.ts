import type { AdminMenuCreateCategoryFlow } from '../../flows/admin-menu-create-category.flow';
import type { AdminMenuCreateGroupFlow } from '../../flows/admin-menu-create-group.flow';
import type { AdminMenuCreateItemFlow } from '../../flows/admin-menu-create-item.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import type { EmployeeLoginPage } from '../../pages/employee-login.page';
import type { LicenseSelectionPage } from '../../pages/license-selection.page';
import type { HomePage } from '../../pages/home.page';
import type { AdminPage } from '../../pages/admin.page';
import { waitUntil } from '../../utils/wait';

export async function ensureLoggedInHomePage(
  homePage: HomePage,
  licenseSelectionPage: LicenseSelectionPage,
  employeeLoginPage: EmployeeLoginPage,
  employeePassword: string,
): Promise<HomePage> {
  await openHome(homePage);

  if (await licenseSelectionPage.isVisible(10_000)) {
    await enterWithAvailableLicense(licenseSelectionPage, homePage);
  }

  const passcodeAppeared = await waitUntil(
    async () => await employeeLoginPage.isVisible(),
    (visible) => visible === true,
    {
      timeout: 3_000,
      interval: 200,
      message: '回到首页后未在短时间内确认员工口令页是否出现',
    },
  ).catch(() => false);

  if (passcodeAppeared) {
    return await enterWithEmployeePassword(employeeLoginPage, homePage, employeePassword);
  }

  await homePage.expectEmployeeReady();
  return homePage;
}

export type PrepareFirstCategoryEditorOptions = {
  homePage: HomePage;
  licenseSelectionPage: LicenseSelectionPage;
  employeeLoginPage: EmployeeLoginPage;
  employeePassword: string;
  createGroupFlow: AdminMenuCreateGroupFlow;
  categoryFlow: AdminMenuCreateCategoryFlow;
  itemFlow: AdminMenuCreateItemFlow;
  groupNamePrefix: string;
};

export type PreparedFirstCategoryEditor = {
  adminPage: AdminPage;
  groupName: string;
  categoryDisplayName: string;
};

export async function prepareFirstCategoryEditor(
  options: PrepareFirstCategoryEditorOptions,
): Promise<PreparedFirstCategoryEditor> {
  const loggedInHomePage = await ensureLoggedInHomePage(
    options.homePage,
    options.licenseSelectionPage,
    options.employeeLoginPage,
    options.employeePassword,
  );

  await loggedInHomePage.expectPrimaryFunctionCardsVisible();

  const adminPage = await loggedInHomePage.clickAdmin();
  await options.createGroupFlow.stepWaitAdminShellReady(adminPage);

  const groupName = options.createGroupFlow.buildAutotestGroupName(options.groupNamePrefix);
  const categoryDisplayName = options.categoryFlow.buildCategoryDisplayName();

  await options.categoryFlow.stepPrepareMenuGroupViaCreateNewGroupUi(adminPage, options.createGroupFlow, groupName);
  await options.categoryFlow.stepMenuNavAndExpandPosMenu(adminPage, groupName);
  await options.categoryFlow.stepOpenMenuGroupContext(adminPage, groupName);
  await options.categoryFlow.stepCreateNewCategoryChooseGroupOk(adminPage, groupName);
  await options.categoryFlow.stepFillCategoryNames(adminPage, categoryDisplayName);
  await options.categoryFlow.stepTaxSaveAndConfirmMultipleTaxes(adminPage);
  await options.categoryFlow.stepBackToMenuGroupFromCategoryEditor(adminPage);
  await options.categoryFlow.stepAssertCategoryVisibleUnderGroup(adminPage, categoryDisplayName);
  await options.itemFlow.stepOpenCategoryEditor(adminPage, categoryDisplayName);

  return {
    adminPage,
    groupName,
    categoryDisplayName,
  };
}
