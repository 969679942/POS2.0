/**
 * 【To Go-购买套餐菜-点单页现金付款】冒烟用例的套餐菜与分组选项约定。
 * 若门店菜单名称不同，请在此调整。
 */
export const takeOutComboDishCashSmokeTestData = {
  employeePassword: '11',
  /** To Go 点单页搜索关键字与结果按钮上的套餐名（通常一致） */
  comboDishSearchKeyword: '普通套餐',
  /** 套餐分组与子项，与堂食冒烟共用稳定组合 */
  comboSelections: {
    common: {
      普通菜1: 1,
      普通菜2: 2,
    },
  },
} as const;
