import { expect } from '@playwright/test';
import { addSpecDish, addWeightedDish } from '../../flows/order-dishes.flow';
import { searchRecallOrders } from '../../flows/recall.flow';
import { startToGoOrder } from '../../flows/takeout.flow';
import { test } from '../../fixtures/test.fixture';
import { inventoryStockSmokeTestData } from '../../test-data/inventory-stock-smoke';
import { RecallManualSearchTags } from '../../test-data/recall-search-options';
import { prepareInventoryScenario } from './inventory-stock.shared';
import { waitUntil } from '../../utils/wait';

test.describe('库存冒烟', () => {
  test(
    '应能送厨后扣减库存、退菜后恢复初始数量',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-30808',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(180_000);

      const { orderDishesPage, inventoryPage } = await prepareInventoryScenario({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: inventoryStockSmokeTestData.employeePassword,
      });

      await test.step(`步骤1：将 ${inventoryStockSmokeTestData.regularDishName} 设为 Limited Stock 2`, async () => {
        await inventoryPage.selectCategoryTreeItem('全类型类');
        await inventoryPage.searchItem(inventoryStockSmokeTestData.regularDishName);
        await inventoryPage.setLimitedStock(
          inventoryStockSmokeTestData.regularDishName,
          inventoryStockSmokeTestData.limitedStockQuantity,
        );
      });

      const orderDishesAfterBack = await test.step('步骤2：返回主页壳再进入点餐页并送厨', async () => {
        await inventoryPage.backToOrderPage();
        const homeAfterBack = await orderDishesPage.returnToHomeShell();
        const toGoPage = await startToGoOrder(homeAfterBack);
        await toGoPage.openDishSearchPanel();
        await toGoPage.applyDishSearchKeyword(inventoryStockSmokeTestData.regularDishName);
        await toGoPage.expectDishSearchResultVisible(inventoryStockSmokeTestData.regularDishName);
        await toGoPage.clickDish(inventoryStockSmokeTestData.regularDishName);
        if (await toGoPage.isPriceDialogVisible()) {
          await toGoPage.enterPrice(10);
          await toGoPage.confirmPriceDialog();
        }
        await toGoPage.sendOrder();
        return toGoPage;
      });

      await test.step('步骤3：送厨后重新进入库存页并断言数量变为 1', async () => {
        const homeAfterSend = await orderDishesAfterBack.returnToHomeShell();
        await homeAfterSend.expectPrimaryFunctionCardsVisible();
        const toGoAfterSend = await startToGoOrder(homeAfterSend);
        const inventoryAfterSend = await toGoAfterSend.openInventoryPage();
        await inventoryAfterSend.searchItem(inventoryStockSmokeTestData.regularDishName);
        await waitUntil(
          async () => {
            try {
              return await inventoryAfterSend.readItemStockQuantity(inventoryStockSmokeTestData.regularDishName);
            } catch {
              return null;
            }
          },
          (quantity) => quantity === 1,
          {
            timeout: 45_000,
            interval: 500,
            message: '送厨后库存数量未变为 1',
          },
        );

        await inventoryAfterSend.backToHomeShell();
      });

      await test.step('步骤4：返回主页壳并进入 Recall 退菜', async () => {
        await homePage.expectPrimaryFunctionCardsVisible();
        const recallPage = await homePage.clickRecall();
        await recallPage.expectLoaded();

        const orderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
        await recallPage.openOrderDetails(orderNumbers[0]);
        await recallPage.startVoidAllCurrentOrder();
        await recallPage.fillVoidReason('Food Allergy');
        await recallPage.submitVoidReason();
        await recallPage.closeOrderDetailsDialog();
        await recallPage.exitRecallPage();
      });

      await test.step('步骤5：退菜后重新进入库存页并断言数量恢复为 2', async () => {
        await homePage.expectPrimaryFunctionCardsVisible();
        const toGoAgain = await startToGoOrder(homePage);
        const inventoryAfterVoid = await toGoAgain.openInventoryPage();
        await inventoryAfterVoid.searchItem(inventoryStockSmokeTestData.regularDishName);
        await waitUntil(
          async () => {
            try {
              return await inventoryAfterVoid.readItemStockQuantity(inventoryStockSmokeTestData.regularDishName);
            } catch {
              return null;
            }
          },
          (quantity) => quantity === inventoryStockSmokeTestData.limitedStockQuantity,
          {
            timeout: 45_000,
            interval: 500,
            message: '退菜后库存数量未恢复到初始设置值',
          },
        );
      });
    },
  );

  test(
    '应能在未送厨场景下加减菜后保持库存状态不变',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-30808',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(150_000);

      const { orderDishesPage, inventoryPage } = await prepareInventoryScenario({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: inventoryStockSmokeTestData.employeePassword,
      });

      await test.step(`前置：将 ${inventoryStockSmokeTestData.secondaryRegularDishName} 设为 Limited Stock 2`, async () => {
        await inventoryPage.searchItem(inventoryStockSmokeTestData.secondaryRegularDishName);
        await inventoryPage.setLimitedStock(
          inventoryStockSmokeTestData.secondaryRegularDishName,
          inventoryStockSmokeTestData.limitedStockQuantity,
        );
      });

      await test.step('步骤1：返回点餐页并在未送厨前加菜、减菜', async () => {
        await inventoryPage.backToOrderPage();
        await orderDishesPage.openDishSearchPanel();
        await orderDishesPage.applyDishSearchKeyword(inventoryStockSmokeTestData.secondaryRegularDishName);
        await orderDishesPage.expectDishSearchResultVisible(inventoryStockSmokeTestData.secondaryRegularDishName);
        await addWeightedDish(orderDishesPage, inventoryStockSmokeTestData.secondaryRegularDishName, 1, 1);
        await orderDishesPage.changeDishCount(2);
        await orderDishesPage.changeDishCount(1);
      });

      await test.step('步骤2：不送厨直接返回主页壳', async () => {
        await orderDishesPage.returnToHomeShell();
      });

      await test.step('断言：再次打开库存页后状态仍为 Limited Stock', async () => {
        const toGoAgain = await homePage.clickToGo();
        const inventoryAfterReturn = await toGoAgain.openInventoryPage();
        await inventoryAfterReturn.searchItem(inventoryStockSmokeTestData.secondaryRegularDishName);
        await expect(await inventoryAfterReturn.readItemStatus(inventoryStockSmokeTestData.secondaryRegularDishName)).toContain(
          `Stock: ${inventoryStockSmokeTestData.limitedStockQuantity}`,
        );
      });
    },
  );

  test(
    '应能输入小数数量并完成送厨后在 Recall 中读到对应数量',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-30808',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(180_000);

      const { orderDishesPage, inventoryPage } = await prepareInventoryScenario({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: inventoryStockSmokeTestData.employeePassword,
      });
      let createdOrderNumber = '';

      await test.step(`前置：将 ${inventoryStockSmokeTestData.decimalDishName} 设为 Limited Stock 10`, async () => {
        await inventoryPage.searchItem(inventoryStockSmokeTestData.decimalDishName);
        await inventoryPage.setLimitedStock(inventoryStockSmokeTestData.decimalDishName, 10);
      });

      await test.step('步骤1：返回点餐页并输入小数数量 3.44', async () => {
        await inventoryPage.backToOrderPage();
        await orderDishesPage.openDishSearchPanel();
        await orderDishesPage.applyDishSearchKeyword(inventoryStockSmokeTestData.decimalDishName);
        await orderDishesPage.expectDishSearchResultVisible(inventoryStockSmokeTestData.decimalDishName);
        await orderDishesPage.clickDish(inventoryStockSmokeTestData.decimalDishName);
        if (await orderDishesPage.isPriceDialogVisible()) {
          await orderDishesPage.enterPrice(10);
          await orderDishesPage.confirmPriceDialog();
        }
        await orderDishesPage.changeDishCount(inventoryStockSmokeTestData.decimalOrderQuantity);
      });

      await test.step('断言：购物车行数量可读到小数 3.44', async () => {
        await expect(await orderDishesPage.readCartDishQuantitySumFromLines()).toBeCloseTo(
          inventoryStockSmokeTestData.decimalOrderQuantity,
          2,
        );
      });

      const homeAfterSend = await test.step('步骤2：送厨后读取左上角订单号 chip 并返回主页壳', async () => {
        await orderDishesPage.sendOrder();
        createdOrderNumber = await orderDishesPage.readOrderNumberChipText();
        expect(createdOrderNumber).toBeTruthy();
        return await orderDishesPage.returnToHomeShell();
      });

      await test.step('步骤5：断言已回到主页壳', async () => {
        await homeAfterSend.expectPrimaryFunctionCardsVisible();
      });

      const recallPage = await test.step('步骤6：进入 Recall 并断言页面加载完成', async () => {
        const page = await homeAfterSend.clickRecall();
        await page.expectLoaded();
        return page;
      });

      await test.step('步骤7：按左上角订单号搜索 Recall 订单并断言搜索成功', async () => {
        expect(createdOrderNumber).toBeTruthy();
        await searchRecallOrders(recallPage, {
          clearFirst: false,
          manualSearch: {
            tag: RecallManualSearchTags.orderNumber,
            keyword: createdOrderNumber.replace(/^#/, ''),
          },
        });

        const filteredOrderNumbers = await waitUntil(
          async () => await recallPage.readVisibleOrderNumbers(),
          (orderNumbers) =>
            orderNumbers.length > 0 &&
            orderNumbers.every((orderNumber) => orderNumber === createdOrderNumber),
          {
            timeout: 10_000,
            message: `Recall 按订单号 ${createdOrderNumber} 搜索未成功`,
          },
        );

        expect(filteredOrderNumbers.length).toBeGreaterThan(0);
        expect(filteredOrderNumbers.every((orderNumber) => orderNumber === createdOrderNumber)).toBe(true);
      });

      await test.step('步骤8：校验订单明细数量', async () => {
        await recallPage.expectLoaded();
        const orderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({ timeout: 20_000 });
        await recallPage.openOrderDetails(orderNumbers[0]);
        const details = await recallPage.readOrderDetailsSnapshot();
        const decimalDishItem = details.items.find((item) =>
          item.name.toLowerCase().includes(inventoryStockSmokeTestData.decimalDishName.toLowerCase()),
        );
        expect(decimalDishItem).toBeTruthy();
        expect(
          decimalDishItem?.quantity,
        ).toBe('3.44');
        await recallPage.closeOrderDetailsDialog();
        await recallPage.exitRecallPage();
      });
    },
  );

  test(
    '应能在超出库存时保存并弹出库存警报',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-30808',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(150_000);

      const { orderDishesPage, inventoryPage } = await prepareInventoryScenario({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: inventoryStockSmokeTestData.employeePassword,
      });

      await test.step(`前置：将 ${inventoryStockSmokeTestData.overOrderDishName} 设为 Limited Stock 2`, async () => {
        await inventoryPage.searchItem(inventoryStockSmokeTestData.overOrderDishName);
        await inventoryPage.setLimitedStock(inventoryStockSmokeTestData.overOrderDishName, 2);
      });

      await test.step(`步骤1：返回点餐页并点选 ${inventoryStockSmokeTestData.overOrderDishName}，数量改为 3`, async () => {
        await inventoryPage.backToOrderPage();
        await orderDishesPage.openDishSearchPanel();
        await orderDishesPage.applyDishSearchKeyword(inventoryStockSmokeTestData.overOrderDishName);
        await orderDishesPage.expectDishSearchResultVisible(inventoryStockSmokeTestData.overOrderDishName);
        await addSpecDish(
          orderDishesPage,
          inventoryStockSmokeTestData.overOrderDishName,
          ['Small'],
          1,
        );
        await orderDishesPage.changeDishCount(inventoryStockSmokeTestData.overOrderQuantity);
      });

      await test.step('步骤2：点击保存订单按钮并等待库存警报', async () => {
        await orderDishesPage.clickSaveOrderButton();
        await orderDishesPage.expectInventoryAlertContainsDish(inventoryStockSmokeTestData.overOrderDishName);
        await orderDishesPage.dismissInventoryAlertDialogIfPresent();
      });
    },
  );
});
