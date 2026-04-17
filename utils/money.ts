/**
 * 解析 POS 常见货币展示（如 $12.34、$1,234.56）为数值，便于与 test-data 税率做期望对比。
 */
export function parseUsdStringToNumber(text: string): number {
  const normalized = text.replace(/\s/g, '');
  const match = normalized.match(/\$([\d,]+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`无法从文本解析金额: ${text}`);
  }
  return Number(match[1].replace(/,/g, ''));
}

export function roundMoneyToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** 比较两金额是否在允许「分」误差内相等（默认 ±3 分，兼容 POS 四舍五入与展示误差） */
export function isMoneyCloseWithinCents(
  actual: number,
  expected: number,
  maxAbsDiffCents: number = 3,
): boolean {
  return Math.abs(roundMoneyToCents(actual) - roundMoneyToCents(expected)) <= maxAbsDiffCents / 100;
}
