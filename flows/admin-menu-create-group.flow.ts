import { AdminPage } from '../pages/admin.page';
import { step } from '../utils/step';

function randomAlnum10(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class AdminMenuCreateGroupFlow {
  /** 生成 `autotest_create_menu_` + 10 位随机字母数字（同步工具，不加 @step 以免与装饰器返回类型冲突） */
  buildAutotestGroupName(prefix: string): string {
    return `${prefix}${randomAlnum10()}`;
  }

  @step('业务步骤：Admin-等待后台壳就绪（侧栏 Restaurant 等）')
  async stepWaitAdminShellReady(adminPage: AdminPage): Promise<void> {
    await adminPage.expectAdminMenuShellReady();
  }

  @step('业务步骤：步骤2-进入 Menu 并依次点击 CREATE NEW、Create New Group')
  async stepNavigateMenuCreateNewGroup(adminPage: AdminPage): Promise<void> {
    await adminPage.clickMenuNav();
    await adminPage.clickCreateNewMenu();
    await adminPage.clickCreateNewGroupMenuItem();
  }

  @step('断言1：步骤2-菜单区可见 Menu、CREATE NEW 与 Create New Group')
  async stepAssertMenuCreateNewGroupVisible(adminPage: AdminPage): Promise<void> {
    await adminPage.expectMenuNavAndCreateNewGroupEntryVisible();
  }

  @step('业务步骤：步骤3-打开 POS Menu 所属 mdc-select 下拉')
  async stepOpenPosMenuSelect(adminPage: AdminPage): Promise<void> {
    await adminPage.openPosMenuSelectDropdown();
  }

  @step('断言2：步骤3-仍可见 CREATE NEW 相关文案')
  async stepAssertCreateNewContext(adminPage: AdminPage): Promise<void> {
    await adminPage.expectCreateNewContextVisible();
  }

  @step('业务步骤：步骤4-选择 POS Menu 并确认 OK')
  async stepChoosePosMenuAndOk(adminPage: AdminPage): Promise<void> {
    await adminPage.choosePosMenuOptionAndConfirmOk();
  }

  @step((name: string) => `业务步骤：步骤5-填写 Group name：${name}`)
  async stepFillGroupName(adminPage: AdminPage, name: string): Promise<void> {
    await adminPage.fillNewGroupName(name);
  }

  @step('业务步骤：步骤6-勾选 All Day')
  async stepCheckAllDay(adminPage: AdminPage): Promise<void> {
    await adminPage.checkAllDay();
  }

  @step('断言4：步骤8-POS Menu 下可见新建菜单组')
  async stepAssertNewGroupUnderPosMenu(adminPage: AdminPage, groupName: string): Promise<void> {
    await adminPage.expectGroupNameVisibleUnderPosMenu(groupName);
  }
}
