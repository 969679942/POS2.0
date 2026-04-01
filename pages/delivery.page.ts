import { expect, type Locator, type Page } from '@playwright/test';
import { OrderDishesPage } from './order-dishes.page';
import { step } from '../utils/step';

export class DeliveryPage {
  private readonly appFrame: ReturnType<Page['frameLocator']>;
  private readonly phoneNumberInput: Locator;
  private readonly customerNameInput: Locator;
  private readonly addressInput: Locator;
  private readonly streetInput: Locator;
  private readonly zipCodeInput: Locator;
  private readonly noteInput: Locator;
  private readonly startOrderButton: Locator;
  private readonly keyboardCloseButton: Locator;

  constructor(private readonly page: Page) {
    this.appFrame = this.page.frameLocator('#newLoginContainer iframe');
    this.phoneNumberInput = this.appFrame.getByPlaceholder('Phone number');
    this.customerNameInput = this.appFrame.getByPlaceholder('Name');
    this.addressInput = this.appFrame.getByTestId('pos-ui-autocomplete-input');
    this.streetInput = this.appFrame.getByPlaceholder('Apt');
    this.zipCodeInput = this.appFrame.getByPlaceholder('ZIP Code');
    this.noteInput = this.appFrame.getByPlaceholder('Note');
    this.startOrderButton = this.appFrame
      .getByTestId('button-default')
      .filter({ hasText: 'Start Order' })
      .first();
    this.keyboardCloseButton = this.appFrame.getByTestId('pos-keyboard-button-{close}');
  }

  @step('页面操作：确认 Delivery 信息页已经显示')
  async expectVisible(): Promise<void> {
    await expect(this.phoneNumberInput).toBeVisible();
    await expect(this.customerNameInput).toBeVisible();
    await expect(this.addressInput).toBeVisible();
    await expect(this.streetInput).toBeVisible();
    await expect(this.zipCodeInput).toBeVisible();
    await expect(this.noteInput).toBeVisible();
    await expect(this.startOrderButton).toBeVisible();
  }

  @step((phoneNumber: string) => `页面操作：在 Delivery 页面填写手机号 ${phoneNumber}`)
  async fillPhoneNumber(phoneNumber: string): Promise<void> {
    await this.phoneNumberInput.fill(phoneNumber);
  }

  @step((customerName: string) => `页面操作：在 Delivery 页面填写姓名 ${customerName}`)
  async fillCustomerName(customerName: string): Promise<void> {
    await this.customerNameInput.fill(customerName);
  }

  @step((address: string) => `页面操作：在 Delivery 页面填写地址 ${address}`)
  async fillAddress(address: string): Promise<void> {
    await this.addressInput.fill(address);
  }

  @step((street: string) => `页面操作：在 Delivery 页面填写街道 ${street}`)
  async fillStreet(street: string): Promise<void> {
    await this.streetInput.fill(street);
  }

  @step((zipCode: string) => `页面操作：在 Delivery 页面填写邮编 ${zipCode}`)
  async fillZipCode(zipCode: string): Promise<void> {
    await this.zipCodeInput.fill(zipCode);
  }

  @step((note: string) => `页面操作：在 Delivery 页面填写备注 ${note}`)
  async fillNote(note: string): Promise<void> {
    await this.noteInput.fill(note);
  }

  @step('页面操作：在 Delivery 页面点击 Start Order 并进入点单页')
  async clickStartOrder(): Promise<OrderDishesPage> {
    await this.closeKeyboardIfVisible();
    await this.startOrderButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
    return new OrderDishesPage(this.page);
  }

  @step('页面操作：如键盘处于展开状态则关闭 Delivery 页面键盘')
  private async closeKeyboardIfVisible(): Promise<void> {
    if (!(await this.keyboardCloseButton.isVisible().catch(() => false))) {
      return;
    }

    await this.keyboardCloseButton.evaluate((buttonElement) => {
      (buttonElement as HTMLElement).click();
    });
  }
}
