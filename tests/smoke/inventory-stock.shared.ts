import { ensureLoggedInHomePage } from './pos-business.shared';
import { startToGoOrder } from '../../flows/takeout.flow';
import type { EmployeeLoginPage } from '../../pages/employee-login.page';
import type { HomePage } from '../../pages/home.page';
import type { InventoryPage } from '../../pages/inventory.page';
import type { LicenseSelectionPage } from '../../pages/license-selection.page';
import type { OrderDishesPage } from '../../pages/order-dishes.page';

export type PrepareInventoryScenarioOptions = {
  homePage: HomePage;
  licenseSelectionPage: LicenseSelectionPage;
  employeeLoginPage: EmployeeLoginPage;
  employeePassword: string;
};

export type PreparedInventoryScenario = {
  orderDishesPage: OrderDishesPage;
  inventoryPage: InventoryPage;
};

export async function prepareInventoryScenario(
  options: PrepareInventoryScenarioOptions,
): Promise<PreparedInventoryScenario> {
  const loggedInHomePage = await ensureLoggedInHomePage({
    homePage: options.homePage,
    licenseSelectionPage: options.licenseSelectionPage,
    employeeLoginPage: options.employeeLoginPage,
    employeePassword: options.employeePassword,
  });

  await loggedInHomePage.expectPrimaryFunctionCardsVisible();
  const orderDishesPage = await startToGoOrder(loggedInHomePage);
  const inventoryPage = await orderDishesPage.openInventoryPage();

  return {
    orderDishesPage,
    inventoryPage,
  };
}
