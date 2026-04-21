import { expect } from '@playwright/test';
import { searchRecallOrders } from '../../flows/recall.flow';
import { test } from '../../fixtures/test.fixture';
import { RecallManualSearchTags } from '../../test-data/recall-search-options';
import {
  createPaidDineInSpecOrder,
  mapRecallOrderTypeToFilterValue,
  mapRecallPaymentMethodToFilterValue,
} from './pos-business.shared';

test.describe('【Recall-业务冒烟】', () => {
  test(
    '应能按支付状态筛选 Recall 订单',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const createdOrder = await createPaidDineInSpecOrder({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const recallPage = await createdOrder.homePage.clickRecall();
      await recallPage.expectLoaded();

      await searchRecallOrders(recallPage, {
        paymentStatus: 'Paid',
      });

      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
      await recallPage.openOrderDetails(visibleOrderNumbers[0]);
      const details = await recallPage.readOrderDetailsSnapshot();
      expect(details.paymentStatus).toBe('Paid');
      await recallPage.closeOrderDetailsDialog();
    },
  );

  test(
    '应能按订单类型筛选 Recall 订单',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const createdOrder = await createPaidDineInSpecOrder({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const recallPage = await createdOrder.homePage.clickRecall();
      await recallPage.expectLoaded();

      const orderType = mapRecallOrderTypeToFilterValue('Dine In');
      await searchRecallOrders(recallPage, {
        orderType,
      });

      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
      await recallPage.openOrderDetails(visibleOrderNumbers[0]);
      const details = await recallPage.readOrderDetailsSnapshot();
      expect(details.orderContext.orderType).toBe('Dine In');
      await recallPage.closeOrderDetailsDialog();
    },
  );

  test(
    '应能按支付方式筛选 Recall 订单',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const createdOrder = await createPaidDineInSpecOrder({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const recallPage = await createdOrder.homePage.clickRecall();
      await recallPage.expectLoaded();

      const paymentType = mapRecallPaymentMethodToFilterValue('Cash');
      await searchRecallOrders(recallPage, {
        paymentType,
      });

      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
      await recallPage.openOrderDetails(visibleOrderNumbers[0]);
      const details = await recallPage.readOrderDetailsSnapshot();
      expect(details.payments[0]?.method).toBe('Cash');
      await recallPage.closeOrderDetailsDialog();
    },
  );

  test(
    '应能按桌号搜索 Recall 订单',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const createdOrder = await createPaidDineInSpecOrder({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const recallPage = await createdOrder.homePage.clickRecall();
      await recallPage.expectLoaded();

      await searchRecallOrders(recallPage, {
        manualSearch: {
          tag: RecallManualSearchTags.tableName,
          keyword: createdOrder.tableNumber,
        },
      });

      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
      await recallPage.openOrderDetails(visibleOrderNumbers[0]);
      const details = await recallPage.readOrderDetailsSnapshot();
      expect(details.orderContext.tableName).toBe(createdOrder.tableNumber);
      await recallPage.closeOrderDetailsDialog();
    },
  );

  test(
    '应能按菜品名搜索 Recall 订单',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const createdOrder = await createPaidDineInSpecOrder({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const recallPage = await createdOrder.homePage.clickRecall();
      await recallPage.expectLoaded();

      await searchRecallOrders(recallPage, {
        manualSearch: {
          tag: RecallManualSearchTags.itemName,
          keyword: createdOrder.dishName,
        },
      });

      const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
      await recallPage.openOrderDetails(visibleOrderNumbers[0]);
      const details = await recallPage.readOrderDetailsSnapshot();
      expect(details.items.some((item) => item.name === createdOrder.dishName)).toBe(true);
      await recallPage.closeOrderDetailsDialog();
    },
  );
});
