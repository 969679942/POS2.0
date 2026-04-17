import { OrderDishesPage } from '../pages/order-dishes.page';
import { step } from '../utils/step';

export class DineInSpecDishCashPayFlow {
  @step(
    '业务步骤：支付步骤5-点 Balance due 区 Cash 单选项、点同额快捷金额按钮、点 Skip membership（#myalertno）、断言 Amount tendered',
  )
  async applyCashLineAndMatchingKeypadAmount(orderDishesPage: OrderDishesPage): Promise<void> {
    const cashAmountText = await orderDishesPage.clickCashPayOptionRow();
    await orderDishesPage.tapKeypadQuickPayAmountIfPresent(cashAmountText);
    await orderDishesPage.dismissMembershipJoinPromptIfPresent();
    await orderDishesPage.expectPaymentAmountTenderedContains(cashAmountText);
  }

  @step(
    '业务步骤：点 Pay →步骤5→步骤6（Cash 主按钮）→按需再关入会→成功页无需小票/Continue→离开点单页',
  )
  async payWithCashSkipMembershipAndNoReceipt(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.clickPay();
    await this.applyCashLineAndMatchingKeypadAmount(orderDishesPage);
    await orderDishesPage.confirmCashTenderInPaymentFrame();
    await orderDishesPage.dismissMembershipJoinPromptIfPresent();
    await orderDishesPage.expectCashPaidSuccessWithNoReceiptOffered();
    await orderDishesPage.clickNoReceipt();
    await orderDishesPage.expectNavigatedAwayFromOrderDishes();
  }
}

export async function payWithCashSkipMembershipAndNoReceipt(
  orderDishesPage: OrderDishesPage,
): Promise<void> {
  const flow = new DineInSpecDishCashPayFlow();
  await flow.payWithCashSkipMembershipAndNoReceipt(orderDishesPage);
}
