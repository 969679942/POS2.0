/**
 * 【To Go-购买固定套餐-点单页现金付款】冒烟用例的固定套餐约定。
 * 若门店菜单名称不同，请在此调整。
 */
export const takeOutFixedComboDishCashSmokeTestData = {
  employeePassword: '11',
  /** To Go 点单页搜索关键字与结果按钮上的固定套餐名（通常一致） */
  fixedComboDishSearchKeyword: '固定套餐',
  /**
   * 固定套餐默认不主动指定分组，优先验证产品默认组合；
   * 若当前门店仍要求选择必选项，则由页面对象中的自动补齐逻辑兜底。
   */
  comboSelections: {},
} as const;
