/**
 * 【Dine In-购买称重菜-点单页现金付款】冒烟用例的菜品与重量约定。
 * 若门店菜单名称不同，请在此调整。
 */
export const dineInWeightedDishCashSmokeTestData = {
  employeePassword: '11',
  /** 点单页搜索关键字与结果按钮上的菜品名（通常一致） */
  weightedDishSearchKeyword: '称重菜',
  /** 取整数重量，降低输入与价格计算抖动 */
  minWeight: 1,
  maxWeight: 9,
} as const;
