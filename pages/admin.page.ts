import { expect, type Frame, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { step } from '../utils/step';
import { waitUntil } from '../utils/wait';

/**
 * Admin 后台：侧栏在顶层 `page`；菜单编辑区可能在 `kpos/menu/...` 子 Frame，或与壳同文档。
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
  private async bindMenuContentFrame(options?: { timeout?: number }): Promise<void> {
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
        interval: 400,
        message:
          '未解析到菜单内容：在 iframe#innerpage、kpos/menu 子 frame、主文档与其它 iframe 内均未在超时内见到 CREATE NEW 或 Create New Group',
      },
    );
  }

  @step('页面操作：等待 Admin 后台壳出现（侧栏可见 Restaurant）')
  async expectAdminMenuShellReady(): Promise<void> {
    await waitUntil(
      async () =>
        await this.page.getByText('Restaurant', { exact: true }).first().isVisible().catch(() => false),
      (ok) => ok === true,
      {
        timeout: 60_000,
        interval: 400,
        message: '未在超时内进入 Admin 壳（未见 Restaurant）',
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

  /** 侧栏「Menu」文案：产品固定 id `admstMenutxt`（不绑死 class，避免样式类变更后点不到） */
  private sidebarMenuById(): Locator {
    return this.page.locator('#admstMenutxt');
  }

  @step('断言1：步骤2-侧栏可见 Menu（#admstMenutxt 或 menu_book 行），内容区可见 CREATE NEW 与 Create New Group')
  async expectMenuNavAndCreateNewGroupEntryVisible(): Promise<void> {
    const byId = this.sidebarMenuById();
    const byIconRow = this.page.getByText('menu_book', { exact: true }).locator('..');
    await expect(byId.or(byIconRow).first()).toBeVisible({ timeout: 20_000 });
    if (await byId.isVisible().catch(() => false)) {
      await expect(byId).toContainText('Menu', { timeout: 5_000 });
    }
    await expect(this.m().getByText(/CREATE\s*NEW/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.m().getByText('Create New Group', { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  @step('页面操作：步骤2-点击侧栏进入菜单管理（优先 #admstMenutxt；再 menu_book 父级整行；绑定失败会重试一次点击）')
  async clickMenuNav(): Promise<void> {
    const byId = this.sidebarMenuById().first();
    const menuRow = this.page.getByText('menu_book', { exact: true }).locator('..');

    const tryClick = async (loc: Locator) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 10_000, force: true }).catch(async () => {
        await loc.evaluate((el) => {
          (el as HTMLElement).click();
        });
      });
    };

    const performMenuEntryClick = async () => {
      if ((await byId.count()) > 0) {
        await tryClick(byId);
        return;
      }
      if (await menuRow.isVisible().catch(() => false)) {
        await tryClick(menuRow);
        return;
      }
      await expect(byId.or(menuRow).first()).toBeVisible({ timeout: 25_000 });
      if ((await byId.count()) > 0) {
        await tryClick(byId);
      } else {
        await tryClick(menuRow);
      }
    };

    await performMenuEntryClick();
    try {
      await this.bindMenuContentFrame({ timeout: 45_000 });
    } catch {
      await performMenuEntryClick();
      await this.bindMenuContentFrame({ timeout: 75_000 });
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
    const timeout = options?.timeout ?? 60_000;
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

  /** Category Name 行：首个 `main` 内 textbox 序号常不是本字段，需用「Category Name」标签前一同级 input。 */
  private categoryNameRequiredInput(): Locator {
    return this.m()
      .getByText(/Category Name/i)
      .first()
      .locator('xpath=preceding-sibling::input[1] | preceding-sibling::textarea[1]');
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
      timeout: 12_000,
      interval: 250,
      message: '（占位，无多税弹窗时由后续断言处理保存结果）',
    }).catch(() => {});
    if (await dlg.isVisible().catch(() => false)) {
      await dlg.getByRole('button', { name: /^save$/i }).first().click();
    }
  }

  @step('页面操作：点击顶部 Back to Menu Group 左侧返回箭头（keyboard_arrow_left）回到组内列表')
  async clickBackToMenuGroupChevron(): Promise<void> {
    const snack = this.m().locator('.mdc-snackbar');
    if (await snack.isVisible().catch(() => false)) {
      await waitUntil(
        async () => !(await snack.isVisible().catch(() => false)),
        (v) => v === true,
        { timeout: 25_000, interval: 400, message: '保存提示 Snackbar 未在超时内收起，可能影响顶部返回点击' },
      );
    }

    const heading = this.m().getByRole('heading').filter({ hasText: /Back to Menu Group/i }).first();
    await expect(heading).toBeVisible({ timeout: 20_000 });
    const icon = heading
      .locator('span.material-icons, span.mdc-icon--material, .mdc-icon--material')
      .filter({ hasText: 'keyboard_arrow_left' })
      .first();
    await expect(icon).toBeVisible({ timeout: 15_000 });
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
