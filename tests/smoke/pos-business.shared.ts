import { payWithCashSkipMembershipAndNoReceipt } from '../../flows/dine-in-spec-dish-cash-pay.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { addSpecDish } from '../../flows/order-dishes.flow';
import { viewRecallOrderDetails } from '../../flows/recall.flow';
import { selectAnyAvailableTable, selectRandomGuestCountAndEnterOrderDishes } from '../../flows/select-table.flow';
import type { EmployeeLoginPage } from '../../pages/employee-login.page';
import type { HomePage } from '../../pages/home.page';
import type { LicenseSelectionPage } from '../../pages/license-selection.page';
import type { RecallOrderDetails, RecallPage } from '../../pages/recall.page';
import { dineInSpecDishCashSmokeTestData } from '../../test-data/dine-in-spec-dish-smoke';
import { waitUntil } from '../../utils/wait';

export type PosSmokeLoginOptions = {
  homePage: HomePage;
  licenseSelectionPage: LicenseSelectionPage;
  employeeLoginPage: EmployeeLoginPage;
  employeePassword: string;
};

export async function ensureLoggedInHomePage(options: PosSmokeLoginOptions): Promise<HomePage> {
  await openHome(options.homePage);

  if (await options.licenseSelectionPage.isVisible(10_000)) {
    await enterWithAvailableLicense(options.licenseSelectionPage, options.homePage);
  }

  const passcodeAppeared = await waitUntil(
    async () => await options.employeeLoginPage.isVisible(),
    (visible) => visible === true,
    {
      timeout: 3_000,
      interval: 200,
      message: '回到首页后未在短时间内确认员工口令页是否出现',
    },
  ).catch(() => false);

  if (passcodeAppeared) {
    return await enterWithEmployeePassword(
      options.employeeLoginPage,
      options.homePage,
      options.employeePassword,
    );
  }

  await options.homePage.expectEmployeeReady();
  return options.homePage;
}

export type RecallOrderDetailsMatch = {
  recallPage: RecallPage;
  orderNumber: string;
  details: RecallOrderDetails;
};

export type PreparedPaidDineInOrder = {
  homePage: HomePage;
  tableNumber: string;
  guestCount: number;
  dishName: string;
};

export async function openRecallAndReadMatchingOrderDetails(
  options: PosSmokeLoginOptions,
  predicate: (details: RecallOrderDetails) => boolean,
  message: string,
): Promise<RecallOrderDetailsMatch> {
  const homePage = await ensureLoggedInHomePage(options);
  const recallPage = await homePage.clickRecall();
  await recallPage.expectLoaded();

  const visibleOrderNumbers = await recallPage.readVisibleOrderNumbersWhenNonEmpty({
    timeout: 30_000,
  });

  for (const badge of visibleOrderNumbers.slice(0, 12)) {
    const orderNumber = badge.replace(/^#/, '');
    const details = await viewRecallOrderDetails(recallPage, orderNumber);
    if (predicate(details)) {
      return {
        recallPage,
        orderNumber: `#${orderNumber}`,
        details,
      };
    }
  }

  throw new Error(message);
}

export async function createPaidDineInSpecOrder(
  options: PosSmokeLoginOptions,
): Promise<PreparedPaidDineInOrder> {
  const homePage = await ensureLoggedInHomePage(options);
  await homePage.expectPrimaryFunctionCardsVisible();

  const selectTablePage = await homePage.clickDineIn();
  await selectTablePage.expectLoaded();

  const { guestCountDialogPage, selectedTable } = await selectAnyAvailableTable(selectTablePage);
  const { orderDishesPage, guestCount } = await selectRandomGuestCountAndEnterOrderDishes(
    guestCountDialogPage,
    1,
    14,
  );

  await orderDishesPage.openDishSearchPanel();
  await orderDishesPage.applyDishSearchKeyword(dineInSpecDishCashSmokeTestData.specDishSearchKeyword);
  await orderDishesPage.expectDishSearchResultVisible(
    dineInSpecDishCashSmokeTestData.specDishSearchKeyword,
  );

  await addSpecDish(
    orderDishesPage,
    dineInSpecDishCashSmokeTestData.specDishSearchKeyword,
    [dineInSpecDishCashSmokeTestData.specSizeLabels[0]],
    1,
  );

  await payWithCashSkipMembershipAndNoReceipt(orderDishesPage);

  return {
    homePage,
    tableNumber: selectedTable.tableNumber,
    guestCount,
    dishName: dineInSpecDishCashSmokeTestData.specDishSearchKeyword,
  };
}

export function mapRecallOrderTypeToFilterValue(orderType: string): string {
  const normalized = orderType.replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalized === 'dine in' || normalized === 'dine-in') {
    return 'Dine-in';
  }
  if (normalized === 'delivery') {
    return 'Delivery';
  }
  if (normalized === 'pick up' || normalized === 'pickup' || normalized === 'take out' || normalized === 'to go') {
    return 'Pickup';
  }
  if (normalized === 'to-go' || normalized === 'togo') {
    return 'To-go';
  }

  return orderType;
}

export function mapRecallPaymentMethodToFilterValue(paymentMethod: string): string {
  const normalized = paymentMethod.replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalized === 'cash') {
    return 'Cash';
  }
  if (normalized === 'card') {
    return 'Card';
  }
  if (normalized.includes('offline')) {
    return 'Offline Payment';
  }

  return 'Other Payment Types';
}
