import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '../utils/step';
import { waitUntil } from '../utils/wait';

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 首页顶栏消息（铃铛）打开后的消息中心及新建公告相关 UI。
 * - 消息列表工具条（Create / Refresh / Close）在 `#newLoginContainer` 内。
 * - 「New Announcement」表单与 Send 常在容器外同级浮层，使用 `page` 级定位并收窄到含主题输入框的面板。
 */
export class HomeMessagesPage {
  private readonly shellRoot: Locator;

  constructor(private readonly page: Page) {
    this.shellRoot = this.page.locator('#newLoginContainer');
  }

  /** 新建公告整块面板：须同时含标题与主题框，避免 `has: textbox` 只命中内层 Subject 行而漏掉 Send 行 */
  private resolveNewAnnouncementPanel(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(/^(New Announcement|新建公告)$/i) })
      .filter({ has: this.page.getByRole('textbox', { name: /Please add subject here|主题|Subject/i }) })
      .first();
  }

  private resolveToolbarCreate(): Locator {
    return this.shellRoot
      .getByText('Create', { exact: true })
      .or(this.shellRoot.getByText('新建', { exact: true }))
      .or(this.shellRoot.getByRole('button', { name: /Create|新建/i }))
      .first();
  }

  private resolveToolbarRefresh(): Locator {
    return this.shellRoot
      .getByText('Refresh', { exact: true })
      .or(this.shellRoot.getByText('刷新', { exact: true }))
      .or(this.shellRoot.getByRole('button', { name: /Refresh|刷新/i }))
      .first();
  }

  private resolveToolbarClose(): Locator {
    return this.shellRoot
      .locator('[cursor=pointer]')
      .filter({ hasText: /^(Close|关闭)$/i })
      .or(this.shellRoot.getByText(/Close|关闭/i))
      .or(this.shellRoot.getByRole('button', { name: /Close|关闭/i }))
      .first();
  }

  private resolveAnnouncementSubjectInput(): Locator {
    return this.resolveNewAnnouncementPanel()
      .getByRole('textbox', { name: /Please add subject here|主题|标题|Subject|Title/i })
      .or(this.page.getByRole('textbox', { name: /Please add subject here|主题|标题|Subject|Title/i }))
      .first();
  }

  private resolveAnnouncementBodyInput(): Locator {
    return this.resolveNewAnnouncementPanel()
      .getByRole('textbox', { name: /Please add notes here|内容|正文|公告|Content|Body|Announcement/i })
      .or(this.page.getByRole('textbox', { name: /Please add notes here|内容|正文|公告|Content|Body|Announcement/i }))
      .or(this.resolveNewAnnouncementPanel().locator('textarea'))
      .first();
  }

  private resolveSendAnnouncementButton(): Locator {
    return this.resolveNewAnnouncementPanel()
      .getByText(/^Send$/i)
      .or(this.resolveNewAnnouncementPanel().getByText(/^发送$/))
      .or(this.resolveNewAnnouncementPanel().getByRole('button', { name: /^(发送|Send|Submit|发布)/i }))
      .first();
  }

  @step('页面操作：确认消息页工具区可见「新建」「刷新」「关闭」')
  async expectMessageToolbarActionsVisible(): Promise<void> {
    await expect(this.resolveToolbarCreate()).toBeVisible({ timeout: 15_000 });
    await expect(this.resolveToolbarRefresh()).toBeVisible({ timeout: 5_000 });
    await expect(this.resolveToolbarClose()).toBeVisible({ timeout: 15_000 });
  }

  @step('页面操作：在消息页点击新建公告')
  async clickNewAnnouncement(): Promise<void> {
    const create = this.resolveToolbarCreate();
    await expect(create).toBeVisible({ timeout: 15_000 });
    await create.click();
  }

  @step((subject: string) => `页面操作：填写公告主题 ${subject}`)
  async fillAnnouncementSubject(subject: string): Promise<void> {
    const input = this.resolveAnnouncementSubjectInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(subject);
  }

  @step('页面操作：填写公告正文')
  async fillAnnouncementBody(body: string): Promise<void> {
    const input = this.resolveAnnouncementBodyInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(body);
  }

  @step('页面操作：点击发送公告')
  async clickSendAnnouncement(): Promise<void> {
    const send = this.resolveSendAnnouncementButton();
    await expect(send).toBeVisible({ timeout: 15_000 });
    await send.click();
  }

  @step('页面操作：确认出现公告发送成功类提示（新消息到来或消息已修改等）')
  async expectAnnouncementSuccessFeedbackVisible(): Promise<void> {
    const hint = this.page.getByText(
      /有新消息到来|消息已经被修改|发送成功|公告已|保存成功|成功|New message|updated|Announcement/i,
    );
    await waitUntil(
      async () => hint.first().isVisible().catch(() => false),
      (ok) => ok,
      {
        timeout: 20_000,
        interval: 350,
        message: '发送公告后未在预期时间内出现成功类提示文案',
      },
    );
    await expect(hint.first()).toBeVisible({ timeout: 5_000 });
  }

  @step('页面操作：点击消息页工具栏右上角关闭')
  async clickMessageToolbarClose(): Promise<void> {
    const close = this.resolveToolbarClose();
    await expect(close).toBeVisible({ timeout: 15_000 });
    await close.click();
  }

  @step('页面操作：确认消息浮层已关闭')
  async expectMessagePanelClosed(): Promise<void> {
    await waitUntil(
      async () => !(await this.resolveToolbarCreate().isVisible().catch(() => false)),
      (gone) => gone === true,
      {
        timeout: 15_000,
        interval: 250,
        message: '点击关闭后消息页仍呈打开状态（「新建」仍可见）',
      },
    );
  }

  @step('页面操作：在消息列表中点击与创建时一致的公告主题或正文')
  async clickMessageListItemBySubjectOrBody(subject: string, body: string): Promise<void> {
    await waitUntil(
      async () =>
        (await this.shellRoot.getByText(subject, { exact: true }).count()) > 0 ||
        (await this.shellRoot.getByText(body, { exact: true }).count()) > 0,
      (ok) => ok,
      {
        timeout: 15_000,
        interval: 400,
        message: '消息列表中未在预期时间内出现与创建时完全一致的公告主题或正文',
      },
    );
    if ((await this.shellRoot.getByText(subject, { exact: true }).count()) > 0) {
      await this.shellRoot.getByText(subject, { exact: true }).first().click();
      return;
    }
    await this.shellRoot.getByText(body, { exact: true }).first().click();
  }

  @step('页面操作：确认当前界面展示的公告主题与正文与预期一致')
  async expectAnnouncementDetailShowsSubjectAndBody(subject: string, body: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(escapeForRegex(subject), 'i')).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByText(new RegExp(escapeForRegex(body), 'i')).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  @step('页面操作：点击消息列表右下角 Clear All')
  async clickClearAllInMessageList(): Promise<void> {
    const clear = this.shellRoot
      .getByText(/^Clear All$/i)
      .or(this.shellRoot.getByText(/全部清除|清空全部/))
      .first();
    await expect(clear).toBeVisible({ timeout: 15_000 });
    await clear.click();

    const confirm = this.page.getByRole('button', { name: /^(Confirm|确认|OK|确定)$/i });
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    }
  }

  @step((snippet: string) => `页面操作：确认消息列表中不再出现主题「${snippet.slice(0, 40)}」`)
  async expectMessageListDoesNotShowAnnouncementSubject(snippet: string): Promise<void> {
    await waitUntil(
      async () => (await this.shellRoot.getByText(snippet, { exact: true }).count()) === 0,
      (ok) => ok,
      {
        timeout: 15_000,
        interval: 350,
        message: '点击 Clear All 后列表仍出现该条公告主题',
      },
    );
    await expect(this.shellRoot.getByText(snippet, { exact: true })).toHaveCount(0);
  }
}
