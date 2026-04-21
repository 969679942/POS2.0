/**
 * 【TestInventory】库存相关旧用例在 POS2.0 中的通用菜品约定。
 * 若门店菜名不同，请在此集中调整。
 */
export const inventoryStockSmokeTestData = {
  employeePassword: '11',
  regularDishName: '普通菜1',
  secondaryRegularDishName: '称重菜',
  decimalDishName: 'test',
  overOrderDishName: '规格菜',
  limitedStockQuantity: 2,
  decimalOrderQuantity: 3.44,
  overOrderQuantity: 3,
} as const;
