import { expect, type Page } from '@playwright/test';
import { OrderDishesPage } from './order-dishes.page';
import { step } from '../utils/step';

export class GuestCountDialogPage {
  constructor(private readonly page: Page) {}

  @step('页面操作：确认人数选择弹窗已经显示')
  async expectVisible(): Promise<void> {
    await expect(this.page.getByRole('dialog', { name: 'Guest Count' })).toBeVisible();
    await expect(this.page.getByText('Please choose the guest number of this order.')).toBeVisible();
  }

  @step((guestCount: number) => `页面操作：在人数弹窗中选择 ${guestCount} 位客人并进入点餐页`)
  async selectGuestCount(guestCount: number): Promise<OrderDishesPage> {
    await this.expectVisible();
    const dialog = this.page.getByRole('dialog', { name: 'Guest Count' });
    await dialog.getByRole('button', { name: String(guestCount), exact: true }).click();
    return new OrderDishesPage(this.page);
  }
}
