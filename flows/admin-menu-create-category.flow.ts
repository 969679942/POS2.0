import { AdminPage } from '../pages/admin.page';
import { step } from '../utils/step';
import { AdminMenuCreateGroupFlow } from './admin-menu-create-group.flow';

function randomAlnum8(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class AdminMenuCreateCategoryFlow {
  /**
   * 生成 `Cat_` + 8 位随机字母数字（总长 12，避免 POS Name 等字段 maxlength 导致截断后校验失败）
   */
  buildCategoryDisplayName(): string {
    return `Cat_${randomAlnum8()}`;
  }

  @step('业务步骤：前置-创建冒烟菜单组并回到列表、展开 POS、校验组名可见')
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

  @step((_adminPage: AdminPage, groupName: string) => `业务步骤：步骤2-进入 Menu 并展开 POS Menu 直至「${groupName}」可见`)
  async stepMenuNavAndExpandPosMenu(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.clickMenuNav();
    await adminPage.expandPosMenuUntilGroupNameVisible(groupName);
  }

  @step((_adminPage: AdminPage, groupName: string) => `业务步骤：步骤3-进入菜单组「${groupName}」直至出现 Group name 区`)
  async stepOpenMenuGroupContext(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.clickMenuGroupUntilGroupNameToolbarVisible(groupName);
  }

  @step('业务步骤：步骤4-CREATE NEW → Create New Category，向导中选择菜单组并 OK')
  async stepCreateNewCategoryChooseGroupOk(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.clickCreateNewCategoryFromToolbar();
    await adminPage.chooseMenuGroupInNewCategoryWizardAndOk(groupName);
  }

  @step((_adminPage: AdminPage, value: string) => `业务步骤：步骤5-填写 Category 名称字段均为「${value}」`)
  async stepFillCategoryNames(adminPage: AdminPage, displayName: string): Promise<void> {
    await adminPage.fillCategoryNameFieldsAllSame(displayName);
  }

  @step('业务步骤：步骤6-仅保留 tax(3%) 税率项并保存，确认多税弹窗后再校验保存成功')
  async stepTaxSaveAndConfirmMultipleTaxes(adminPage: AdminPage): Promise<void> {
    await adminPage.setCategoryTaxOnlyThreePercentOption();
    await adminPage.clickSaveCategoryForm();
    await adminPage.confirmMultipleTaxesSelectedDialogSaveIfVisible();
    try {
      await adminPage.expectSaveSuccessMessageVisibleFlexible({ timeout: 3_000 });
    } catch {
      /* 部分环境无显式成功提示，依赖后续返回组列表与 Category 检出 */
    }
  }

  @step('业务步骤：步骤6-2-SAVE 后点击 keyboard_arrow_left 的 span 回到组列表（组下 Category 由后续断言检出）')
  async stepBackToMenuGroupFromCategoryEditor(adminPage: AdminPage): Promise<void> {
    await adminPage.clickBackToMenuGroupChevron();
  }

  @step((_adminPage: AdminPage, categoryName: string) => `断言1：菜单组下可见新建 Category「${categoryName}」`)
  async stepAssertCategoryVisibleUnderGroup(adminPage: AdminPage, categoryName: string): Promise<void> {
    await adminPage.expectCategoryNameVisibleInMenuGroup(categoryName);
  }
}
