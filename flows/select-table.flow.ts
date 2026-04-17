import { GuestCountDialogPage } from '../pages/guest-count-dialog.page';
import { OrderDishesPage } from '../pages/order-dishes.page';
import { type SelectedTableRecord, SelectTablePage } from '../pages/select-table.page';
import { step } from '../utils/step';

export type TableSelectionResult = {
  guestCountDialogPage: GuestCountDialogPage;
  selectedTable: SelectedTableRecord;
};

export class SelectTableFlow {
  @step('业务步骤：在选桌页面选择任意空桌')
  async selectAnyAvailableTable(
    selectTablePage: SelectTablePage,
  ): Promise<TableSelectionResult> {
    await selectTablePage.expectLoaded();

    const availableTables = await selectTablePage.trySwitchAreasAndListAvailableTables();
    const selectedTable = availableTables[0];

    if (!selectedTable) {
      throw new Error('No available table found on the current selected area.');
    }

    const areaName = await selectTablePage.getCurrentAreaName();
    const tableNumber = await selectTablePage.readTableNumber(selectedTable);
    const guestCountDialogPage = await selectTablePage.clickTable(selectedTable);

    return {
      guestCountDialogPage,
      selectedTable: {
        areaName,
        tableNumber,
      },
    };
  }

  @step(
    (_selectTablePage: SelectTablePage, areaName: string, tableNumber: string) =>
      `业务步骤：在选桌页面选择区域 ${areaName} 下桌号为 ${tableNumber} 的桌台`,
  )
  async selectTableByAreaAndTableNumber(
    selectTablePage: SelectTablePage,
    areaName: string,
    tableNumber: string,
  ): Promise<TableSelectionResult> {
    await selectTablePage.expectLoaded();
    await selectTablePage.selectArea(areaName);

    const table = await selectTablePage.findTableByNumber(tableNumber);
    const guestCountDialogPage = await selectTablePage.clickTable(table);

    return {
      guestCountDialogPage,
      selectedTable: {
        areaName,
        tableNumber,
      },
    };
  }

  @step(
    (_guestCountDialogPage: GuestCountDialogPage, guestCount: number) =>
      `业务步骤：在人数弹窗中选择 ${guestCount} 位客人并进入点餐页`,
  )
  async selectGuestCountAndEnterOrderDishes(
    guestCountDialogPage: GuestCountDialogPage,
    guestCount: number,
  ): Promise<OrderDishesPage> {
    await guestCountDialogPage.expectVisible();
    const orderDishesPage = await guestCountDialogPage.selectGuestCount(guestCount);
    await orderDishesPage.expectLoaded();
    return orderDishesPage;
  }

  @step(
    (_guestCountDialogPage: GuestCountDialogPage, min: number, max: number) =>
      `业务步骤：在人数弹窗中随机选择 ${min} 至 ${max} 位客人并进入点餐页`,
  )
  async selectRandomGuestCountAndEnterOrderDishes(
    guestCountDialogPage: GuestCountDialogPage,
    min: number,
    max: number,
  ): Promise<{ orderDishesPage: OrderDishesPage; guestCount: number }> {
    const guestCount = Math.floor(Math.random() * (max - min + 1)) + min;
    const orderDishesPage = await this.selectGuestCountAndEnterOrderDishes(
      guestCountDialogPage,
      guestCount,
    );
    return { orderDishesPage, guestCount };
  }
}

export async function selectAnyAvailableTable(
  selectTablePage: SelectTablePage,
): Promise<TableSelectionResult> {
  const selectTableFlow = new SelectTableFlow();
  return await selectTableFlow.selectAnyAvailableTable(selectTablePage);
}

export async function selectTableByAreaAndTableNumber(
  selectTablePage: SelectTablePage,
  areaName: string,
  tableNumber: string,
): Promise<TableSelectionResult> {
  const selectTableFlow = new SelectTableFlow();
  return await selectTableFlow.selectTableByAreaAndTableNumber(
    selectTablePage,
    areaName,
    tableNumber,
  );
}

export async function selectGuestCountAndEnterOrderDishes(
  guestCountDialogPage: GuestCountDialogPage,
  guestCount: number,
): Promise<OrderDishesPage> {
  const selectTableFlow = new SelectTableFlow();
  return await selectTableFlow.selectGuestCountAndEnterOrderDishes(
    guestCountDialogPage,
    guestCount,
  );
}

export async function selectRandomGuestCountAndEnterOrderDishes(
  guestCountDialogPage: GuestCountDialogPage,
  min: number,
  max: number,
): Promise<{ orderDishesPage: OrderDishesPage; guestCount: number }> {
  const selectTableFlow = new SelectTableFlow();
  return await selectTableFlow.selectRandomGuestCountAndEnterOrderDishes(
    guestCountDialogPage,
    min,
    max,
  );
}
