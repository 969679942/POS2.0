import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '../utils/step';

export class EmployeeLoginPage {
  private readonly appFrame: ReturnType<Page['frameLocator']>;
  private readonly passcodeHeading: Locator;
  private readonly passcodeInput: Locator;
  private readonly confirmButton: Locator;

  constructor(page: Page) {
    this.appFrame = page.frameLocator('#newLoginContainer iframe');
    this.passcodeHeading = this.appFrame.getByRole('heading', {
      name: /Enter Your Passcode|Enter your passcode/,
    });
    this.passcodeInput = this.appFrame.getByRole('textbox', {
      name: /Enter Your Passcode|Enter your passcode/,
    });
    this.confirmButton = this.appFrame.getByRole('button', { name: 'confirm' });
  }

  @step('页面操作：判断员工口令登录区域当前是否可见')
  async isVisible(): Promise<boolean> {
    return await this.passcodeInput.isVisible().catch(() => false);
  }

  @step('页面操作：确认员工口令登录区域已经显示')
  async expectVisible(): Promise<void> {
    await expect(this.passcodeHeading).toBeVisible();
    await expect(this.passcodeInput).toBeVisible();
    await expect(this.confirmButton).toBeVisible();
  }

  @step((password: string) => `页面操作：在员工口令输入框中填写密码 ${password}`)
  async fillPassword(password: string): Promise<void> {
    await this.passcodeInput.fill(password);
  }

  @step('页面操作：提交员工口令')
  async clickConfirm(): Promise<void> {
    await this.confirmButton.evaluate((button) => {
      (button as HTMLElement).click();
    });
  }

  @step('页面操作：确认员工口令提交后登录界面已关闭')
  async expectPasscodeDismissedAfterLogin(): Promise<void> {
    await expect(this.passcodeHeading).toBeHidden({ timeout: 25_000 });
  }
}
