import { expect, type Frame, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { step } from '../utils/step';
import { waitUntil } from '../utils/wait';

/**
 * Admin 后台：侧栏可能在主文档（Admin 全屏壳常见），也可能与 POS 首页同在 `#newLoginContainer iframe`；菜单编辑区可能在 `kpos/menu/...` 子 Frame，或与壳同文档。
 */
export class AdminPage {
  private menuDoc: Frame | null = null;

  constructor(private readonly page: Page) {}

  private m(): Frame {
    if (!this.menuDoc) {
      throw new Error('菜单内容 Frame 未就绪：请先点击侧栏 Menu 并等待 bindMenuContentFrame 成功');
    }
    return this.menuDoc;
  }

  /** 与产品脚本一致：`iframe#innerpage` 内为菜单子应用文档 */
  private menuInnerPage(): FrameLocator {
    return this.page.frameLocator('iframe#innerpage');
  }

  /** 菜单编辑区就绪：避免出现「已绑定空 innerpage / 任意 iframe」导致后续找不到 CREATE NEW */
  private async frameHasMenuEditorShell(f: Frame): Promise<boolean> {
    if (await f.getByText(/CREATE\s*NEW/i).first().isVisible().catch(() => false)) {
      return true;
    }
    if (await f.getByRole('button', { name: /CREATE\s*NEW/i }).first().isVisible().catch(() => false)) {
      return true;
    }
    if (await f.getByText('Create New Group', { exact: true }).first().isVisible().catch(() => false)) {
      return true;
    }
    return await f.getByRole('menuitem', { name: 'Create New Group' }).first().isVisible().catch(() => false);
  }

  @step('页面操作：解析菜单内容 Frame（须在目标文档内已见 CREATE NEW 或 Create New Group 再绑定，禁止空 iframe 误判）')
  private async bindMenuContentFrame(options?: { timeout?: number; interval?: number }): Promise<void> {
    const timeout = options?.timeout ?? 60_000;
    await waitUntil(
      async () => {
        const inner = this.page.locator('iframe#innerpage').first();
        if ((await inner.count()) > 0 && (await inner.isVisible().catch(() => false))) {
          const handle = await inner.elementHandle().catch(() => null);
          const f = handle ? await handle.contentFrame() : null;
          if (f && (await this.frameHasMenuEditorShell(f))) {
            this.menuDoc = f;
            return true;
          }
        }
        for (const fr of this.page.frames()) {
          if (/\/kpos\/menu\//i.test(fr.url()) && (await this.frameHasMenuEditorShell(fr))) {
            this.menuDoc = fr;
            return true;
          }
        }
        const main = this.page.mainFrame();
        if (await this.frameHasMenuEditorShell(main)) {
          this.menuDoc = main;
          return true;
        }
        const n = await this.page.locator('iframe').count();
        for (let i = 0; i < n; i += 1) {
          const handle = await this.page.locator('iframe').nth(i).elementHandle().catch(() => null);
          const f = handle ? await handle.contentFrame() : null;
          if (!f) {
            continue;
          }
          if (await this.frameHasMenuEditorShell(f)) {
            this.menuDoc = f;
            return true;
          }
        }
        return false;
      },
      (ok) => ok === true,
      {
        timeout,
        interval: options?.interval ?? 250,
        message:
          '未解析到菜单内容：在 iframe#innerpage、kpos/menu 子 frame、主文档与其它 iframe 内均未在超时内见到 CREATE NEW 或 Create New Group',
      },
    );
  }

  @step('页面操作：等待 Admin 壳出现可点击的 Menu 入口（主文档优先 #admstMenutxt / menu_book，再查 POS 应用 iframe）')
  async expectAdminMenuShellReady(): Promise<void> {
    await waitUntil(
      async () => {
        for (const loc of this.sidebarMenuEntryProbeLocators()) {
          if (await loc.isVisible().catch(() => false)) {
            return true;
          }
        }
        return false;
      },
      (ok) => ok === true,
      {
        timeout: 30_000,
        interval: 50,
        message: '未在超时内进入 Admin 壳（未见可点的 Menu 入口）',
      },
    );
  }

  /** @deprecated 使用 {@link expectAdminMenuShellReady}；iframe 需在点击侧栏 Menu 后解析 */
  async expectInnerPageMenuFrameReady(): Promise<void> {
    await this.expectAdminMenuShellReady();
  }

  /**
   * 步骤 3：仅在 `iframe#innerpage` 内定位 mdc-select（等同 `contentDocument.querySelector('.mdc-select__surface')`）。
   * 优先带「POS Menu」展示文案的 surface；否则取第一个 surface。
   */
  private posMenuSelectSurfaceInInnerPage(): Locator {
    const inner = this.menuInnerPage();
    const withPosLabel = inner
      .locator('.mdc-select__surface')
      .filter({ has: inner.locator('.mdc-select__selected-text', { hasText: 'POS Menu' }) })
      .first();
    return withPosLabel;
  }

  private groupNameTextInput(): Locator {
    return this.m().locator('input.mdc-text-field__input[required]').first();
  }

  private allDayCheckbox(): Locator {
    const byRole = this.m().getByRole('checkbox', { name: /^All Day$/i }).first();
    const mdcLegacy = this.m()
      .locator('label')
      .filter({ hasText: /^All Day$/i })
      .locator('input[type="checkbox"]')
      .first();
    return byRole.or(mdcLegacy);
  }

  private saveButton(): Locator {
    return this.m().getByRole('button', { name: /^save$/i }).first();
  }

  /** 与首页 POS 壳同一层 iframe（侧栏在 Admin 全屏时常在主文档，勿只查此 frame） */
  private posAppShellFrame(): FrameLocator {
    return this.page.frameLocator('#newLoginContainer iframe');
  }

  /** 侧栏 Menu 就绪探测顺序：主文档先于应用 iframe，避免 `.or()` 左侧空转 */
  private sidebarMenuEntryProbeLocators(): Locator[] {
    return [
      this.page.locator('#admstMenutxt').first(),
      this.posAppShellFrame().locator('#admstMenutxt').first(),
      this.page.getByText('menu_book', { exact: true }).locator('..').first(),
      this.posAppShellFrame().getByText('menu_book', { exact: true }).locator('..').first(),
    ];
  }

  /** 返回当前可见的侧栏 Menu 点击目标（无则 null） */
  private async resolveVisibleSidebarMenuClickTarget(): Promise<Locator | null> {
    for (const loc of this.sidebarMenuEntryProbeLocators()) {
      if (await loc.isVisible().catch(() => false)) {
        return loc;
      }
    }
    return null;
  }

  @step('断言1：步骤2-侧栏可见 Menu（#admstMenutxt 或 menu_book 行），内容区可见 CREATE NEW 与 Create New Group')
  async expectMenuNavAndCreateNewGroupEntryVisible(): Promise<void> {
    await waitUntil(
      async () => (await this.resolveVisibleSidebarMenuClickTarget()) !== null,
      (ok) => ok === true,
      {
        timeout: 20_000,
        interval: 50,
        message: '侧栏未见 Menu 入口（主文档 #admstMenutxt / menu_book 行或应用 iframe 内同定位）',
      },
    );
    const mainId = this.page.locator('#admstMenutxt').first();
    const appId = this.posAppShellFrame().locator('#admstMenutxt').first();
    if (await mainId.isVisible().catch(() => false)) {
      await expect(mainId).toContainText('Menu', { timeout: 5_000 });
    } else if (await appId.isVisible().catch(() => false)) {
      await expect(appId).toContainText('Menu', { timeout: 5_000 });
    }
    await expect(this.m().getByText(/CREATE\s*NEW/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.m().getByText('Create New Group', { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  @step('页面操作：步骤2-点击侧栏进入菜单管理（优先 #admstMenutxt；再 menu_book 父级整行；绑定失败会重试一次点击）')
  async clickMenuNav(): Promise<void> {
    const tryClick = async (loc: Locator) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 10_000, force: true }).catch(async () => {
        await loc.evaluate((el) => {
          (el as HTMLElement).click();
        });
      });
    };

    const performMenuEntryClick = async () => {
      const visible = await this.resolveVisibleSidebarMenuClickTarget();
      if (visible) {
        await tryClick(visible);
        return;
      }
      await waitUntil(
        async () => (await this.resolveVisibleSidebarMenuClickTarget()) !== null,
        (ok) => ok === true,
        {
          timeout: 25_000,
          interval: 50,
          message: '侧栏 Menu 入口未在超时内可见',
        },
      );
      const afterWait = await this.resolveVisibleSidebarMenuClickTarget();
      if (!afterWait) {
        throw new Error('侧栏 Menu 入口已等待可见，但未解析到可点击定位');
      }
      await tryClick(afterWait);
    };

    await performMenuEntryClick();
    try {
      // 当前环境下第一次点击常未真正触发菜单切换，先做一次更短探测，再补点，减少空等时间。
      await this.bindMenuContentFrame({ timeout: 3_000, interval: 120 });
    } catch {
      await performMenuEntryClick();
      await this.bindMenuContentFrame({ timeout: 24_000, interval: 200 });
    }
  }

  @step('页面操作：步骤2-点击 CREATE NEW 展开菜单')
  async clickCreateNewMenu(): Promise<void> {
    await expect(this.m().getByText(/CREATE\s*NEW/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await this.m().getByText(/CREATE\s*NEW/i).first().click();
  }

  @step('页面操作：步骤2-点击菜单项 Create New Group 进入新建分组表单')
  async clickCreateNewGroupMenuItem(): Promise<void> {
    const byRole = this.m().getByRole('menuitem', { name: 'Create New Group' }).first();
    const byText = this.m().getByText('Create New Group', { exact: true }).first();
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.click();
      return;
    }
    await expect(byText).toBeVisible({ timeout: 15_000 });
    await byText.click();
  }

  @step('断言2：步骤3-表单区域仍可见 CREATE NEW 标题或工具栏文案')
  async expectCreateNewContextVisible(): Promise<void> {
    await expect(this.m().getByText(/CREATE\s*NEW/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * innerpage 内常有多个 mdc-select；`first()` 可能命中隐藏占位，需在可见集合中择优（优先带 POS Menu 展示文案）。
   * 返回值：`-2` 表示使用 {@link posMenuSelectSurfaceInInnerPage}；`>= 0` 为 `.mdc-select__surface` 的第 n 个可见项。
   */
  private async waitForVisibleMdcSelectSurfaceIndexInInnerPage(): Promise<number> {
    return await waitUntil(
      async () => {
        const inner = this.menuInnerPage();
        const preferred = this.posMenuSelectSurfaceInInnerPage();
        if (await preferred.isVisible().catch(() => false)) {
          return -2;
        }
        const all = inner.locator('.mdc-select__surface');
        const n = await all.count();
        for (let i = 0; i < n; i += 1) {
          if (await all.nth(i).isVisible().catch(() => false)) {
            return i;
          }
        }
        return -1;
      },
      (idx) => idx !== -1,
      {
        timeout: 25_000,
        interval: 300,
        message:
          'iframe#innerpage 内未在超时内出现可见的 .mdc-select__surface（已跳过仅 attached 的隐藏 surface）',
      },
    );
  }

  @step(
    '页面操作：步骤3-在 iframe#innerpage 内定位 .mdc-select__surface 并点击展开（等同 innerDoc.querySelector）',
  )
  async openPosMenuSelectDropdown(): Promise<void> {
    const iframe = this.page.locator('iframe#innerpage').first();
    await expect(iframe).toBeAttached({ timeout: 30_000 });
    await expect(iframe).toBeVisible({ timeout: 20_000 });

    const idx = await this.waitForVisibleMdcSelectSurfaceIndexInInnerPage();
    const inner = this.menuInnerPage();
    const surface =
      idx === -2 ? this.posMenuSelectSurfaceInInnerPage() : inner.locator('.mdc-select__surface').nth(idx);

    await surface.scrollIntoViewIfNeeded().catch(() => {});
    await surface.click({ force: true });
  }

  @step('页面操作：步骤4-在 iframe#innerpage 内选择 POS Menu 并点击 OK 确认')
  async choosePosMenuOptionAndConfirmOk(): Promise<void> {
    const inner = this.menuInnerPage();
    const option = inner.getByRole('option', { name: 'POS Menu' }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      const posMenuText = inner.getByText('POS Menu', { exact: true }).last();
      await expect(posMenuText).toBeVisible({ timeout: 10_000 });
      await posMenuText.click();
    }
    const ok = inner.getByRole('button', { name: /^OK$/i }).first();
    await expect(ok).toBeVisible({ timeout: 10_000 });
    await ok.click();
  }

  @step((name: string) => `页面操作：步骤5-在 Group name 输入框填写 ${name}`)
  async fillNewGroupName(name: string): Promise<void> {
    const input = this.groupNameTextInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(name);
  }

  @step('页面操作：步骤6-勾选 All Day 前的复选框')
  async checkAllDay(): Promise<void> {
    const box = this.allDayCheckbox();
    await expect(box).toBeVisible({ timeout: 15_000 });
    if (!(await box.isChecked().catch(() => false))) {
      await box.click({ force: true });
    }
  }

  @step('页面操作：步骤7-点击 SAVE 提交新建菜单组')
  async clickSaveNewGroup(): Promise<void> {
    await expect(this.saveButton()).toBeVisible({ timeout: 15_000 });
    await this.saveButton().click();
  }

  @step('断言3：步骤7-界面出现 Successfully saved 提示')
  async expectSuccessfullySavedMessageVisible(): Promise<void> {
    const top = this.page.getByText(/Successfully saved/i).first();
    if (await top.isVisible().catch(() => false)) {
      await expect(top).toBeVisible({ timeout: 20_000 });
      return;
    }
    await expect(this.m().getByText(/Successfully saved/i).first()).toBeVisible({ timeout: 20_000 });
  }

  /** Category 等子页：成功提示可能为英文句、Snackbar 或中文短句；部分环境仅展示无文案 Snackbar */
  @step('断言：界面出现保存成功类提示（Successfully saved / Snackbar / 中文）')
  async expectSaveSuccessMessageVisibleFlexible(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 3_000;
    await waitUntil(
      async () => {
        const checks = [
          this.page.getByText(/Successfully saved/i).first(),
          this.m().getByText(/Successfully saved/i).first(),
          this.m().locator('.mdc-snackbar').getByText(/saved|成功|保存/i).first(),
          this.m().getByText(/保存成功|已保存/i).first(),
        ];
        for (const loc of checks) {
          if (await loc.isVisible().catch(() => false)) {
            return true;
          }
        }
        if (await this.m().locator('.mdc-snackbar').first().isVisible().catch(() => false)) {
          return true;
        }
        if (await this.page.locator('.mdc-snackbar').first().isVisible().catch(() => false)) {
          return true;
        }
        return false;
      },
      (v) => v === true,
      { timeout, interval: 400, message: '未在超时内见到保存成功类提示或 Snackbar' },
    );
  }

  @step('页面操作：步骤7-点击 BACK TO LIST 返回列表')
  async clickBackToList(): Promise<void> {
    const back = this.m().getByRole('button', { name: /BACK TO LIST/i }).first();
    await expect(back).toBeVisible({ timeout: 15_000 });
    await back.click();
  }

  @step('页面操作：步骤8-在 POS Menu 分组行点击 material-icons「add」展开或定位子级')
  async clickAddIconNearPosMenuRow(): Promise<void> {
    const row = this.m().locator('tr, li, [role="row"], .mdc-list-item, div').filter({ hasText: 'POS Menu' }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    const addIcon = row.locator('span.material-icons', { hasText: 'add' }).first();
    await expect(addIcon).toBeVisible({ timeout: 15_000 });
    await addIcon.click({ force: true });
  }

  @step((name: string) => `断言4：步骤8-POS Menu 组下可见新建菜单组名称 ${name}`)
  async expectGroupNameVisibleUnderPosMenu(name: string): Promise<void> {
    await expect(this.m().getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  }

  /**
   * 菜单组列表行内复选框：`getByRole('link')` 常落在内层 `<a>`，勾选区在与该行容器下、位于链接列**之前**的单元格内（多为祖父级的首个子节点）。
   */
  private menuGroupRowCheckboxByExactName(name: string): Locator {
    const rowOrGroup = this.m().getByRole('link', { name, exact: true }).first().locator('xpath=../..');
    const checkboxCell = rowOrGroup.locator(':scope > *').first();
    return checkboxCell
      .getByRole('checkbox')
      .or(checkboxCell.locator('input.mdc-checkbox__native-control'))
      .first();
  }

  private menuToolbarDeleteButton(): Locator {
    return this.m()
      .getByRole('button', { name: '- Delete', exact: true })
      .or(this.m().getByRole('button', { name: /^DELETE$/i }))
      .first();
  }

  private deleteMenuGroupConfirmDialog(): Locator {
    return this.m()
      .locator('.mdc-dialog, [role="dialog"]')
      .filter({ hasText: /Are you sure you want to delete/i })
      .first();
  }

  @step((name: string) => `页面操作：展开 POS Menu 直至菜单组「${name}」在列表中可见（必要时点击 add 图标）`)
  async expandPosMenuUntilGroupNameVisible(name: string): Promise<void> {
    await waitUntil(
      async () => {
        if (await this.m().getByText(name, { exact: true }).first().isVisible().catch(() => false)) {
          return true;
        }
        await this.clickAddIconNearPosMenuRow();
        return false;
      },
      (ok) => ok === true,
      {
        timeout: 25_000,
        interval: 400,
        message: `未在超时内于菜单列表中见到菜单组名称：${name}（请确认 POS Menu 已展开）`,
      },
    );
  }

  @step((name: string) => `页面操作：勾选菜单组「${name}」所在行的选择复选框`)
  async selectMenuGroupRowCheckboxByName(name: string): Promise<void> {
    const link = this.m().getByRole('link', { name, exact: true }).first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    const box = this.menuGroupRowCheckboxByExactName(name);
    await expect(box).toBeAttached({ timeout: 20_000 });
    if (!(await box.isChecked().catch(() => false))) {
      await box.click({ force: true });
    }
  }

  @step('页面操作：点击工具栏 DELETE 打开删除确认弹窗')
  async clickDeleteMenuGroupToolbarButton(): Promise<void> {
    const btn = this.menuToolbarDeleteButton();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await expect(btn).toBeEnabled({ timeout: 10_000 });
    await btn.click();
  }

  @step('断言：删除确认弹窗可见且文案包含 Are you sure you want to delete')
  async expectDeleteMenuGroupConfirmDialogVisible(): Promise<void> {
    const dlg = this.deleteMenuGroupConfirmDialog();
    await expect(dlg).toBeVisible({ timeout: 15_000 });
    await expect(dlg.getByText(/Are you sure you want to delete/i)).toBeVisible({ timeout: 10_000 });
  }

  @step('页面操作：在删除确认弹窗中点击 Delete（接受删除）')
  async clickDeleteMenuGroupDialogAcceptButton(): Promise<void> {
    const dlg = this.deleteMenuGroupConfirmDialog();
    await expect(dlg).toBeVisible({ timeout: 10_000 });
    const accept = dlg
      .locator('button.mdc-dialog__footer__button--accept')
      .or(dlg.getByRole('button', { name: /^Delete$/i }))
      .first();
    await expect(accept).toBeVisible({ timeout: 10_000 });
    await accept.click();
  }

  @step('断言：界面出现 Delete Success 成功提示')
  async expectDeleteMenuGroupSuccessMessageVisible(): Promise<void> {
    const top = this.page.getByText(/Delete Success/i).first();
    if (await top.isVisible().catch(() => false)) {
      await expect(top).toBeVisible({ timeout: 20_000 });
      return;
    }
    await expect(this.m().getByText(/Delete Success/i).first()).toBeVisible({ timeout: 20_000 });
  }

  @step((name: string) => `页面操作：滚动并点击菜单组「${name}」直至出现 Group name 工具区`)
  async clickMenuGroupUntilGroupNameToolbarVisible(groupName: string): Promise<void> {
    const link = this.m().getByRole('link', { name: groupName, exact: true }).first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.click({ force: true, timeout: 15_000 }).catch(async () => {
      await link.evaluate((el) => (el as HTMLElement).click());
    });
    await expect(this.m().getByText(/Group\s*name/i).first()).toBeVisible({ timeout: 30_000 });
  }

  @step((name: string) => `页面操作：在菜单组列表中点击 Category「${name}」进入分类编辑页`)
  async clickCategoryNameInMenuGroup(name: string): Promise<void> {
    const link = this.m()
      .getByRole('link', { name, exact: true })
      .or(this.m().getByText(name, { exact: true }))
      .first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.click({ force: true, timeout: 15_000 }).catch(async () => {
      await link.evaluate((el) => (el as HTMLElement).click());
    });
    const createNewButton = this.m()
      .getByRole('button', { name: /^\+?\s*CREATE NEW$/i })
      .or(this.m().getByRole('button', { name: /CREATE NEW/i }))
      .first();
    await expect(createNewButton).toBeVisible({ timeout: 30_000 });
  }

  @step('页面操作：点击 CREATE NEW 后选择 Create New Category')
  async clickCreateNewCategoryFromToolbar(): Promise<void> {
    await this.clickCreateNewMenu();
    const byRole = this.m().getByRole('menuitem', { name: /Create New Category/i }).first();
    const byText = this.m().getByText('Create New Category', { exact: true }).first();
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.click();
      return;
    }
    await expect(byText).toBeVisible({ timeout: 15_000 });
    await byText.click();
  }

  @step('页面操作：点击 CREATE NEW 后选择 Create New Item')
  async clickCreateNewItemFromToolbar(): Promise<void> {
    await this.clickCreateNewMenu();
    await this.expectItemEditorVisible();
  }

  /** 新建 Category 向导：含菜单组 mdc-select 的弹层（避免与其它无下拉弹窗混淆） */
  private categoryWizardDialog(): Locator {
    return this.m()
      .locator('.mdc-dialog, [role="dialog"]')
      .filter({ has: this.m().locator('.mdc-select__surface') })
      .first();
  }

  @step((groupName: string) => `页面操作：在新建 Category 向导中选择菜单组「${groupName}」并点击 OK`)
  async chooseMenuGroupInNewCategoryWizardAndOk(groupName: string): Promise<void> {
    const dlg = this.categoryWizardDialog();
    await expect(dlg).toBeVisible({ timeout: 20_000 });
    const surface = dlg.locator('.mdc-select__surface').first();
    await expect(surface).toBeVisible({ timeout: 15_000 });
    await surface.scrollIntoViewIfNeeded().catch(() => {});
    await surface.click({ force: true });
    const opt = dlg.getByRole('option', { name: groupName, exact: true }).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
    } else {
      await dlg.getByText(groupName, { exact: true }).last().click();
    }
    const ok = dlg.getByRole('button', { name: /^OK$/i }).first();
    await expect(ok).toBeVisible({ timeout: 10_000 });
    await ok.click();
  }

  private itemEditorHeading(): Locator {
    return this.m().getByRole('heading').filter({ hasText: /Back to Category/i }).first();
  }

  @step('页面操作：确认普通菜编辑页已显示 Back to Category 与 Item Name')
  async expectItemEditorVisible(): Promise<void> {
    await expect(this.itemEditorHeading()).toBeVisible({ timeout: 30_000 });
    await expect(this.itemNameInput()).toBeVisible({ timeout: 15_000 });
  }

  private itemSectionTitle(title: RegExp): Locator {
    return this.m().getByText(title, { exact: true }).first();
  }

  private itemSectionInput(title: RegExp, index = 1): Locator {
    return this.itemSectionTitle(title).locator(`xpath=following::input[${index}] | following::textarea[${index}]`).first();
  }

  private itemNameInput(): Locator {
    return this.itemSectionInput(/^Name$/i, 1);
  }

  private itemPriceInput(): Locator {
    return this.m().getByRole('textbox', { name: /^Please Input Price$/i }).first();
  }

  private memberPriceInput(): Locator {
    return this.m().getByRole('textbox', { name: /^Please Input Benefit Price$/i }).first();
  }

  private unitPriceItemCheckbox(): Locator {
    const byRole = this.m().getByRole('checkbox', { name: /^Unit Price Item\??$/i }).first();
    const byLabel = this.m()
      .locator('label')
      .filter({ hasText: /^Unit Price Item\??$/i })
      .locator('input[type="checkbox"]')
      .first();
    return byRole.or(byLabel).first();
  }

  private openPriceItemCheckbox(): Locator {
    const byRole = this.m().getByRole('checkbox', { name: /^Open Price Item$/i }).first();
    const byLabel = this.m()
      .locator('label')
      .filter({ hasText: /^Open Price Item$/i })
      .locator('input[type="checkbox"]')
      .first();
    return byRole.or(byLabel).first();
  }

  private detailPriceItemCheckbox(): Locator {
    const byRole = this.m().getByRole('checkbox', { name: /^It has detail price\(s\)\??$/i }).first();
    const byLabel = this.m()
      .locator('label')
      .filter({ hasText: /^It has detail price\(s\)\??$/i })
      .locator('input[type="checkbox"]')
      .first();
    return byRole.or(byLabel).first();
  }

  private sendToKitchenRequiredCheckbox(): Locator {
    const byRole = this.m().getByRole('checkbox', { name: /^Send to Kitchen required\??$/i }).first();
    const byLabel = this.m()
      .locator('label')
      .filter({ hasText: /^Send to Kitchen required\??$/i })
      .locator('input[type="checkbox"]')
      .first();
    return byRole.or(byLabel).first();
  }

  private kitchenPrinterLabel(printerNames: string[]): Locator {
    const escapedNames = printerNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const namePattern = new RegExp(`^(${escapedNames.join('|')})$`, 'i');
    return this.m().getByText(namePattern).first();
  }

  private tareInput(): Locator {
    const byRole = this.m().getByRole('textbox', { name: /^(Tare|Trae)$/i }).first();
    const byPlaceholder = this.m().getByPlaceholder(/^(Tare|Trae)$/i).first();
    const byText = this.m()
      .locator('text=Tare')
      .or(this.m().locator('text=Trae'))
      .first()
      .locator('xpath=preceding-sibling::input[1] | preceding-sibling::textarea[1]')
      .first();
    return byRole.or(byPlaceholder).or(byText).first();
  }

  private detailPriceValueInputs(): Locator {
    return this.m().getByRole('textbox', { name: /^Please Input Price$/i });
  }

  private detailPriceBenefitValueInputs(): Locator {
    return this.m().getByRole('textbox', { name: /^Please Input Benefit Price$/i });
  }

  private detailPriceItemPriceInput(rowIndex = 0): Locator {
    return this.detailPriceValueInputs().nth(rowIndex + 1);
  }

  private detailPriceMemberPriceInput(rowIndex = 0): Locator {
    return this.detailPriceBenefitValueInputs().nth(rowIndex + 1);
  }

  private detailPriceRow(rowIndex: number): Locator {
    return this.detailPriceItemPriceInput(rowIndex).locator('xpath=ancestor::*[count(.//*[@role="listbox"]) = 2][1]');
  }

  private detailPriceTypeListboxes(rowIndex: number): Locator {
    return this.detailPriceRow(rowIndex).getByRole('listbox');
  }

  private detailPriceSizeListboxes(rowIndex: number): Locator {
    return this.detailPriceRow(rowIndex).getByRole('listbox');
  }

  private addDetailPriceButton(): Locator {
    return this.m().getByRole('button', { name: /^\+\s*ADD DETAIL PRICE$/i }).first();
  }

  private async resolveListboxPopup(trigger: Locator): Promise<Locator | null> {
    const ariaControls = (await trigger.getAttribute('aria-controls').catch(() => null)) ?? null;
    const ariaOwns = (await trigger.getAttribute('aria-owns').catch(() => null)) ?? null;
    const popupId = ariaControls ?? ariaOwns;
    if (!popupId) {
      return null;
    }
    return this.m().locator(`[id="${popupId}"]`).first();
  }

  private async clickVisibleOptionByText(optionText: string, scope: Locator = this.m().locator('body')): Promise<void> {
    const roleMatches = scope.getByRole('option', { name: optionText, exact: true });
    const textMatches = scope.getByText(optionText, { exact: true });
    await waitUntil(
      async () => {
        for (const candidates of [roleMatches, textMatches]) {
          const count = await candidates.count().catch(() => 0);
          for (let index = 0; index < count; index += 1) {
            if (await candidates.nth(index).isVisible().catch(() => false)) {
              return true;
            }
          }
        }
        return false;
      },
      (visible) => visible === true,
      {
        timeout: 10_000,
        interval: 200,
        message: `未在超时内见到可见的下拉选项：${optionText}`,
      },
    );

    for (const candidates of [roleMatches, textMatches]) {
      const count = await candidates.count().catch(() => 0);
      let visibleIndex = -1;
      for (let index = 0; index < count; index += 1) {
        if (await candidates.nth(index).isVisible().catch(() => false)) {
          visibleIndex = index;
        }
      }
      if (visibleIndex >= 0) {
        await candidates.nth(visibleIndex).click({ force: true });
        return;
      }
    }

    throw new Error(`未找到可见的下拉选项：${optionText}`);
  }

  private applyCategoryTaxRadio(): Locator {
    const byRole = this.m().getByRole('radio', { name: /^Apply category tax$/i }).first();
    const byLabel = this.m()
      .locator('label')
      .filter({ hasText: /^Apply category tax$/i })
      .locator('input[type="radio"]')
      .first();
    return byRole.or(byLabel).first();
  }

  @step((itemName: string) => `页面操作：在普通菜表单中填写 Item Name 为 ${itemName}`)
  async fillItemName(itemName: string): Promise<void> {
    const input = this.itemNameInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(itemName);
  }

  @step((itemPrice: string) => `页面操作：在普通菜表单中填写 Item Price 为 ${itemPrice}`)
  async fillItemPrice(itemPrice: string): Promise<void> {
    const input = this.itemPriceInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(itemPrice);
  }

  @step((memberPrice: string) => `页面操作：在普通菜表单中填写 Member Price 为 ${memberPrice}`)
  async fillMemberPrice(memberPrice: string): Promise<void> {
    const input = this.memberPriceInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(memberPrice);
  }

  @step('页面操作：在称重菜表单中勾选 Unit Price Item')
  async checkUnitPriceItem(): Promise<void> {
    const checkbox = this.unitPriceItemCheckbox();
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.click({ force: true });
    }
    await expect(checkbox).toBeChecked({ timeout: 5_000 });
  }

  @step('页面操作：在普通菜表单中勾选 Open Price Item')
  async checkOpenPriceItem(): Promise<void> {
    const checkbox = this.openPriceItemCheckbox();
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.click({ force: true });
    }
    await expect(checkbox).toBeChecked({ timeout: 5_000 });
  }

  @step('页面操作：在普通菜表单中勾选 Send to Kitchen required 并默认选择打印机')
  async enableDefaultKitchenPrinters(): Promise<void> {
    const sendToKitchenRequired = this.sendToKitchenRequiredCheckbox();
    await expect(sendToKitchenRequired).toBeVisible({ timeout: 15_000 });
    if (!(await sendToKitchenRequired.isChecked().catch(() => false))) {
      await sendToKitchenRequired.click({ force: true });
    }
    await expect(sendToKitchenRequired).toBeChecked({ timeout: 5_000 });

    for (const printerNames of [
      ['Kds'],
      ['kitchen'],
      ['label'],
      ['packer', 'paker'],
      ['receipt'],
      ['runner'],
    ]) {
      const printerLabel = this.kitchenPrinterLabel(printerNames);
      await printerLabel.evaluate((el) => {
        (el as HTMLElement).click();
      });
    }
  }

  @step('页面操作：确认称重菜表单中的 Tare 输入框可见')
  async expectTareInputVisible(): Promise<void> {
    await expect(this.tareInput()).toBeVisible({ timeout: 15_000 });
  }

  @step((tare: string) => `页面操作：在称重菜表单中填写 Tare 为 ${tare}`)
  async fillTare(tare: string): Promise<void> {
    const input = this.tareInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(tare);
  }

  @step('页面操作：在称重菜/详情菜表单中勾选 It has detail price(s)')
  async checkDetailPriceItem(): Promise<void> {
    const checkbox = this.detailPriceItemCheckbox();
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.click({ force: true });
    }
    await expect(checkbox).toBeChecked({ timeout: 5_000 });
  }

  @step('页面操作：确认 detail price 区域可见')
  async expectDetailPriceAreaVisible(): Promise<void> {
    await expect(this.addDetailPriceButton()).toBeVisible({ timeout: 15_000 });
    const firstRow = this.detailPriceRow(0);
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await expect(firstRow.getByRole('listbox').first()).toBeVisible({ timeout: 15_000 });
    await expect(firstRow.getByRole('listbox').nth(1)).toBeVisible({ timeout: 15_000 });
  }

  @step((rowIndex: number, itemPrice: string) => `页面操作：在 detail price 表单中填写第 ${rowIndex + 1} 行 Item Price 为 ${itemPrice}`)
  async fillDetailPriceItemPrice(rowIndex: number, itemPrice: string): Promise<void> {
    const input = this.detailPriceItemPriceInput(rowIndex);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(itemPrice);
  }

  @step((rowIndex: number, memberPrice: string) => `页面操作：在 detail price 表单中填写第 ${rowIndex + 1} 行 Member Price 为 ${memberPrice}`)
  async fillDetailPriceMemberPrice(rowIndex: number, memberPrice: string): Promise<void> {
    const input = this.detailPriceMemberPriceInput(rowIndex);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(memberPrice);
  }

  @step((rowIndex: number, typeName: string) => `页面操作：在 detail price 表单中选择第 ${rowIndex + 1} 行 Type 为 ${typeName}`)
  async selectDetailPriceType(rowIndex: number, typeName: string): Promise<void> {
    const trigger = this.detailPriceTypeListboxes(rowIndex).first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click({ force: true });
    const popup = await this.resolveListboxPopup(trigger);
    await this.clickVisibleOptionByText(typeName, popup ?? this.detailPriceRow(rowIndex));
  }

  @step((rowIndex: number) => `页面操作：在 detail price 表单中按顺序选择第 ${rowIndex + 1} 个 Size`)
  async selectDetailPriceSize(rowIndex: number): Promise<void> {
    const trigger = this.detailPriceSizeListboxes(rowIndex).nth(1);
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click({ force: true });
    const targetValue = String(61 + rowIndex);
    const option = trigger.locator(`li[role="option"][data-value="${targetValue}"]`).first();
    await waitUntil(
      async () => await option.count().catch(() => 0) > 0,
      (ready) => ready === true,
      {
        timeout: 10_000,
        interval: 200,
        message: `未在超时内见到 data-value=${targetValue} 的 Size 选项`,
      },
    );
    await option.evaluate((el) => (el as HTMLElement).click());
  }

  @step('页面操作：在 detail price 表单中点击 ADD DETAIL PRICE')
  async clickAddDetailPrice(): Promise<void> {
    const button = this.addDetailPriceButton();
    await expect(button).toBeVisible({ timeout: 15_000 });
    await button.click({ force: true });
  }

  @step('页面操作：确认普通菜表单中的 Apply category tax 默认选中')
  async expectApplyCategoryTaxSelected(): Promise<void> {
    const radio = this.applyCategoryTaxRadio();
    await expect(radio).toBeVisible({ timeout: 15_000 });
    await expect(radio).toBeChecked({ timeout: 5_000 });
  }

  @step('页面操作：点击普通菜表单右下角 SAVE')
  async clickSaveItemForm(): Promise<void> {
    const save = this.m().locator('contentinfo, footer').getByRole('button', { name: /^save$/i }).first();
    await expect(save).toBeVisible({ timeout: 15_000 });
    await save.scrollIntoViewIfNeeded().catch(() => {});
    await expect(save).toBeEnabled({ timeout: 10_000 });
    await save.click({ force: true });
  }

  /** Category Name 行：首个 `main` 内 textbox 序号常不是本字段，需用「Category Name」标签前一同级 input。 */
  private categoryNameRequiredInput(): Locator {
    return this.m()
      .getByText(/Category Name/i)
      .first()
      .locator('xpath=preceding-sibling::input[1] | preceding-sibling::textarea[1]');
  }

  /**
   * Category 编辑顶栏返回：与页面内 `document.evaluate("//span[contains(text(), 'keyboard_arrow_left')]", document, …)` 一致，在已绑定的菜单内容 Frame 内查找。
   */
  private categoryEditorBackArrowMaterialSpan(): Locator {
    return this.m().locator('xpath=//span[contains(text(), "keyboard_arrow_left")]');
  }

  @step((value: string) => `页面操作：填写 Category 四类名称均为「${value}」`)
  async fillCategoryNameFieldsAllSame(value: string): Promise<void> {
    const categoryNameInput = this.categoryNameRequiredInput();
    await expect(categoryNameInput).toBeVisible({ timeout: 15_000 });
    await categoryNameInput.fill(value);

    const boxes = this.m().getByRole('main').getByRole('textbox');
    for (let i = 1; i <= 3; i += 1) {
      const tb = boxes.nth(i);
      await expect(tb).toBeVisible({ timeout: 15_000 });
      await tb.fill(value);
    }
  }

  @step('页面操作：Category 表单-税率仅保留 tax10%(3%) 或 tax(3%)，取消其它已选税率项')
  async setCategoryTaxOnlyThreePercentOption(): Promise<void> {
    const root = this.m();
    const patternsToUncheckIfChecked = [
      /ERDAYEHJGJI/i,
      /\bYY\b/i,
      /Take out tax free/i,
    ];
    for (const re of patternsToUncheckIfChecked) {
      const cb = root.getByRole('checkbox', { name: re }).first();
      if (await cb.isVisible().catch(() => false) && (await cb.isChecked().catch(() => false))) {
        await cb.click({ force: true });
      }
    }
    const keep = root
      .getByRole('checkbox', { name: /^tax\s*\(\s*3\s*%\)/i })
      .or(root.getByRole('checkbox', { name: /tax10%\s*\(\s*3\s*%\)/i }))
      .first();
    await keep.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await keep.isChecked().catch(() => false))) {
      await keep.click({ force: true });
    }
  }

  @step('页面操作：点击 Category 表单右下角 SAVE')
  async clickSaveCategoryForm(): Promise<void> {
    const save = this.m().locator('contentinfo, footer').getByRole('button', { name: /^save$/i }).first();
    await expect(save).toBeVisible({ timeout: 15_000 });
    await save.scrollIntoViewIfNeeded().catch(() => {});
    await expect(save).toBeEnabled({ timeout: 10_000 });
    await save.click({ force: true });
  }

  @step('页面操作：若出现 Multiple taxes selected 确认弹窗则点击 Save（无弹窗则跳过）')
  async confirmMultipleTaxesSelectedDialogSaveIfVisible(): Promise<void> {
    const dlg = this.m()
      .locator('[role="dialog"], .mdc-dialog')
      .filter({ hasText: /Multiple taxes/i })
      .first();
    await waitUntil(async () => await dlg.isVisible().catch(() => false), (v) => v === true, {
      timeout: 1_200,
      interval: 150,
      message: '（占位，无多税弹窗时由后续断言处理保存结果）',
    }).catch(() => {});
    if (await dlg.isVisible().catch(() => false)) {
      await dlg.getByRole('button', { name: /^save$/i }).first().click();
    }
  }

  @step('页面操作：SAVE 后在菜单内容区内用 XPath 定位含 keyboard_arrow_left 的 span 并点击返回组列表')
  async clickBackToMenuGroupChevron(): Promise<void> {
    const snack = this.m().locator('.mdc-snackbar');
    if (await snack.isVisible().catch(() => false)) {
      await waitUntil(
        async () => !(await snack.isVisible().catch(() => false)),
        (v) => v === true,
        { timeout: 25_000, interval: 400, message: '保存提示 Snackbar 未在超时内收起，可能影响顶部返回点击' },
      );
    }

    const icon = this.categoryEditorBackArrowMaterialSpan().first();
    await expect(icon).toBeVisible({ timeout: 20_000 });
    await icon.scrollIntoViewIfNeeded().catch(() => {});
    await icon.click({ force: true });

    await waitUntil(
      async () => {
        const h = this.m().getByRole('heading').filter({ hasText: /Back to Menu Group/i }).first();
        return !(await h.isVisible().catch(() => false));
      },
      (v) => v === true,
      {
        timeout: 20_000,
        interval: 400,
        message: '点击返回后仍在 Category 编辑顶栏（Back to Menu Group 标题仍可见）',
      },
    );
  }

  @step((name: string) => `断言：菜单组列表视图下可见新建 Category「${name}」（链接或文案）`)
  async expectCategoryNameVisibleInMenuGroup(name: string): Promise<void> {
    const t = this.m().getByRole('link', { name, exact: true }).or(this.m().getByText(name, { exact: true })).first();
    await t.scrollIntoViewIfNeeded().catch(() => {});
    await expect(t).toBeVisible({ timeout: 30_000 });
  }
}
