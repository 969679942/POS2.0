import { AdminPage } from '../pages/admin.page';
import { step } from '../utils/step';
import { AdminMenuCreateGroupFlow } from './admin-menu-create-group.flow';

export class AdminMenuDeleteGroupFlow {
  @step('业务步骤：前置-通过「新建菜单组」界面创建待删除的冒烟菜单组')
  async stepPrepareMenuGroupViaCreateNewGroupUi(
    adminPage: AdminPage,
    createFlow: AdminMenuCreateGroupFlow,
    groupName: string,
  ): Promise<void> {
    await createFlow.stepNavigateMenuCreateNewGroup(adminPage);
    await createFlow.stepAssertMenuCreateNewGroupVisible(adminPage);
    await createFlow.stepOpenPosMenuSelect(adminPage);
    await createFlow.stepAssertCreateNewContext(adminPage);
    await createFlow.stepChoosePosMenuAndOk(adminPage);
    await createFlow.stepFillGroupName(adminPage, groupName);
    await createFlow.stepCheckAllDay(adminPage);
    await adminPage.clickSaveNewGroup();
    await adminPage.expectSuccessfullySavedMessageVisible();
    await adminPage.clickBackToList();
    await adminPage.clickAddIconNearPosMenuRow();
    await createFlow.stepAssertNewGroupUnderPosMenu(adminPage, groupName);
  }

  @step((_adminPage: AdminPage, groupName: string) => `业务步骤：步骤2-进入 Menu 并展开 POS Menu 直至「${groupName}」在列表中可见`)
  async stepMenuNavAndExpandPosMenuUntilGroupVisible(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.clickMenuNav();
    await adminPage.expandPosMenuUntilGroupNameVisible(groupName);
  }

  @step((_adminPage: AdminPage, groupName: string) => `业务步骤：步骤3-勾选菜单组「${groupName}」所在行的复选框`)
  async stepSelectMenuGroupRowCheckbox(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.selectMenuGroupRowCheckboxByName(groupName);
  }

  @step('业务步骤：步骤5-点击 DELETE，在确认弹窗中点击 Delete')
  async stepToolbarDeleteAndConfirmDialog(adminPage: AdminPage): Promise<void> {
    await adminPage.clickDeleteMenuGroupToolbarButton();
    await adminPage.expectDeleteMenuGroupConfirmDialogVisible();
    await adminPage.clickDeleteMenuGroupDialogAcceptButton();
  }

  @step('断言1：删除成功后界面出现 Delete Success 提示')
  async stepAssertDeleteSuccessMessage(adminPage: AdminPage): Promise<void> {
    await adminPage.expectDeleteMenuGroupSuccessMessageVisible();
  }
}
