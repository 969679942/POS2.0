/**
 * 【To Go-购买规格菜-点单页现金付款】冒烟用例的菜品与规格文案约定。
 * 若门店菜单名称不同，请在此调整。
 */
export const takeOutSpecDishCashSmokeTestData = {
  employeePassword: '11',
  /** To Go点单页搜索关键字与结果按钮上的菜品名（通常一致） */
  specDishSearchKeyword: '规格菜',
  /** 规格菜可选规格按钮文案，与 POS 展示一致 */
  specSizeLabels: ['Small', 'Mediummmmm', 'Large'] as const,
} as const;

export type SpecDishSizeLabel = (typeof takeOutSpecDishCashSmokeTestData.specSizeLabels)[number];