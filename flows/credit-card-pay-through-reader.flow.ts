import { OrderDishesPage } from '../pages/order-dishes.page';
import { step } from '../utils/step';

/** 点单页支付弹窗内：Pay → Credit Card 读卡 → 小费/签名（若需）→ 成功页 Balance due（与堂食/To Go/Delivery 渠道无关，共用同一套 UI） */
export class CreditCardPayThroughReaderFlow {
  @step('业务步骤：步骤4-点击左下角 Pay 打开支付界面')
  async stepClickPay(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.clickPay();
  }

  @step(
    '业务步骤：步骤5-若有 Customer joining membership 则 Skip membership，或 Escape/点 Payment 旁空白去除条幅',
  )
  async stepDismissMembershipJoinIfPresent(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.dismissMembershipJoinPromptIfPresent();
  }

  @step('断言7：步骤5-点击 Skip 或点遮罩/空白直至入会提示消失')
  async stepAssertMembershipJoinSkippedOrAbsent(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.assert7DismissCustomerJoiningMembershipBySkipOrBlank();
  }

  @step('业务步骤：步骤5-在支付页点击 Credit Card')
  async stepClickCreditCardPay(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.clickCreditCardPayOption();
  }

  @step('业务步骤：步骤5-关闭入会条幅（若需）并断言已跳过，再点击 Credit Card（聚合）')
  async stepSkipMembershipIfPresentThenCreditCard(orderDishesPage: OrderDishesPage): Promise<void> {
    await this.stepDismissMembershipJoinIfPresent(orderDishesPage);
    await this.stepAssertMembershipJoinSkippedOrAbsent(orderDishesPage);
    await this.stepClickCreditCardPay(orderDishesPage);
  }

  @step(
    '断言9：步骤6-弹窗页面含 Card reader ready 与 Waiting for customer payment（或等价读卡等待态）',
  )
  async stepExpectCardReaderWaiting(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.expectCardReaderPendingMessagesVisible();
  }

  @step('业务步骤：步骤7-若有 Waiting for customer tips 则点击 No Tips')
  async stepDismissCustomerTipsIfPresent(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.dismissCustomerTipsIfPresent();
  }

  @step('业务步骤：步骤7-若有 Waiting for customer signature 则点击 No Signature')
  async stepDismissCustomerSignatureIfPresent(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.dismissCardSignatureIfPresent();
  }

  @step('断言8：步骤7-不应仍存在未处理的顾客签名等待（用例模板曾误写为步骤6）')
  async stepAssertCustomerSignatureNotPending(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.expectCustomerSignatureWaitingNotVisible();
  }

  @step('断言10：步骤8-弹窗页面含 √ 与 Balance due 应付金额')
  async stepExpectCreditPaidSuccessWithBalanceDue(
    orderDishesPage: OrderDishesPage,
    expectedTotalCardUsd: string,
  ): Promise<void> {
    await orderDishesPage.expectCreditCardPaidSuccessWithBalanceDueVisible(expectedTotalCardUsd);
  }

  @step('业务步骤：步骤7～8-处理小费/签名（若需）并断言10-确认支付成功页 Balance due')
  async stepExpectCreditPaidSuccess(
    orderDishesPage: OrderDishesPage,
    expectedTotalCardUsd: string,
  ): Promise<void> {
    await orderDishesPage.dismissMembershipJoinPromptIfPresent();
    await this.stepDismissCustomerTipsIfPresent(orderDishesPage);
    await this.stepDismissCustomerSignatureIfPresent(orderDishesPage);
    await this.stepAssertCustomerSignatureNotPending(orderDishesPage);
    await this.stepExpectCreditPaidSuccessWithBalanceDue(orderDishesPage, expectedTotalCardUsd);
  }

  @step(
    '业务步骤：点单页-信用卡读卡支付完整流程（Pay → Skip membership 若需 → Credit Card → 读卡 → No Tips/签名若需 → 成功）',
  )
  async payWithCreditCardThroughReader(
    orderDishesPage: OrderDishesPage,
    expectedTotalCardUsd: string,
  ): Promise<void> {
    await this.stepClickPay(orderDishesPage);
    await this.stepSkipMembershipIfPresentThenCreditCard(orderDishesPage);
    await this.stepExpectCardReaderWaiting(orderDishesPage);
    await this.stepExpectCreditPaidSuccess(orderDishesPage, expectedTotalCardUsd);
  }
}

export async function payWithCreditCardThroughReader(
  orderDishesPage: OrderDishesPage,
  expectedTotalCardUsd: string,
): Promise<void> {
  const flow = new CreditCardPayThroughReaderFlow();
  await flow.payWithCreditCardThroughReader(orderDishesPage, expectedTotalCardUsd);
}
