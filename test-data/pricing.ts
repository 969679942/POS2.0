/**
 * 金额相关断言与期望计算用的环境约定（税率、加收等）。
 * 与真实 POS/门店不一致时在此维护；若需多套 POS，可再拆为 profile 文件并由 fixture 选择。
 *
 * 百分比字段可与 POS 一致保留小数（建议至多 3 位），例如 3.375 表示 3.375%。
 */
/** 百分比与 POS 对齐时建议的小数位数 */
export const PRICING_PERCENT_DECIMAL_PLACES = 3;

export const pricingTestData = {
  /** 销售税率：百分比数值；3 为 3%，3.375 为 3.375% */
  salesTaxRatePercent: 3,
  /** 信用卡加收：百分比数值；4 为 4%，亦可写 4.125 等 */
  creditCardSurchargeRatePercent: 4,
} satisfies {
  salesTaxRatePercent: number;
  creditCardSurchargeRatePercent: number;
};

/** 小数形式税率（percent / 100），便于与税前金额相乘 */
export const salesTaxRateDecimal = pricingTestData.salesTaxRatePercent / 100;

/** 小数形式信用卡加收率（percent / 100） */
export const creditCardSurchargeRateDecimal =
  pricingTestData.creditCardSurchargeRatePercent / 100;
